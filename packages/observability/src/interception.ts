/**
 * Message interception for automatic observability
 */

import type { ObservabilityCapability } from './capability.js';
import type { TraceContext } from './types.js';
import { injectTraceContext, extractTraceContext } from './context.js';
import { generateSpanId, generateTraceId } from './ids.js';

// ============================================================================
// Capability Wrapper
// ============================================================================

/**
 * Capability interface (minimal)
 */
export interface Capability<T> {
  send(message: T): void;
}

/**
 * Options for message observability wrapper
 */
export interface MessageObservabilityOptions {
  /** Operation name for spans */
  operation?: string;

  /** Extract operation name from message */
  getOperation?: (message: unknown) => string;

  /** Should emit metrics */
  emitMetrics?: boolean;

  /** Should create spans */
  createSpans?: boolean;

  /** Should log errors */
  logErrors?: boolean;

  /** Should propagate trace context */
  propagateContext?: boolean;
}

/**
 * Wrap a capability with automatic observability
 * Intercepts messages and emits observability events
 */
export const withMessageObservability = <T extends Record<string, unknown>>(
  capability: Capability<T>,
  observability: ObservabilityCapability,
  options: MessageObservabilityOptions = {}
): Capability<T> => {
  const {
    operation = 'message.send',
    getOperation = (msg: unknown) => {
      if (typeof msg === 'object' && msg !== null && 'type' in msg) {
        return `message.${(msg as { type: unknown }).type}`;
      }
      return operation;
    },
    emitMetrics = true,
    createSpans = true,
    logErrors = true,
    propagateContext = true,
  } = options;

  return {
    send: (message: T) => {
      const opName = getOperation(message);

      // Extract existing trace context from message
      const existingContext = propagateContext ? extractTraceContext(message) : undefined;

      // Get or create trace context
      const currentContext = existingContext || observability.getCurrentContext();

      const processMessage = (_spanId: string, traceContext: TraceContext) => {
        const startTime = Date.now();

        try {
          // Inject trace context into message if enabled
          const messageToSend = propagateContext
            ? injectTraceContext(message, traceContext)
            : message;

          // Emit metric: message sent
          if (emitMetrics) {
            observability.counter(`${opName}.count`, 1);
          }

          // Send the message
          capability.send(messageToSend);

          // Emit metric: message latency
          if (emitMetrics) {
            const duration = Date.now() - startTime;
            observability.histogram(`${opName}.duration`, duration);
          }
        } catch (error) {
          // Log error
          if (logErrors) {
            observability.error(`Error sending message: ${opName}`, {
              error: error instanceof Error ? error.message : String(error),
              message,
            });
          }

          // Emit metric: error
          if (emitMetrics) {
            observability.counter(`${opName}.error`, 1);
          }

          throw error;
        }
      };

      if (createSpans) {
        // If there's a current context, set it before creating span
        if (currentContext) {
          observability.setCurrentContext(currentContext);
        }

        // Create span for message send
        const messageType = typeof message === 'object' && message !== null && 'type' in message
          ? (message as Record<string, unknown>)['type']
          : undefined;
        observability.withSpan(opName, processMessage, {
          ...(messageType !== undefined ? { 'message.type': messageType } : {}),
        });
      } else {
        // No span, just process
        const spanId = currentContext?.spanId || generateSpanId();
        const traceId = currentContext?.traceId || generateTraceId();
        const traceContext = currentContext || {
          traceId,
          spanId,
        };
        processMessage(spanId, traceContext);
      }
    },
  };
};

// ============================================================================
// Component Instrumentation
// ============================================================================

/**
 * Component interface (minimal)
 */
export interface Component<TState, TMsg> {
  send(message: TMsg): void;
  getState(): TState;
}

/**
 * Options for component instrumentation
 */
export interface ComponentInstrumentationOptions {
  /** Service name for resource attributes */
  serviceName: string;

  /** Service version */
  serviceVersion?: string;

  /** Should auto-instrument message processing */
  autoInstrument?: boolean;

  /** Should emit metrics */
  emitMetrics?: boolean;
}

/**
 * Wrap a component with automatic instrumentation
 * Creates spans for each message processed
 */
export const withComponentInstrumentation = <TState, TMsg extends Record<string, unknown>>(
  component: Component<TState, TMsg>,
  observability: ObservabilityCapability,
  options: ComponentInstrumentationOptions
): Component<TState, TMsg> => {
  const {
    serviceName,
    serviceVersion,
    autoInstrument = true,
    emitMetrics = true,
  } = options;

  if (!autoInstrument) {
    return component;
  }

  const instrumented: Component<TState, TMsg> = {
    send: (message: TMsg) => {
      const messageType = typeof message === 'object' && message !== null && 'type' in message
        ? (message as Record<string, unknown>)['type']
        : undefined;
      const operation = messageType !== undefined
        ? `component.${String(messageType)}`
        : 'component.message';

      observability.withSpan(
        operation,
        () => {
          const startTime = Date.now();

          try {
            // Send message to component
            component.send(message);

            // Emit metrics
            if (emitMetrics) {
              observability.counter('component.messages.processed', 1, {
                service: serviceName,
                message_type: messageType !== undefined ? String(messageType) : 'unknown',
              });

              const duration = Date.now() - startTime;
              observability.histogram('component.message.duration', duration, {
                service: serviceName,
              });
            }
          } catch (error) {
            // Emit error metric
            if (emitMetrics) {
              observability.counter('component.messages.error', 1, {
                service: serviceName,
              });
            }

            throw error;
          }
        },
        {
          'service.name': serviceName,
          ...(serviceVersion ? { 'service.version': serviceVersion } : {}),
          ...(messageType !== undefined ? { 'message.type': messageType } : {}),
        }
      );
    },
    getState: () => component.getState(),
  };

  return instrumented;
};

// ============================================================================
// Automatic Span Creation
// ============================================================================

/**
 * Automatically create child span when function is called
 */
export const traced = <TArgs extends unknown[], TReturn>(
  observability: ObservabilityCapability,
  operation: string,
  fn: (...args: TArgs) => TReturn,
  getAttributes?: (...args: TArgs) => Record<string, unknown>
): (...args: TArgs) => TReturn => {
  return (...args: TArgs): TReturn => {
    const attributes = getAttributes ? getAttributes(...args) : undefined;
    return observability.withSpan(operation, () => fn(...args), attributes);
  };
};

/**
 * Decorator for automatic span creation (experimental)
 */
export const Traced = (operation?: string) => {
  return (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) => {
    const originalMethod = descriptor.value;
    const opName = operation || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (this: any, ...args: any[]) {
      const observability = this.observability as ObservabilityCapability;
      if (!observability) {
        // No observability, just call method
        return originalMethod.apply(this, args);
      }

      return observability.withSpan(opName, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
};
