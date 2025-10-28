/**
 * Observability capability interface and implementations
 */

import type {
  ObservabilityEvent,
  LogLevel,
  ResourceAttributes,
  TraceContext,
} from './types.js';
import { generateTraceId, generateSpanId } from './ids.js';

// ============================================================================
// Observability Capability Interface
// ============================================================================

/**
 * Observability capability - emit observability events
 */
export interface ObservabilityCapability {
  /**
   * Emit an observability event
   */
  emit(event: ObservabilityEvent): void;

  /**
   * Execute function within a span
   * Automatically creates span start/end events
   */
  withSpan<T>(
    operation: string,
    fn: (spanId: string, traceContext: TraceContext) => T,
    attributes?: Record<string, unknown>
  ): T;

  /**
   * Record a counter metric
   */
  counter(name: string, value: number, labels?: Record<string, string>): void;

  /**
   * Record a gauge metric
   */
  gauge(name: string, value: number, labels?: Record<string, string>): void;

  /**
   * Record a histogram metric
   */
  histogram(name: string, value: number, labels?: Record<string, string>): void;

  /**
   * Log a message
   */
  log(level: LogLevel, message: string, context?: Record<string, unknown>): void;

  /**
   * Log helpers
   */
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;

  /**
   * Get current trace context (if any)
   */
  getCurrentContext(): TraceContext | undefined;

  /**
   * Set trace context for current execution
   */
  setCurrentContext(context: TraceContext | undefined): void;
}

// ============================================================================
// In-Memory Observability (for testing)
// ============================================================================

export interface InMemoryObservabilityOptions {
  resource?: ResourceAttributes;
}

/**
 * In-memory observability capability
 * Stores all events in memory for testing and debugging
 */
export const createInMemoryObservability = (
  options: InMemoryObservabilityOptions = {}
): ObservabilityCapability & {
  getEvents(): ObservabilityEvent[];
  clear(): void;
} => {
  const events: ObservabilityEvent[] = [];
  const { resource } = options;
  let currentContext: TraceContext | undefined;

  const emit = (event: ObservabilityEvent): void => {
    // Add resource attributes if available
    const eventWithResource = resource && 'resource' in event
      ? { ...event, resource: { ...resource, ...(event.resource || {}) } }
      : resource
      ? { ...event, resource }
      : event;
    events.push(eventWithResource);
  };

  const withSpan = <T>(
    operation: string,
    fn: (spanId: string, traceContext: TraceContext) => T,
    attributes?: Record<string, unknown>
  ): T => {
    const traceId = currentContext?.traceId ?? generateTraceId();
    const spanId = generateSpanId();
    const parentSpanId = currentContext?.spanId;

    const traceContext: TraceContext = {
      traceId,
      spanId,
      ...(parentSpanId ? { parentSpanId } : {}),
      ...(currentContext?.baggage ? { baggage: currentContext.baggage } : {}),
    };

    const startTime = Date.now();

    emit({
      type: 'span.start',
      spanId,
      traceId,
      operation,
      timestamp: startTime,
      ...(parentSpanId ? { parentSpanId } : {}),
      ...(attributes ? { attributes } : {}),
      ...(resource ? { resource } : {}),
    } as ObservabilityEvent);

    // Set current context
    const previousContext = currentContext;
    currentContext = traceContext;

    try {
      const result = fn(spanId, traceContext);

      const endTime = Date.now();
      emit({
        type: 'span.end',
        spanId,
        duration: endTime - startTime,
        status: 'ok',
        timestamp: endTime,
      });

      return result;
    } catch (error) {
      const endTime = Date.now();
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorType = error instanceof Error ? error.constructor.name : 'Error';

      emit({
        type: 'span.end',
        spanId,
        duration: endTime - startTime,
        status: 'error',
        timestamp: endTime,
        error: {
          message: errorMessage,
          type: errorType,
          ...(errorStack ? { stack: errorStack } : {}),
        },
      } as ObservabilityEvent);

      throw error;
    } finally {
      // Restore previous context
      currentContext = previousContext;
    }
  };

  const counter = (name: string, value: number, labels?: Record<string, string>): void => {
    emit({
      type: 'metric',
      kind: 'counter',
      name,
      value,
      timestamp: Date.now(),
      ...(labels ? { labels } : {}),
      ...(currentContext?.spanId ? { spanId: currentContext.spanId } : {}),
      ...(currentContext?.traceId ? { traceId: currentContext.traceId } : {}),
      ...(resource ? { resource } : {}),
    } as ObservabilityEvent);
  };

  const gauge = (name: string, value: number, labels?: Record<string, string>): void => {
    emit({
      type: 'metric',
      kind: 'gauge',
      name,
      value,
      timestamp: Date.now(),
      ...(labels ? { labels } : {}),
      ...(currentContext?.spanId ? { spanId: currentContext.spanId } : {}),
      ...(currentContext?.traceId ? { traceId: currentContext.traceId } : {}),
      ...(resource ? { resource } : {}),
    } as ObservabilityEvent);
  };

  const histogram = (name: string, value: number, labels?: Record<string, string>): void => {
    emit({
      type: 'metric',
      kind: 'histogram',
      name,
      value,
      timestamp: Date.now(),
      ...(labels ? { labels } : {}),
      ...(currentContext?.spanId ? { spanId: currentContext.spanId } : {}),
      ...(currentContext?.traceId ? { traceId: currentContext.traceId } : {}),
      ...(resource ? { resource } : {}),
    } as ObservabilityEvent);
  };

  const log = (level: LogLevel, message: string, context?: Record<string, unknown>): void => {
    emit({
      type: 'log',
      level,
      message,
      timestamp: Date.now(),
      ...(context ? { context } : {}),
      ...(currentContext?.spanId ? { spanId: currentContext.spanId } : {}),
      ...(currentContext?.traceId ? { traceId: currentContext.traceId } : {}),
      ...(resource ? { resource } : {}),
    } as ObservabilityEvent);
  };

  return {
    emit,
    withSpan,
    counter,
    gauge,
    histogram,
    log,
    debug: (message, context) => log('debug', message, context),
    info: (message, context) => log('info', message, context),
    warn: (message, context) => log('warn', message, context),
    error: (message, context) => log('error', message, context),
    getCurrentContext: () => currentContext,
    setCurrentContext: (context) => {
      currentContext = context;
    },
    getEvents: () => [...events],
    clear: () => {
      events.length = 0;
    },
  };
};

