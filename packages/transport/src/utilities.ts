/**
 * Transport Utilities
 *
 * Helper functions for transport management including routing, retry logic, and timeouts.
 */

import type { URN } from '@servicejs/core';
import type { Result } from '@servicejs/result';
import { ok, err, isErr } from '@servicejs/result';
import type { Transport, MessageEnvelope, TransportError } from './transport.js';

/**
 * Transport router configuration
 */
export interface TransportRouterConfig {
  /**
   * Default transport to use when no route matches
   */
  readonly defaultTransport?: Transport;

  /**
   * Handler called when no route is found and no default transport is set
   */
  readonly onUnroutable?: (envelope: MessageEnvelope) => void;
}

/**
 * Transport router
 *
 * Routes messages to appropriate transports based on destination URN or custom rules.
 *
 * @example
 * ```typescript
 * const router = createTransportRouter({ defaultTransport: localTransport });
 *
 * // Route by URN prefix
 * router.addRoute((envelope) => envelope.to.startsWith('urn:remote:'), remoteTransport);
 *
 * // Route by exact URN
 * router.addRoute((envelope) => envelope.to === 'urn:service:worker', workerTransport);
 *
 * // Send will automatically route
 * await router.send(envelope);
 * ```
 */
export interface TransportRouter {
  /**
   * Add a routing rule
   *
   * @param predicate - Function that returns true if this transport should handle the message
   * @param transport - Transport to use for matching messages
   */
  addRoute(predicate: (envelope: MessageEnvelope) => boolean, transport: Transport): void;

  /**
   * Remove a routing rule
   *
   * @param predicate - The predicate to remove
   */
  removeRoute(predicate: (envelope: MessageEnvelope) => boolean): void;

  /**
   * Send a message through the appropriate transport
   *
   * @param envelope - Message envelope to send
   * @returns Result indicating success or failure
   */
  send(envelope: MessageEnvelope): Promise<Result<void, TransportError>>;

  /**
   * Get the transport that would handle this envelope
   *
   * @param envelope - Message envelope to route
   * @returns The transport that would handle this envelope, or undefined if no route matches
   */
  getTransport(envelope: MessageEnvelope): Transport | undefined;
}

/**
 * Create a transport router
 *
 * @param config - Router configuration
 * @returns A new transport router
 */
export const createTransportRouter = (
  config: TransportRouterConfig = {}
): TransportRouter => {
  const routes: Array<{ predicate: (envelope: MessageEnvelope) => boolean; transport: Transport }> =
    [];

  return {
    addRoute(predicate, transport) {
      routes.push({ predicate, transport });
    },

    removeRoute(predicate) {
      const index = routes.findIndex((r) => r.predicate === predicate);
      if (index !== -1) {
        routes.splice(index, 1);
      }
    },

    async send(envelope) {
      const transport = this.getTransport(envelope);

      if (!transport) {
        config.onUnroutable?.(envelope);
        return err({
          type: 'SEND_FAILED',
          urn: envelope.to,
          error: new Error(`No route found for URN: ${envelope.to}`),
        });
      }

      return transport.send(envelope);
    },

    getTransport(envelope) {
      // Check routes in order
      for (const route of routes) {
        if (route.predicate(envelope)) {
          return route.transport;
        }
      }

      // Fall back to default transport
      return config.defaultTransport;
    },
  };
};

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  /**
   * Maximum number of retry attempts
   */
  readonly maxAttempts: number;

  /**
   * Initial delay in milliseconds
   */
  readonly initialDelay: number;

  /**
   * Maximum delay in milliseconds
   */
  readonly maxDelay: number;

  /**
   * Backoff multiplier (e.g., 2 for exponential backoff)
   */
  readonly backoffMultiplier: number;

  /**
   * Jitter factor (0-1) to add randomness to delays
   */
  readonly jitter?: number;

  /**
   * Predicate to determine if an error should trigger a retry
   * Returns true if the error is retryable
   */
  readonly shouldRetry?: (error: TransportError) => boolean;

  /**
   * Handler called before each retry attempt
   */
  readonly onRetry?: (attempt: number, error: TransportError, delay: number) => void;
}

/**
 * Default retry policy
 */
export const defaultRetryPolicy: RetryPolicy = {
  maxAttempts: 3,
  initialDelay: 100,
  maxDelay: 5000,
  backoffMultiplier: 2,
  jitter: 0.1,
  shouldRetry: (error) => {
    // Retry on connection errors, but not on serialization errors
    return (
      error.type === 'CONNECTION_FAILED' ||
      error.type === 'CONNECTION_CLOSED' ||
      error.type === 'SEND_FAILED'
    );
  },
};

/**
 * Calculate delay with exponential backoff and jitter
 */
