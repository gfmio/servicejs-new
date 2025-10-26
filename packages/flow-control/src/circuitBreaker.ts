/**
 * @servicejs/flow-control - Circuit Breaker
 *
 * Implements the circuit breaker pattern for resilient message passing.
 */

import type { Capability, Message } from '@servicejs/core';
import { ok, err, type Result } from '@servicejs/result';

/**
 * Circuit breaker states.
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Circuit breaker error types.
 */
export type CircuitBreakerError =
  | { type: 'CIRCUIT_OPEN'; message: string }
  | { type: 'SEND_FAILED'; error: unknown };

/**
 * Circuit breaker configuration.
 */
export interface CircuitBreakerConfig {
  /**
   * Number of failures before opening the circuit.
   * Default: 5
   */
  failureThreshold?: number;

  /**
   * Time in milliseconds before transitioning from open to half-open.
   * Default: 60000 (1 minute)
   */
  resetTimeout?: number;

  /**
   * Optional callback when circuit state changes.
   */
  onStateChange?: (oldState: CircuitState, newState: CircuitState) => void;
}

/**
 * Circuit breaker capability wrapper.
 */
export interface CircuitBreakerCapability<TMsg extends Message> {
  /**
   * Send a message through the circuit breaker.
   * Returns an error if the circuit is open.
   *
   * @param message - The message to send
   * @returns Result indicating success or circuit breaker error
   */
  send(message: TMsg): Result<void, CircuitBreakerError>;

  /**
   * Get the current circuit state.
   *
   * @returns The current state
   */
  getState(): CircuitState;

  /**
   * Get the current failure count.
   *
   * @returns The number of consecutive failures
   */
  getFailureCount(): number;

  /**
   * Manually reset the circuit breaker.
   */
  reset(): void;
}

/**
 * Create a circuit breaker wrapper for a capability.
 *
 * The circuit breaker tracks failures and opens the circuit when
 * the failure threshold is reached. While open, all sends fail fast.
 * After the reset timeout, the circuit transitions to half-open to test recovery.
 *
 * @typeParam TMsg - The message type
 * @param capability - The underlying capability to wrap
 * @param shouldFail - Function to determine if a send failed (optional)
 * @param config - Circuit breaker configuration
 * @returns A circuit breaker capability
 *
 * @example
 * ```typescript
 * const breaker = createCircuitBreaker(
 *   unreliableCapability,
 *   undefined, // Use default failure detection
 *   {
 *     failureThreshold: 3,
 *     resetTimeout: 30000,
 *     onStateChange: (old, new) => console.log(`Circuit: ${old} -> ${new}`)
 *   }
 * );
 *
 * const result = breaker.send({ type: 'request' });
 * if (result.isErr()) {
 *   console.log('Circuit is open, failing fast');
 * }
 * ```
 */
export function createCircuitBreaker<TMsg extends Message>(
  capability: Capability<TMsg>,
  shouldFail?: (message: TMsg) => boolean,
  config: CircuitBreakerConfig = {}
): CircuitBreakerCapability<TMsg> {
  const {
    failureThreshold = 5,
    resetTimeout = 60000,
    onStateChange,
  } = config;

  let state: CircuitState = 'closed';
  let failureCount = 0;
  let resetTimer: ReturnType<typeof setTimeout> | null = null;

  const setState = (newState: CircuitState): void => {
    if (state !== newState) {
      const oldState = state;
      state = newState;
      onStateChange?.(oldState, newState);
    }
  };

  const recordSuccess = (): void => {
    failureCount = 0;
    if (state === 'half-open') {
      setState('closed');
    }
  };

  const recordFailure = (): void => {
    failureCount++;

    if (state === 'half-open') {
      // Failure in half-open state reopens the circuit
      setState('open');
      scheduleReset();
    } else if (failureCount >= failureThreshold) {
      // Too many failures, open the circuit
      setState('open');
      scheduleReset();
    }
  };

  const scheduleReset = (): void => {
    if (resetTimer) {
      clearTimeout(resetTimer);
    }

    resetTimer = setTimeout(() => {
      setState('half-open');
      failureCount = 0;
    }, resetTimeout);
  };

  return {
    send(message: TMsg): Result<void, CircuitBreakerError> {
      // Fail fast when circuit is open
      if (state === 'open') {
        return err({
          type: 'CIRCUIT_OPEN',
          message: `Circuit breaker is open (${failureCount} failures)`,
        });
      }

      try {
        // Attempt to send the message
        capability.send(message);

        // Check if send should be considered a failure
        if (shouldFail?.(message)) {
          recordFailure();
          return err({
            type: 'SEND_FAILED',
            error: new Error('Send marked as failed by shouldFail predicate'),
          });
        }

        // Success
        recordSuccess();
        return ok(undefined);
      } catch (error) {
        // Exception during send
        recordFailure();
        return err({
          type: 'SEND_FAILED',
          error,
        });
      }
    },

    getState(): CircuitState {
      return state;
    },

    getFailureCount(): number {
      return failureCount;
    },

    reset(): void {
      failureCount = 0;
      setState('closed');
      if (resetTimer) {
        clearTimeout(resetTimer);
        resetTimer = null;
      }
    },
  };
}
