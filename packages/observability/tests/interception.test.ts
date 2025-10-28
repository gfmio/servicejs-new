import { describe, test, expect } from 'bun:test';
import {
  withMessageObservability,
  withComponentInstrumentation,
  traced,
} from '../src/interception.js';
import { createInMemoryObservability } from '../src/capability.js';
import { isSpanStartEvent, isSpanEndEvent, isMetricEvent } from '../src/types.js';

describe('Message Interception', () => {
  describe('withMessageObservability', () => {
    test('wraps capability with observability', () => {
      const obs = createInMemoryObservability();
      let receivedMessage: unknown = null;

      const originalCap = {
        send: (msg: unknown) => {
          receivedMessage = msg;
        },
      };

      const instrumented = withMessageObservability(originalCap, obs, {
        operation: 'test.send',
        createSpans: false,
        emitMetrics: false,
        propagateContext: false,
      });

      instrumented.send({ type: 'test', data: 'value' });

      expect(receivedMessage).toEqual({ type: 'test', data: 'value' });
    });

    test('creates spans when enabled', () => {
      const obs = createInMemoryObservability();
      const originalCap = {
        send: (_msg: unknown) => {},
      };

      const instrumented = withMessageObservability(originalCap, obs, {
        operation: 'test.send',
        createSpans: true,
        emitMetrics: false,
        propagateContext: false,
      });

      instrumented.send({ type: 'test' });

      const events = obs.getEvents();
      const spanStarts = events.filter(isSpanStartEvent);
      const spanEnds = events.filter(isSpanEndEvent);

      expect(spanStarts).toHaveLength(1);
      expect(spanEnds).toHaveLength(1);
      expect(spanStarts[0]?.operation).toBe('message.test');
    });

    test('emits metrics when enabled', () => {
      const obs = createInMemoryObservability();
      const originalCap = {
        send: (_msg: unknown) => {},
      };

      const instrumented = withMessageObservability(originalCap, obs, {
        operation: 'test.send',
        createSpans: false,
        emitMetrics: true,
        propagateContext: false,
      });

      instrumented.send({ type: 'test' });

      const events = obs.getEvents();
      const metrics = events.filter(isMetricEvent);

      expect(metrics.length).toBeGreaterThan(0);
    });

    test('propagates trace context when enabled', () => {
      const obs = createInMemoryObservability();
      let receivedMessage: Record<string, unknown> | null = null;

      const originalCap = {
        send: (msg: unknown) => {
          receivedMessage = msg as Record<string, unknown>;
        },
      };

      const instrumented = withMessageObservability(originalCap, obs, {
        operation: 'test.send',
        createSpans: true,
        emitMetrics: false,
        propagateContext: true,
      });

      instrumented.send({ type: 'test' });

      expect(receivedMessage).toHaveProperty('_trace');
    });

    test('handles errors in message sending', () => {
      const obs = createInMemoryObservability();
      const originalCap = {
        send: (_msg: unknown) => {
          throw new Error('Send failed');
        },
      };

      const instrumented = withMessageObservability(originalCap, obs, {
        operation: 'test.send',
        createSpans: true,
        emitMetrics: false,
        propagateContext: false,
      });

      expect(() => {
        instrumented.send({ type: 'test' });
      }).toThrow('Send failed');

      const events = obs.getEvents();
      const spanEnds = events.filter(isSpanEndEvent);

      expect(spanEnds).toHaveLength(1);
      expect(spanEnds[0]?.status).toBe('error');
      expect(spanEnds[0]?.error).toBeDefined();
    });

    test('includes message type in span attributes', () => {
      const obs = createInMemoryObservability();
      const originalCap = {
        send: (_msg: unknown) => {},
      };

      const instrumented = withMessageObservability(originalCap, obs, {
        operation: 'test.send',
        createSpans: true,
        emitMetrics: false,
        propagateContext: false,
      });

      instrumented.send({ type: 'my-message' });

      const events = obs.getEvents();
      const spanStarts = events.filter(isSpanStartEvent);

      expect(spanStarts).toHaveLength(1);
      expect(spanStarts[0]?.attributes).toBeDefined();
    });
  });

  describe('withComponentInstrumentation', () => {
    test('wraps component with auto-instrumentation', () => {
      const obs = createInMemoryObservability();
      let receivedMessage: unknown = null;

      const component = {
        send: (msg: unknown) => {
          receivedMessage = msg;
        },
        getState: () => ({ value: 42 }),
      };

      const instrumented = withComponentInstrumentation(component, obs, {
        serviceName: 'test-service',
        autoInstrument: false, // Disable for this test
      });

      instrumented.send({ type: 'test' });

      expect(receivedMessage).toEqual({ type: 'test' });
      expect(instrumented.getState()).toEqual({ value: 42 });
    });

    test('creates spans for component messages when enabled', () => {
      const obs = createInMemoryObservability();
      const component = {
        send: (_msg: unknown) => {},
        getState: () => ({ value: 42 }),
      };

      const instrumented = withComponentInstrumentation(component, obs, {
        serviceName: 'test-service',
        autoInstrument: true,
        emitMetrics: false,
      });

      instrumented.send({ type: 'process' });

      const events = obs.getEvents();
      const spanStarts = events.filter(isSpanStartEvent);
      const spanEnds = events.filter(isSpanEndEvent);

      expect(spanStarts).toHaveLength(1);
      expect(spanEnds).toHaveLength(1);
      expect(spanStarts[0]?.operation).toContain('component');
    });

    test('emits metrics for component when enabled', () => {
      const obs = createInMemoryObservability();
      const component = {
        send: (_msg: unknown) => {},
        getState: () => ({ value: 42 }),
      };

      const instrumented = withComponentInstrumentation(component, obs, {
        serviceName: 'test-service',
        autoInstrument: true,
        emitMetrics: true,
      });

      instrumented.send({ type: 'process' });

      const events = obs.getEvents();
      const metrics = events.filter(isMetricEvent);

      expect(metrics.length).toBeGreaterThan(0);
    });

    test('includes service name in span attributes', () => {
      const obs = createInMemoryObservability();
      const component = {
        send: (_msg: unknown) => {},
        getState: () => ({ value: 42 }),
      };

      const instrumented = withComponentInstrumentation(component, obs, {
        serviceName: 'my-service',
        serviceVersion: '1.0.0',
        autoInstrument: true,
        emitMetrics: false,
      });

      instrumented.send({ type: 'process' });

      const events = obs.getEvents();
      const spanStarts = events.filter(isSpanStartEvent);

      expect(spanStarts).toHaveLength(1);
      expect(spanStarts[0]?.attributes).toBeDefined();
      expect(spanStarts[0]?.attributes?.['service.name']).toBe('my-service');
    });

    test('handles errors in component', () => {
      const obs = createInMemoryObservability();
      const component = {
        send: (_msg: unknown) => {
          throw new Error('Component error');
        },
        getState: () => ({ value: 42 }),
      };

      const instrumented = withComponentInstrumentation(component, obs, {
        serviceName: 'test-service',
        autoInstrument: true,
      });

      expect(() => {
        instrumented.send({ type: 'process' });
      }).toThrow('Component error');

      const events = obs.getEvents();
      const spanEnds = events.filter(isSpanEndEvent);

      expect(spanEnds).toHaveLength(1);
      expect(spanEnds[0]?.status).toBe('error');
    });
  });

  describe('traced function wrapper', () => {
    test('traced wraps function with span', () => {
      const obs = createInMemoryObservability();

      const fn = traced(obs, 'test.operation', () => {
        return 42;
      });

      const result = fn();

      expect(result).toBe(42);

      const events = obs.getEvents();
      const spanStarts = events.filter(isSpanStartEvent);
      const spanEnds = events.filter(isSpanEndEvent);

      expect(spanStarts).toHaveLength(1);
      expect(spanEnds).toHaveLength(1);
      expect(spanStarts[0]?.operation).toBe('test.operation');
      expect(spanEnds[0]?.status).toBe('ok');
    });

    test('traced captures errors', () => {
      const obs = createInMemoryObservability();

      const fn = traced(obs, 'test.operation', () => {
        throw new Error('Function error');
      });

      expect(() => fn()).toThrow('Function error');

      const events = obs.getEvents();
      const spanEnds = events.filter(isSpanEndEvent);

      expect(spanEnds).toHaveLength(1);
      expect(spanEnds[0]?.status).toBe('error');
      expect(spanEnds[0]?.error?.message).toBe('Function error');
    });

    test('traced passes through arguments', () => {
      const obs = createInMemoryObservability();

      const fn = traced(obs, 'test.operation', (a: number, b: number) => {
        return a + b;
      });

      const result = fn(10, 20);

      expect(result).toBe(30);
    });

    test('traced with attributes', () => {
      const obs = createInMemoryObservability();

      const fn = traced(
        obs,
        'test.operation',
        () => {
          return 42;
        },
        () => ({
          'custom.attribute': 'value',
          'user.id': '123',
        })
      );

      fn();

      const events = obs.getEvents();
      const spanStarts = events.filter(isSpanStartEvent);

      expect(spanStarts).toHaveLength(1);
      expect(spanStarts[0]?.attributes?.['custom.attribute']).toBe('value');
      expect(spanStarts[0]?.attributes?.['user.id']).toBe('123');
    });
  });

  describe('Integration Tests', () => {
    test('nested spans create parent-child relationships', () => {
      const obs = createInMemoryObservability();

      obs.withSpan('parent', () => {
        const originalCap = {
          send: (_msg: unknown) => {},
        };

        const instrumented = withMessageObservability(originalCap, obs, {
          operation: 'child',
          createSpans: true,
          emitMetrics: false,
          propagateContext: false,
        });

        instrumented.send({ type: 'test' });
      });

      const events = obs.getEvents();
      const spanStarts = events.filter(isSpanStartEvent);

      expect(spanStarts).toHaveLength(2);

      const parentSpan = spanStarts.find((e) => e.operation === 'parent');
      const childSpan = spanStarts.find((e) => e.operation === 'message.test');

      expect(parentSpan).toBeDefined();
      expect(childSpan).toBeDefined();
      expect(childSpan?.parentSpanId).toBe(parentSpan?.spanId);
      expect(childSpan?.traceId).toBe(parentSpan?.traceId);
    });

    test('trace context propagates through message', () => {
      const obs = createInMemoryObservability();
      let capturedTraceId: string | undefined;

      const originalCap = {
        send: (msg: Record<string, unknown>) => {
          const trace = msg._trace as Record<string, unknown> | undefined;
          capturedTraceId = trace?.traceId as string | undefined;
        },
      };

      const instrumented = withMessageObservability(originalCap, obs, {
        operation: 'test.send',
        createSpans: true,
        emitMetrics: false,
        propagateContext: true,
      });

      obs.withSpan('parent', (_, traceContext) => {
        instrumented.send({ type: 'test' });
        expect(capturedTraceId).toBe(traceContext.traceId);
      });
    });
  });
});