// ============================================================================
// No-Op Observability (zero overhead)
// ============================================================================

/**
 * No-op observability capability
 * All operations are no-ops with zero overhead
 */
export const createNoOpObservability = (): ObservabilityCapability => {
  const noop = () => {};

  return {
    emit: noop,
    withSpan: <T>(_op: string, fn: (spanId: string, ctx: TraceContext) => T) => {
      // Generate minimal IDs for function call
      const spanId = generateSpanId();
      const traceId = generateTraceId();
      return fn(spanId, { traceId, spanId });
    },
    counter: noop,
    gauge: noop,
    histogram: noop,
    log: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    getCurrentContext: () => undefined,
    setCurrentContext: noop,
  };
};

// ============================================================================
// Composite Observability (multiple backends)
// ============================================================================

/**
 * Composite observability capability
 * Sends events to multiple capabilities
 */
export const createCompositeObservability = (
  capabilities: ObservabilityCapability[]
): ObservabilityCapability => {
  return {
    emit: (event) => capabilities.forEach((cap) => cap.emit(event)),
    withSpan: <T>(
      operation: string,
      fn: (spanId: string, ctx: TraceContext) => T,
      attributes?: Record<string, unknown>
    ) => {
      // Use first capability's withSpan for execution, but also trigger on others
      if (capabilities.length === 0) {
        const spanId = generateSpanId();
        const traceId = generateTraceId();
        return fn(spanId, { traceId, spanId });
      }

      // Execute with first capability (which will handle the actual execution)
      const result = capabilities[0]!.withSpan(operation, fn, attributes);

      // For other capabilities, we need to manually trigger their withSpan
      // to ensure they record the span events
      if (capabilities.length > 1) {
        capabilities.slice(1).forEach((cap) => {
          cap.withSpan(operation, () => {}, attributes);
        });
      }

      return result;
    },
    counter: (name, value, labels) =>
      capabilities.forEach((cap) => cap.counter(name, value, labels)),
    gauge: (name, value, labels) =>
      capabilities.forEach((cap) => cap.gauge(name, value, labels)),
    histogram: (name, value, labels) =>
      capabilities.forEach((cap) => cap.histogram(name, value, labels)),
    log: (level, message, context) =>
      capabilities.forEach((cap) => cap.log(level, message, context)),
    debug: (message, context) =>
      capabilities.forEach((cap) => cap.debug(message, context)),
    info: (message, context) => capabilities.forEach((cap) => cap.info(message, context)),
    warn: (message, context) => capabilities.forEach((cap) => cap.warn(message, context)),
    error: (message, context) =>
      capabilities.forEach((cap) => cap.error(message, context)),
    getCurrentContext: () => capabilities[0]?.getCurrentContext(),
    setCurrentContext: (context) =>
      capabilities.forEach((cap) => cap.setCurrentContext(context)),
  };
};