const calculateDelay = (attempt: number, policy: RetryPolicy): number => {
  const exponentialDelay = Math.min(
    policy.initialDelay * Math.pow(policy.backoffMultiplier, attempt),
    policy.maxDelay
  );

  if (!policy.jitter) {
    return exponentialDelay;
  }

  // Add random jitter: delay * (1 ± jitter)
  const jitterAmount = exponentialDelay * policy.jitter;
  const jitter = Math.random() * jitterAmount * 2 - jitterAmount;
  return Math.max(0, exponentialDelay + jitter);
};

/**
 * Wrap a transport with retry logic
 *
 * @param transport - Transport to wrap
 * @param policy - Retry policy configuration
 * @returns A transport that automatically retries failed sends
 *
 * @example
 * ```typescript
 * const reliableTransport = withRetry(networkTransport, {
 *   maxAttempts: 3,
 *   initialDelay: 100,
 *   maxDelay: 5000,
 *   backoffMultiplier: 2,
 *   jitter: 0.1,
 *   onRetry: (attempt, error, delay) => {
 *     console.log(`Retry attempt ${attempt} after ${delay}ms:`, error);
 *   }
 * });
 * ```
 */
export const withRetry = (transport: Transport, policy: RetryPolicy = defaultRetryPolicy): Transport => {
  const shouldRetry = policy.shouldRetry ?? defaultRetryPolicy.shouldRetry!;

  return {
    ...transport,

    async send(envelope) {
      let lastError: TransportError | undefined;

      for (let attempt = 0; attempt < policy.maxAttempts; attempt++) {
        const result = await transport.send(envelope);

        if (!isErr(result)) {
          return result;
        }

        lastError = result.error;

        // Check if we should retry this error
        if (!shouldRetry(lastError)) {
          return result;
        }

        // Don't delay after the last attempt
        if (attempt < policy.maxAttempts - 1) {
          const delay = calculateDelay(attempt, policy);
          policy.onRetry?.(attempt + 1, lastError, delay);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      // All retries exhausted
      return err(lastError!);
    },
  };
};

/**
 * Timeout configuration
 */
export interface TimeoutConfig {
  /**
   * Timeout duration in milliseconds
   */
  readonly timeout: number;

  /**
   * Handler called when a timeout occurs
   */
  readonly onTimeout?: (envelope: MessageEnvelope) => void;
}

/**
 * Wrap a transport with timeout logic
 *
 * @param transport - Transport to wrap
 * @param config - Timeout configuration
 * @returns A transport that times out send operations
 *
 * @example
 * ```typescript
 * const timeoutTransport = withTimeout(networkTransport, {
 *   timeout: 5000, // 5 seconds
 *   onTimeout: (envelope) => {
 *     console.log(`Send timeout for message to ${envelope.to}`);
 *   }
 * });
 * ```
 */
export const withTimeout = (transport: Transport, config: TimeoutConfig): Transport => {
  return {
    ...transport,

    async send(envelope) {
      const timeoutPromise = new Promise<Result<void, TransportError>>((resolve) => {
        setTimeout(() => {
          config.onTimeout?.(envelope);
          resolve(
            err({
              type: 'SEND_FAILED',
              urn: envelope.to,
              error: new Error(`Send timeout after ${config.timeout}ms`),
            })
          );
        }, config.timeout);
      });

      const sendPromise = transport.send(envelope);

      // Race between send and timeout
      return Promise.race([sendPromise, timeoutPromise]);
    },
  };
};

/**
 * Combine retry and timeout
 *
 * @param transport - Transport to wrap
 * @param retryPolicy - Retry policy
 * @param timeoutConfig - Timeout configuration
 * @returns A transport with both retry and timeout logic
 *
 * @example
 * ```typescript
 * const reliableTransport = withRetryAndTimeout(networkTransport, {
 *   maxAttempts: 3,
 *   initialDelay: 100,
 *   maxDelay: 5000,
 *   backoffMultiplier: 2
 * }, {
 *   timeout: 5000
 * });
 * ```
 */
export const withRetryAndTimeout = (
  transport: Transport,
  retryPolicy: RetryPolicy = defaultRetryPolicy,
  timeoutConfig: TimeoutConfig
): Transport => {
  // Apply timeout first, then retry (so timeouts can be retried)
  const withTimeoutTransport = withTimeout(transport, timeoutConfig);
  return withRetry(withTimeoutTransport, retryPolicy);
};

/**
 * Create a transport that routes by URN prefix
 *
 * @param routes - Map of URN prefix to transport
 * @param defaultTransport - Optional default transport
 * @returns A transport router
 *
 * @example
 * ```typescript
 * const router = createPrefixRouter({
 *   'urn:local:': localTransport,
 *   'urn:remote:': networkTransport,
 *   'urn:worker:': workerTransport
 * }, localTransport);
 * ```
 */
export const createPrefixRouter = (
  routes: Record<string, Transport>,
  defaultTransport?: Transport
): TransportRouter => {
  const router = createTransportRouter({ defaultTransport });

  for (const [prefix, transport] of Object.entries(routes)) {
    router.addRoute((envelope) => envelope.to.toString().startsWith(prefix), transport);
  }

  return router;
};
