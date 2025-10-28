/**
 * Built-in instrumentation for components, mailboxes, and transports
 *
 * Provides automatic telemetry collection for ServiceJS components.
 */

import type { ObservabilityCapability } from './capability.js';
import { withComponentInstrumentation, type Component } from './interception.js';

// ============================================================================
// Component Auto-Instrumentation
// ============================================================================

/**
 * Configuration for component auto-instrumentation
 */
export interface ComponentInstrumentationConfig {
  /** Service name */
  serviceName: string;

  /** Service version (optional) */
  serviceVersion?: string;

  /** Should automatically instrument all messages (default: true) */
  autoInstrument?: boolean;

  /** Should emit metrics (default: true) */
  emitMetrics?: boolean;
}

/**
 * Wrap a component with automatic observability
 *
 * This is a convenience wrapper around withComponentInstrumentation that
 * provides sensible defaults for common use cases.
 *
 * @example
 * ```typescript
 * const obs = createInMemoryObservability();
 *
 * const component = {
 *   send: (msg) => console.log('Processing:', msg),
 *   getState: () => ({ count: 0 }),
 * };
 *
 * const instrumented = instrumentComponent(component, obs, {
 *   serviceName: 'user-service',
 *   serviceVersion: '1.0.0',
 * });
 *
 * // All messages through instrumented component are automatically traced
 * instrumented.send({ type: 'createUser', data: { name: 'Alice' } });
 * ```
 */
export const instrumentComponent = <TState, TMsg extends Record<string, unknown>>(
  component: Component<TState, TMsg>,
  observability: ObservabilityCapability,
  config: ComponentInstrumentationConfig
): Component<TState, TMsg> => {
  const {
    serviceName,
    serviceVersion,
    autoInstrument = true,
    emitMetrics = true,
  } = config;

  return withComponentInstrumentation(component, observability, {
    serviceName,
    ...(serviceVersion !== undefined ? { serviceVersion } : {}),
    autoInstrument,
    emitMetrics: autoInstrument ? emitMetrics : false,
  });
};

// ============================================================================
// Mailbox Instrumentation
// ============================================================================

/**
 * Mailbox metrics collector
 *
 * Collects metrics about mailbox operations (queue depth, latency, etc.)
 */
export interface MailboxMetrics {
  /** Record message enqueued */
  enqueued(messageType?: string): void;

  /** Record message dequeued */
  dequeued(messageType?: string, queueTimeMs?: number): void;

  /** Record message processed */
  processed(messageType?: string, processingTimeMs?: number): void;

  /** Record message failed */
  failed(messageType?: string, error?: Error): void;

  /** Update queue depth gauge */
  updateQueueDepth(depth: number): void;

  /** Update queue capacity gauge */
  updateCapacity(capacity: number): void;
}

/**
 * Create mailbox metrics collector
 *
 * @example
 * ```typescript
 * const obs = createInMemoryObservability();
 * const metrics = createMailboxMetrics(obs, 'user-mailbox');
 *
 * // In your mailbox implementation:
 * mailbox.enqueue = (msg) => {
 *   metrics.enqueued(msg.type);
 *   metrics.updateQueueDepth(queue.length);
 *   // ... enqueue logic
 * };
 *
 * mailbox.dequeue = () => {
 *   const msg = queue.shift();
 *   metrics.dequeued(msg.type, Date.now() - msg.enqueuedAt);
 *   metrics.updateQueueDepth(queue.length);
 *   return msg;
 * };
 * ```
 */
export const createMailboxMetrics = (
  observability: ObservabilityCapability,
  mailboxName: string
): MailboxMetrics => {
  const labels = (messageType?: string) => ({
    mailbox: mailboxName,
    ...(messageType ? { message_type: messageType } : {}),
  });

  return {
    enqueued: (messageType?: string) => {
      observability.counter(
        'mailbox.messages.enqueued',
        1,
        labels(messageType)
      );
    },

    dequeued: (messageType?: string, queueTimeMs?: number) => {
      observability.counter(
        'mailbox.messages.dequeued',
        1,
        labels(messageType)
      );

      if (queueTimeMs !== undefined) {
        observability.histogram(
          'mailbox.queue.time',
          queueTimeMs,
          labels(messageType)
        );
      }
    },

    processed: (messageType?: string, processingTimeMs?: number) => {
      observability.counter(
        'mailbox.messages.processed',
        1,
        labels(messageType)
      );

      if (processingTimeMs !== undefined) {
        observability.histogram(
          'mailbox.processing.time',
          processingTimeMs,
          labels(messageType)
        );
      }
    },

    failed: (messageType?: string, error?: Error) => {
      observability.counter(
        'mailbox.messages.failed',
        1,
        labels(messageType)
      );

      if (error) {
        observability.log('error', `Mailbox processing failed: ${error.message}`, {
          mailbox: mailboxName,
          messageType,
          error: error.message,
          stack: error.stack,
        });
      }
    },

    updateQueueDepth: (depth: number) => {
      observability.gauge('mailbox.queue.depth', depth, {
        mailbox: mailboxName,
      });
    },

    updateCapacity: (capacity: number) => {
      observability.gauge('mailbox.queue.capacity', capacity, {
        mailbox: mailboxName,
      });
    },
  };
};

