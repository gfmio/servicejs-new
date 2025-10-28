import { describe, test, expect } from 'bun:test';
import {
  injectTraceContext,
  extractTraceContext,
  removeTraceContext,
  injectTraceHeaders,
  extractTraceHeaders,
  addBaggage,
  getBaggage,
  removeBaggage,
} from '../src/context.js';
import type { TraceContext } from '../src/types.js';

describe('Context Propagation', () => {
  describe('Message Injection/Extraction', () => {
    test('injectTraceContext adds trace context to message', () => {
      const message = { type: 'test', data: 'value' };
      const context: TraceContext = {
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: '1234567890abcdef',
      };

      const result = injectTraceContext(message, context);

      expect(result).toHaveProperty('_trace');
      expect(result.type).toBe('test');
      expect(result.data).toBe('value');
    });

    test('extractTraceContext retrieves context from message', () => {
      const message = { type: 'test', data: 'value' };
      const context: TraceContext = {
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: '1234567890abcdef',
      };

      const injected = injectTraceContext(message, context);
      const extracted = extractTraceContext(injected);

      expect(extracted).toBeDefined();
      expect(extracted?.traceId).toBe(context.traceId);
      expect(extracted?.spanId).toBe(context.spanId);
    });

    test('extractTraceContext returns undefined for message without context', () => {
      const message = { type: 'test', data: 'value' };
      const extracted = extractTraceContext(message);

      expect(extracted).toBeUndefined();
    });

    test('injectTraceContext preserves parent span ID', () => {
      const message = { type: 'test' };
      const context: TraceContext = {
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: '1234567890abcdef',
        parentSpanId: 'fedcba0987654321',
      };

      const injected = injectTraceContext(message, context);
      const extracted = extractTraceContext(injected);

      expect(extracted?.parentSpanId).toBe('fedcba0987654321');
    });

    test('injectTraceContext preserves baggage', () => {
      const message = { type: 'test' };
      const context: TraceContext = {
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: '1234567890abcdef',
        baggage: {
          userId: '123',
          region: 'us-west',
        },
      };

      const injected = injectTraceContext(message, context);
      const extracted = extractTraceContext(injected);

      expect(extracted?.baggage).toEqual({
        userId: '123',
        region: 'us-west',
      });
    });

    test('injectTraceContext preserves flags', () => {
      const message = { type: 'test' };
      const context: TraceContext = {
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: '1234567890abcdef',
        flags: 1,
      };

      const injected = injectTraceContext(message, context);
      const extracted = extractTraceContext(injected);

      expect(extracted?.flags).toBe(1);
    });

    test('removeTraceContext strips trace context from message', () => {
      const message = { type: 'test', data: 'value' };
      const context: TraceContext = {
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: '1234567890abcdef',
      };

      const injected = injectTraceContext(message, context);
      const removed = removeTraceContext(injected);

      expect(removed).not.toHaveProperty('_trace');
      expect(removed.type).toBe('test');
      expect(removed.data).toBe('value');
    });
  });

  describe('HTTP Header Injection/Extraction', () => {
    test('injectTraceHeaders adds traceparent header', () => {
      const headers: Record<string, string> = {};
      const context: TraceContext = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
      };

      const result = injectTraceHeaders(headers, context);

      expect(result.traceparent).toBeDefined();
      expect(result.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    });

    test('injectTraceHeaders includes baggage as tracestate', () => {
      const headers: Record<string, string> = {};
      const context: TraceContext = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        baggage: {
          vendor1: 'value1',
          vendor2: 'value2',
        },
      };

      const result = injectTraceHeaders(headers, context);

      expect(result.tracestate).toBeDefined();
      expect(result.tracestate).toContain('vendor1=value1');
      expect(result.tracestate).toContain('vendor2=value2');
    });

    test('injectTraceHeaders preserves existing headers', () => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token',
      };
      const context: TraceContext = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
      };

      const result = injectTraceHeaders(headers, context);

      expect(result['Content-Type']).toBe('application/json');
      expect(result['Authorization']).toBe('Bearer token');
      expect(result.traceparent).toBeDefined();
    });

    test('extractTraceHeaders retrieves context from headers', () => {
      const headers: Record<string, string> = {
        traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      };

      const context = extractTraceHeaders(headers);

      expect(context).toBeDefined();
      expect(context?.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
      expect(context?.spanId).toBe('00f067aa0ba902b7');
      expect(context?.flags).toBe(1);
    });

    test('extractTraceHeaders extracts baggage from tracestate', () => {
      const headers: Record<string, string> = {
        traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
        tracestate: 'vendor1=value1,vendor2=value2',
      };

      const context = extractTraceHeaders(headers);

      expect(context?.baggage).toEqual({
        vendor1: 'value1',
        vendor2: 'value2',
      });
    });

    test('extractTraceHeaders handles case-insensitive headers', () => {
      const headers: Record<string, string> = {
        Traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
        Tracestate: 'vendor=value',
      };

      const context = extractTraceHeaders(headers);

      expect(context).toBeDefined();
      expect(context?.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
    });

    test('extractTraceHeaders returns undefined for missing traceparent', () => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const context = extractTraceHeaders(headers);

      expect(context).toBeUndefined();
    });

    test('extractTraceHeaders returns undefined for invalid traceparent', () => {
      const headers: Record<string, string> = {
        traceparent: 'invalid-format',
      };

      const context = extractTraceHeaders(headers);

      expect(context).toBeUndefined();
    });
  });

  describe('Baggage Management', () => {
    test('addBaggage adds new baggage item', () => {
      const context: TraceContext = {
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: '1234567890abcdef',
      };

      const result = addBaggage(context, 'userId', '123');

      expect(result.baggage).toEqual({ userId: '123' });
      expect(result.traceId).toBe(context.traceId);
      expect(result.spanId).toBe(context.spanId);
    });

    test('addBaggage adds to existing baggage', () => {
      const context: TraceContext = {
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: '1234567890abcdef',
        baggage: {
          userId: '123',
        },
      };

      const result = addBaggage(context, 'region', 'us-west');

      expect(result.baggage).toEqual({
        userId: '123',
        region: 'us-west',
      });
    });

    test('addBaggage overwrites existing key', () => {
      const context: TraceContext = {
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: '1234567890abcdef',
        baggage: {
          userId: '123',
        },
      };

      const result = addBaggage(context, 'userId', '456');

      expect(result.baggage).toEqual({ userId: '456' });
    });

    test('getBaggage retrieves baggage value', () => {
      const context: TraceContext = {
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: '1234567890abcdef',
        baggage: {
          userId: '123',
          region: 'us-west',
        },
      };

      expect(getBaggage(context, 'userId')).toBe('123');
      expect(getBaggage(context, 'region')).toBe('us-west');
    });

    test('getBaggage returns undefined for missing key', () => {
      const context: TraceContext = {
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: '1234567890abcdef',
        baggage: {
          userId: '123',
        },
      };

      expect(getBaggage(context, 'nonexistent')).toBeUndefined();
    });

    test('getBaggage returns undefined when no baggage', () => {
      const context: TraceContext = {
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: '1234567890abcdef',
      };

      expect(getBaggage(context, 'userId')).toBeUndefined();
    });

    test('removeBaggage removes baggage item', () => {
      const context: TraceContext = {
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: '1234567890abcdef',
        baggage: {
          userId: '123',
          region: 'us-west',
        },
      };

      const result = removeBaggage(context, 'userId');

      expect(result.baggage).toEqual({ region: 'us-west' });
    });

    test('removeBaggage handles removing nonexistent key', () => {
      const context: TraceContext = {
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: '1234567890abcdef',
        baggage: {
          userId: '123',
        },
      };

      const result = removeBaggage(context, 'nonexistent');

      expect(result.baggage).toEqual({ userId: '123' });
    });

    test('removeBaggage handles context without baggage', () => {
      const context: TraceContext = {
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: '1234567890abcdef',
      };

      const result = removeBaggage(context, 'userId');

      expect(result.baggage).toBeUndefined();
    });
  });

  describe('Round-trip Tests', () => {
    test('context survives message injection and extraction', () => {
      const original: TraceContext = {
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: '1234567890abcdef',
        parentSpanId: 'fedcba0987654321',
        baggage: {
          userId: '123',
          region: 'us-west',
        },
        flags: 1,
      };

      const message = { type: 'test', data: 'value' };
      const injected = injectTraceContext(message, original);
      const extracted = extractTraceContext(injected);

      expect(extracted).toEqual(original);
    });

    test('context survives HTTP header injection and extraction', () => {
      const original: TraceContext = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        baggage: {
          vendor1: 'value1',
          vendor2: 'value2',
        },
      };

      const headers = injectTraceHeaders({}, original);
      const extracted = extractTraceHeaders(headers);

      expect(extracted?.traceId).toBe(original.traceId);
      expect(extracted?.spanId).toBe(original.spanId);
      expect(extracted?.baggage).toEqual(original.baggage);
    });
  });
});
