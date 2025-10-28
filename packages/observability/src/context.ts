/**
 * Trace context propagation utilities
 */

import type { TraceContext } from './types.js';
import { formatTraceparent, parseTraceparent, formatTracestate, parseTracestate } from './ids.js';

// ============================================================================
// Context Injection/Extraction
// ============================================================================

/**
 * Inject trace context into a message
 */
export const injectTraceContext = <T extends Record<string, unknown>>(
  message: T,
  context: TraceContext
): T & { _trace: TraceContext } => {
  return {
    ...message,
    _trace: context,
  };
};

/**
 * Extract trace context from a message
 */
export const extractTraceContext = <T extends Record<string, unknown>>(
  message: T
): TraceContext | undefined => {
  if ('_trace' in message && typeof message['_trace'] === 'object' && message['_trace'] !== null) {
    const trace = message['_trace'] as Record<string, unknown>;
    if (
      typeof trace['traceId'] === 'string' &&
      typeof trace['spanId'] === 'string'
    ) {
      const traceId = trace['traceId'];
      const spanId = trace['spanId'];
      const parentSpanId = typeof trace['parentSpanId'] === 'string' ? trace['parentSpanId'] : undefined;
      const baggage = typeof trace['baggage'] === 'object' && trace['baggage'] !== null
        ? trace['baggage'] as Record<string, string>
        : undefined;
      const flags = typeof trace['flags'] === 'number' ? trace['flags'] : undefined;

      return {
        traceId,
        spanId,
        ...(parentSpanId ? { parentSpanId } : {}),
        ...(baggage ? { baggage } : {}),
        ...(flags !== undefined ? { flags } : {}),
      } as TraceContext;
    }
  }
  return undefined;
};

/**
 * Remove trace context from a message
 */
export const removeTraceContext = <T extends Record<string, unknown>>(
  message: T
): Omit<T, '_trace'> => {
  const { _trace, ...rest } = message;
  return rest as Omit<T, '_trace'>;
};

// ============================================================================
// HTTP Header Injection/Extraction
// ============================================================================

/**
 * Inject trace context into HTTP headers
 */
export const injectTraceHeaders = (
  headers: Record<string, string>,
  context: TraceContext
): Record<string, string> => {
  const result = { ...headers };

  // W3C Trace Context
  result['traceparent'] = formatTraceparent(context.traceId, context.spanId, true);

  // W3C Baggage
  if (context.baggage && Object.keys(context.baggage).length > 0) {
    result['tracestate'] = formatTracestate(context.baggage);
  }

  return result;
};

/**
 * Extract trace context from HTTP headers
 */
export const extractTraceHeaders = (
  headers: Record<string, string>
): TraceContext | undefined => {
  const traceparent = headers['traceparent'] || headers['Traceparent'];
  if (!traceparent) return undefined;

  const parsed = parseTraceparent(traceparent);
  if (!parsed) return undefined;

  const tracestate = headers['tracestate'] || headers['Tracestate'];
  const baggage = tracestate ? parseTracestate(tracestate) : undefined;

  return {
    traceId: parsed.traceId,
    spanId: parsed.spanId,
    ...(baggage ? { baggage } : {}),
    flags: parsed.sampled ? 1 : 0,
  };
};

// ============================================================================
// Async Context Tracking (using AsyncLocalStorage if available)
// ============================================================================

// Check if AsyncLocalStorage is available (Node.js, Bun)
const hasAsyncLocalStorage = typeof globalThis !== 'undefined' &&
  'AsyncLocalStorage' in globalThis;

let asyncStorage: any = null;

if (hasAsyncLocalStorage) {
  try {
    // @ts-ignore - AsyncLocalStorage might not be in types
    const { AsyncLocalStorage } = await import('async_hooks');
    asyncStorage = new AsyncLocalStorage();
  } catch {
    // Not available, fallback to manual context passing
  }
}

/**
 * Run function with trace context in async local storage
 */
export const withTraceContext = <T>(
  context: TraceContext,
  fn: () => T
): T => {
  if (asyncStorage) {
    return asyncStorage.run(context, fn);
  } else {
    // Fallback: just execute the function
    // Context must be passed manually
    return fn();
  }
};

/**
 * Get current trace context from async local storage
 */
export const getTraceContext = (): TraceContext | undefined => {
  if (asyncStorage) {
    return asyncStorage.getStore();
  }
  return undefined;
};

// ============================================================================
// Baggage Utilities
// ============================================================================

/**
 * Add baggage to trace context
 */
export const addBaggage = (
  context: TraceContext,
  key: string,
  value: string
): TraceContext => {
  return {
    ...context,
    baggage: {
      ...context.baggage,
      [key]: value,
    },
  };
};

/**
 * Get baggage value from trace context
 */
export const getBaggage = (context: TraceContext, key: string): string | undefined => {
  return context.baggage?.[key];
};

/**
 * Remove baggage from trace context
 */
export const removeBaggage = (context: TraceContext, key: string): TraceContext => {
  if (!context.baggage) return context;

  const { [key]: _, ...rest } = context.baggage;
  return {
    ...context,
    baggage: rest,
  };
};