// ============================================================================
// Transport Instrumentation
// ============================================================================

/**
 * Transport metrics collector
 *
 * Collects metrics about transport operations (sends, receives, errors, etc.)
 */
export interface TransportMetrics {
  /** Record message sent */
  sent(messageType?: string, sizeBytes?: number): void;

  /** Record message received */
  received(messageType?: string, sizeBytes?: number): void;

  /** Record serialization time */
  serialized(durationMs: number, sizeBytes?: number): void;

  /** Record deserialization time */
  deserialized(durationMs: number, sizeBytes?: number): void;

  /** Record transport error */
  error(errorType: string, message?: string): void;

  /** Record connection state change */
  connectionState(state: 'connected' | 'disconnected' | 'connecting' | 'error'): void;
}

/**
 * Create transport metrics collector
 *
 * @example
 * ```typescript
 * const obs = createInMemoryObservability();
 * const metrics = createTransportMetrics(obs, 'websocket-transport');
 *
 * // In your transport implementation:
 * transport.send = async (msg) => {
 *   const start = Date.now();
 *   const serialized = JSON.stringify(msg);
 *   metrics.serialized(Date.now() - start, serialized.length);
 *   metrics.sent(msg.type, serialized.length);
 *   // ... send logic
 * };
 * ```
 */
export const createTransportMetrics = (
  observability: ObservabilityCapability,
  transportName: string
): TransportMetrics => {
  const labels = (messageType?: string) => ({
    transport: transportName,
    ...(messageType ? { message_type: messageType } : {}),
  });

  return {
    sent: (messageType?: string, sizeBytes?: number) => {
      observability.counter(
        'transport.messages.sent',
        1,
        labels(messageType)
      );

      if (sizeBytes !== undefined) {
        observability.histogram(
          'transport.message.size.bytes',
          sizeBytes,
          labels(messageType)
        );
      }
    },

    received: (messageType?: string, sizeBytes?: number) => {
      observability.counter(
        'transport.messages.received',
        1,
        labels(messageType)
      );

      if (sizeBytes !== undefined) {
        observability.histogram(
          'transport.message.size.bytes',
          sizeBytes,
          labels(messageType)
        );
      }
    },

    serialized: (durationMs: number, sizeBytes?: number) => {
      observability.histogram(
        'transport.serialization.duration',
        durationMs,
        { transport: transportName }
      );

      if (sizeBytes !== undefined) {
        observability.histogram(
          'transport.serialization.size.bytes',
          sizeBytes,
          { transport: transportName }
        );
      }
    },

    deserialized: (durationMs: number, sizeBytes?: number) => {
      observability.histogram(
        'transport.deserialization.duration',
        durationMs,
        { transport: transportName }
      );

      if (sizeBytes !== undefined) {
        observability.histogram(
          'transport.deserialization.size.bytes',
          sizeBytes,
          { transport: transportName }
        );
      }
    },

    error: (errorType: string, message?: string) => {
      observability.counter(
        'transport.errors',
        1,
        {
          transport: transportName,
          error_type: errorType,
        }
      );

      if (message) {
        observability.log('error', `Transport error: ${message}`, {
          transport: transportName,
          errorType,
        });
      }
    },

    connectionState: (state: 'connected' | 'disconnected' | 'connecting' | 'error') => {
      observability.gauge(
        'transport.connection.state',
        state === 'connected' ? 1 : 0,
        {
          transport: transportName,
          state,
        }
      );

      observability.log('info', `Transport connection state: ${state}`, {
        transport: transportName,
        state,
      });
    },
  };
};

// ============================================================================
// Instrumentation Helpers
// ============================================================================

/**
 * Create a function wrapper that automatically records metrics
 *
 * @example
 * ```typescript
 * const obs = createInMemoryObservability();
 *
 * const processOrder = instrumentFunction(
 *   obs,
 *   'processOrder',
 *   (orderId: string) => {
 *     // ... processing logic
 *     return { success: true };
 *   }
 * );
 *
 * // Automatically records:
 * // - Counter: function.calls
 * // - Histogram: function.duration
 * // - Counter: function.errors (on failure)
 * const result = processOrder('order-123');
 * ```
 */
export const instrumentFunction = <TArgs extends unknown[], TResult>(
  observability: ObservabilityCapability,
  functionName: string,
  fn: (...args: TArgs) => TResult | Promise<TResult>
): ((...args: TArgs) => Promise<TResult>) => {
  return async (...args: TArgs): Promise<TResult> => {
    const start = Date.now();

    observability.counter('function.calls', 1, { function: functionName });

    try {
      const result = await fn(...args);

      const duration = Date.now() - start;
      observability.histogram('function.duration', duration, {
        function: functionName,
      });

      observability.counter('function.success', 1, { function: functionName });

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      observability.histogram('function.duration', duration, {
        function: functionName,
        status: 'error',
      });

      observability.counter('function.errors', 1, { function: functionName });

      observability.log('error', `Function ${functionName} failed`, {
        function: functionName,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  };
};
