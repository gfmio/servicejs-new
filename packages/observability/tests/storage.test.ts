import { describe, test, expect } from 'bun:test';
import {
  createEventBuffer,
  reconstructTrace,
  aggregateMetrics,
  queryLogs,
} from '../src/storage.js';
import type { ObservabilityEvent } from '../src/types.js';

describe('Event Storage', () => {
  describe('Event Buffer', () => {
    test('createEventBuffer stores events', () => {
      const buffer = createEventBuffer({ maxSize: 10 });

      const event: ObservabilityEvent = {
        type: 'log',
        level: 'info',
        message: 'Test message',
        timestamp: Date.now(),
      };

      buffer.add(event);

      const events = buffer.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(event);
    });

    test('buffer respects max size', () => {
      const buffer = createEventBuffer({ maxSize: 3 });

      for (let i = 0; i < 5; i++) {
        buffer.add({
          type: 'log',
          level: 'info',
          message: `Message ${i}`,
          timestamp: Date.now(),
        });
      }

      const events = buffer.getEvents();
      expect(events).toHaveLength(3);
      // Should have the last 3 events
      expect(events[0].message).toBe('Message 2');
      expect(events[1].message).toBe('Message 3');
      expect(events[2].message).toBe('Message 4');
    });

    test('getEvents filters by event type', () => {
      const buffer = createEventBuffer({ maxSize: 10 });

      buffer.add({
        type: 'log',
        level: 'info',
        message: 'Log message',
        timestamp: Date.now(),
      });

      buffer.add({
        type: 'metric',
        kind: 'counter',
        name: 'test.counter',
        value: 1,
        timestamp: Date.now(),
      });

      const logs = buffer.getEvents({ type: 'log' });
      expect(logs).toHaveLength(1);
      expect(logs[0].type).toBe('log');

      const metrics = buffer.getEvents({ type: 'metric' });
      expect(metrics).toHaveLength(1);
      expect(metrics[0].type).toBe('metric');
    });

    test('getEvents filters by trace ID', () => {
      const buffer = createEventBuffer({ maxSize: 10 });
      const traceId = '1234567890abcdef1234567890abcdef';

      buffer.add({
        type: 'span.start',
        spanId: '1234567890abcdef',
        traceId,
        operation: 'test',
        timestamp: Date.now(),
      });

      buffer.add({
        type: 'span.start',
        spanId: 'fedcba0987654321',
        traceId: 'different-trace-id',
        operation: 'other',
        timestamp: Date.now(),
      });

      const events = buffer.getEvents({ traceId });
      expect(events).toHaveLength(1);
      expect(events[0].traceId).toBe(traceId);
    });

    test('getEvents filters by span ID', () => {
      const buffer = createEventBuffer({ maxSize: 10 });
      const spanId = '1234567890abcdef';

      buffer.add({
        type: 'span.start',
        spanId,
        traceId: '1234567890abcdef1234567890abcdef',
        operation: 'test',
        timestamp: Date.now(),
      });

      buffer.add({
        type: 'span.end',
        spanId,
        duration: 100,
        status: 'ok',
        timestamp: Date.now(),
      });

      buffer.add({
        type: 'span.end',
        spanId: 'different-span-id',
        duration: 50,
        status: 'ok',
        timestamp: Date.now(),
      });

      const events = buffer.getEvents({ spanId });
      expect(events).toHaveLength(2);
      events.forEach((e) => {
        if ('spanId' in e) {
          expect(e.spanId).toBe(spanId);
        }
      });
    });

    test('getEvents filters by time range', () => {
      const buffer = createEventBuffer({ maxSize: 10 });
      const now = Date.now();

      buffer.add({
        type: 'log',
        level: 'info',
        message: 'Old message',
        timestamp: now - 10000,
      });

      buffer.add({
        type: 'log',
        level: 'info',
        message: 'Recent message',
        timestamp: now,
      });

      const events = buffer.getEvents({
        timeRange: { start: now - 5000, end: now + 1000 },
      });

      expect(events).toHaveLength(1);
      expect(events[0].message).toBe('Recent message');
    });

    test('getEvents combines filters', () => {
      const buffer = createEventBuffer({ maxSize: 10 });
      const traceId = '1234567890abcdef1234567890abcdef';
      const now = Date.now();

      buffer.add({
        type: 'span.start',
        spanId: '1234567890abcdef',
        traceId,
        operation: 'test',
        timestamp: now - 10000,
      });

      buffer.add({
        type: 'span.start',
        spanId: 'fedcba0987654321',
        traceId,
        operation: 'test2',
        timestamp: now,
      });

      buffer.add({
        type: 'log',
        level: 'info',
        message: 'Log',
        timestamp: now,
      });

      const events = buffer.getEvents({
        type: 'span.start',
        traceId,
        timeRange: { start: now - 5000, end: now + 1000 },
      });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('span.start');
      expect(events[0].traceId).toBe(traceId);
    });

    test('clear removes all events', () => {
      const buffer = createEventBuffer({ maxSize: 10 });

      buffer.add({
        type: 'log',
        level: 'info',
        message: 'Message',
        timestamp: Date.now(),
      });

      expect(buffer.getEvents()).toHaveLength(1);

      buffer.clear();

      expect(buffer.getEvents()).toHaveLength(0);
    });
  });

  describe('Trace Reconstruction', () => {
    test('reconstructTrace builds trace from events', () => {
      const traceId = '1234567890abcdef1234567890abcdef';
      const parentSpanId = '1234567890abcdef';
      const childSpanId = 'fedcba0987654321';
      const now = Date.now();

      const events: ObservabilityEvent[] = [
        {
          type: 'span.start',
          spanId: parentSpanId,
          traceId,
          operation: 'parent',
          timestamp: now,
        },
        {
          type: 'span.start',
          spanId: childSpanId,
          traceId,
          parentSpanId,
          operation: 'child',
          timestamp: now + 10,
        },
        {
          type: 'span.end',
          spanId: childSpanId,
          duration: 50,
          status: 'ok',
          timestamp: now + 60,
        },
        {
          type: 'span.end',
          spanId: parentSpanId,
          duration: 100,
          status: 'ok',
          timestamp: now + 100,
        },
      ];

      const trace = reconstructTrace(events, traceId);

      expect(trace.traceId).toBe(traceId);
      expect(trace.spans).toHaveLength(2);
      expect(trace.duration).toBe(100);
    });

    test('reconstructTrace creates hierarchical structure', () => {
      const traceId = '1234567890abcdef1234567890abcdef';
      const rootSpanId = '1111111111111111';
      const childSpanId = '2222222222222222';
      const now = Date.now();

      const events: ObservabilityEvent[] = [
        {
          type: 'span.start',
          spanId: rootSpanId,
          traceId,
          operation: 'root',
          timestamp: now,
        },
        {
          type: 'span.start',
          spanId: childSpanId,
          traceId,
          parentSpanId: rootSpanId,
          operation: 'child',
          timestamp: now + 10,
        },
        {
          type: 'span.end',
          spanId: childSpanId,
          duration: 50,
          status: 'ok',
          timestamp: now + 60,
        },
        {
          type: 'span.end',
          spanId: rootSpanId,
          duration: 100,
          status: 'ok',
          timestamp: now + 100,
        },
      ];

      const trace = reconstructTrace(events, traceId);

      const rootSpan = trace.spans.find((s) => s.spanId === rootSpanId);
      expect(rootSpan).toBeDefined();
      expect(rootSpan?.children).toHaveLength(1);
      expect(rootSpan?.children[0]?.spanId).toBe(childSpanId);
    });

    test('reconstructTrace handles spans without end events', () => {
      const traceId = '1234567890abcdef1234567890abcdef';
      const spanId = '1234567890abcdef';
      const now = Date.now();

      const events: ObservabilityEvent[] = [
        {
          type: 'span.start',
          spanId,
          traceId,
          operation: 'incomplete',
          timestamp: now,
        },
      ];

      const trace = reconstructTrace(events, traceId);

      expect(trace).toBeNull(); // No complete spans, returns null
    });

    test('reconstructTrace filters events by trace ID', () => {
      const traceId1 = '1111111111111111111111111111111';
      const traceId2 = '2222222222222222222222222222222';
      const now = Date.now();

      const events: ObservabilityEvent[] = [
        {
          type: 'span.start',
          spanId: '1111111111111111',
          traceId: traceId1,
          operation: 'span1',
          timestamp: now,
        },
        {
          type: 'span.start',
          spanId: '2222222222222222',
          traceId: traceId2,
          operation: 'span2',
          timestamp: now,
        },
        {
          type: 'span.end',
          spanId: '1111111111111111',
          duration: 100,
          status: 'ok',
          timestamp: now + 100,
        },
      ];

      const trace = reconstructTrace(events, traceId1);

      expect(trace.spans).toHaveLength(1);
      expect(trace.spans[0]?.operation).toBe('span1');
    });
  });

  describe('Metric Aggregation', () => {
    test('aggregateMetrics calculates statistics', () => {
      const events: ObservabilityEvent[] = [
        {
          type: 'metric',
          kind: 'histogram',
          name: 'request.duration',
          value: 100,
          timestamp: Date.now(),
        },
        {
          type: 'metric',
          kind: 'histogram',
          name: 'request.duration',
          value: 200,
          timestamp: Date.now(),
        },
        {
          type: 'metric',
          kind: 'histogram',
          name: 'request.duration',
          value: 300,
          timestamp: Date.now(),
        },
      ];

      const stats = aggregateMetrics(events, 'request.duration');

      expect(stats.count).toBe(3);
      expect(stats.sum).toBe(600);
      expect(stats.min).toBe(100);
      expect(stats.max).toBe(300);
      expect(stats.avg).toBe(200);
    });

    test('aggregateMetrics handles single value', () => {
      const events: ObservabilityEvent[] = [
        {
          type: 'metric',
          kind: 'gauge',
          name: 'memory.usage',
          value: 1024,
          timestamp: Date.now(),
        },
      ];

      const stats = aggregateMetrics(events, 'memory.usage');

      expect(stats.count).toBe(1);
      expect(stats.sum).toBe(1024);
      expect(stats.min).toBe(1024);
      expect(stats.max).toBe(1024);
      expect(stats.avg).toBe(1024);
    });

    test('aggregateMetrics returns zeros for no matching metrics', () => {
      const events: ObservabilityEvent[] = [
        {
          type: 'metric',
          kind: 'counter',
          name: 'other.metric',
          value: 1,
          timestamp: Date.now(),
        },
      ];

      const stats = aggregateMetrics(events, 'nonexistent.metric');

      expect(stats.count).toBe(0);
      expect(stats.sum).toBe(0);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.avg).toBe(0);
    });

    test('aggregateMetrics filters by metric name', () => {
      const events: ObservabilityEvent[] = [
        {
          type: 'metric',
          kind: 'counter',
          name: 'requests.count',
          value: 10,
          timestamp: Date.now(),
        },
        {
          type: 'metric',
          kind: 'counter',
          name: 'errors.count',
          value: 5,
          timestamp: Date.now(),
        },
        {
          type: 'metric',
          kind: 'counter',
          name: 'requests.count',
          value: 20,
          timestamp: Date.now(),
        },
      ];

      const stats = aggregateMetrics(events, 'requests.count');

      expect(stats.count).toBe(2);
      expect(stats.sum).toBe(30);
    });
  });

  describe('Log Querying', () => {
    test('queryLogs returns all logs', () => {
      const events: ObservabilityEvent[] = [
        {
          type: 'log',
          level: 'info',
          message: 'Message 1',
          timestamp: Date.now(),
        },
        {
          type: 'log',
          level: 'error',
          message: 'Message 2',
          timestamp: Date.now(),
        },
        {
          type: 'metric',
          kind: 'counter',
          name: 'test',
          value: 1,
          timestamp: Date.now(),
        },
      ];

      const logs = queryLogs(events);

      expect(logs).toHaveLength(2);
      expect(logs[0]?.message).toBe('Message 1');
      expect(logs[1]?.message).toBe('Message 2');
    });

    test('queryLogs filters by level', () => {
      const events: ObservabilityEvent[] = [
        {
          type: 'log',
          level: 'info',
          message: 'Info message',
          timestamp: Date.now(),
        },
        {
          type: 'log',
          level: 'error',
          message: 'Error message',
          timestamp: Date.now(),
        },
        {
          type: 'log',
          level: 'warn',
          message: 'Warning message',
          timestamp: Date.now(),
        },
      ];

      const errorLogs = queryLogs(events, 'error');

      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0]?.level).toBe('error');
      expect(errorLogs[0]?.message).toBe('Error message');
    });

    test('queryLogs filters by time range', () => {
      const now = Date.now();
      const events: ObservabilityEvent[] = [
        {
          type: 'log',
          level: 'info',
          message: 'Old message',
          timestamp: now - 10000,
        },
        {
          type: 'log',
          level: 'info',
          message: 'Recent message',
          timestamp: now,
        },
      ];

      const logs = queryLogs(events, undefined, {
        start: now - 5000,
        end: now + 1000,
      });

      expect(logs).toHaveLength(1);
      expect(logs[0]?.message).toBe('Recent message');
    });

    test('queryLogs combines level and time filters', () => {
      const now = Date.now();
      const events: ObservabilityEvent[] = [
        {
          type: 'log',
          level: 'error',
          message: 'Old error',
          timestamp: now - 10000,
        },
        {
          type: 'log',
          level: 'error',
          message: 'Recent error',
          timestamp: now,
        },
        {
          type: 'log',
          level: 'info',
          message: 'Recent info',
          timestamp: now,
        },
      ];

      const logs = queryLogs(events, 'error', {
        start: now - 5000,
        end: now + 1000,
      });

      expect(logs).toHaveLength(1);
      expect(logs[0]?.message).toBe('Recent error');
    });

    test('queryLogs includes context', () => {
      const events: ObservabilityEvent[] = [
        {
          type: 'log',
          level: 'info',
          message: 'Message',
          context: {
            userId: '123',
            action: 'login',
          },
          timestamp: Date.now(),
        },
      ];

      const logs = queryLogs(events);

      expect(logs).toHaveLength(1);
      expect(logs[0]?.context).toEqual({
        userId: '123',
        action: 'login',
      });
    });
  });
});
