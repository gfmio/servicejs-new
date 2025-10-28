import { describe, test, expect } from 'bun:test';
import {
  assertEventEmitted,
  assertSpanCreated,
  assertSpanCompleted,
  assertMetricRecorded,
  assertLogEmitted,
  assertNoEventEmitted,
  assertChronologicalOrder,
  assertSpanNesting,
  countEventsByType,
  getSpans,
  getMetricsByName,
  getLogsByLevel,
  AssertionError,
} from '../src/testing.js';
import type { ObservabilityEvent } from '../src/types.js';
import { createMockTransport, TransportAssertionError } from '../src/mock-transport.js';

describe('Testing Utilities', () => {
  describe('assertEventEmitted', () => {
    test('passes when event is found', () => {
      const events: ObservabilityEvent[] = [
        {
          type: 'log',
          level: 'info',
          message: 'Test',
          timestamp: Date.now(),
        },
      ];

      const result = assertEventEmitted(events, 'log');
      expect(result.type).toBe('log');
    });

    test('throws when event is not found', () => {
      const events: ObservabilityEvent[] = [];

      expect(() => {
        assertEventEmitted(events, 'log');
      }).toThrow(AssertionError);
    });

    test('filters by predicate', () => {
      const events: ObservabilityEvent[] = [
        {
          type: 'log',
          level: 'info',
          message: 'Test 1',
          timestamp: Date.now(),
        },
        {
          type: 'log',
          level: 'error',
          message: 'Test 2',
          timestamp: Date.now(),
        },
      ];

      const result = assertEventEmitted(
        events,
        'log',
        (e) => 'level' in e && e.level === 'error'
      );
      expect(result).toHaveProperty('level', 'error');
    });
  });

  describe('assertSpanCreated', () => {
    test('passes when span is found', () => {
      const events: ObservabilityEvent[] = [
        {
          type: 'span.start',
          spanId: '123',
          traceId: '456',
          operation: 'test.op',
          timestamp: Date.now(),
        },
      ];

      const result = assertSpanCreated(events, 'test.op');
      expect(result.operation).toBe('test.op');
    });

    test('throws when span is not found', () => {
      const events: ObservabilityEvent[] = [];

      expect(() => {
        assertSpanCreated(events, 'test.op');
      }).toThrow(AssertionError);
    });
  });

  describe('assertSpanCompleted', () => {
    test('passes when span has start and end', () => {
      const now = Date.now();
      const events: ObservabilityEvent[] = [
        {
          type: 'span.start',
          spanId: '123',
          traceId: '456',
          operation: 'test.op',
          timestamp: now,
        },
        {
          type: 'span.end',
          spanId: '123',
          duration: 100,
          status: 'ok',
          timestamp: now + 100,
        },
      ];

      const result = assertSpanCompleted(events, 'test.op');
      expect(result.start.operation).toBe('test.op');
      expect(result.end.status).toBe('ok');
    });

    test('throws when span has no end event', () => {
      const events: ObservabilityEvent[] = [
        {
          type: 'span.start',
          spanId: '123',
          traceId: '456',
          operation: 'test.op',
          timestamp: Date.now(),
        },
      ];

      expect(() => {
        assertSpanCompleted(events, 'test.op');
      }).toThrow(AssertionError);
    });

    test('validates span status', () => {
      const now = Date.now();
      const events: ObservabilityEvent[] = [
        {
          type: 'span.start',
          spanId: '123',
          traceId: '456',
          operation: 'test.op',
          timestamp: now,
        },
        {
          type: 'span.end',
          spanId: '123',
          duration: 100,
          status: 'error',
          timestamp: now + 100,
        },
      ];

      expect(() => {
        assertSpanCompleted(events, 'test.op', 'ok');
      }).toThrow(AssertionError);
    });
  });

  describe('assertMetricRecorded', () => {
    test('passes when metric is found', () => {
      const events: ObservabilityEvent[] = [
        {
          type: 'metric',
          kind: 'counter',
          name: 'requests.count',
          value: 1,
          timestamp: Date.now(),
        },
      ];

      const result = assertMetricRecorded(events, 'requests.count');
      expect(result.name).toBe('requests.count');
    });

    test('validates metric value', () => {
      const events: ObservabilityEvent[] = [
        {
          type: 'metric',
          kind: 'counter',
          name: 'requests.count',
          value: 42,
          timestamp: Date.now(),
        },
      ];

      const result = assertMetricRecorded(events, 'requests.count', 42);
      expect(result.value).toBe(42);

      expect(() => {
        assertMetricRecorded(events, 'requests.count', 100);
      }).toThrow(AssertionError);
    });
  });

  describe('assertLogEmitted', () => {
    test('passes when log is found', () => {
      const events: ObservabilityEvent[] = [
        {
          type: 'log',
          level: 'info',
          message: 'Test message',
          timestamp: Date.now(),
        },
      ];

      const result = assertLogEmitted(events, 'info');
      expect(result.level).toBe('info');
    });

    test('filters by message string', () => {
      const events: ObservabilityEvent[] = [
        {
          type: 'log',
          level: 'info',
          message: 'Test message',
          timestamp: Date.now(),
        },
      ];

      const result = assertLogEmitted(events, 'info', 'Test');
      expect(result.message).toContain('Test');

      expect(() => {
        assertLogEmitted(events, 'info', 'Missing');
      }).toThrow(AssertionError);
    });

    test('filters by message regex', () => {
      const events: ObservabilityEvent[] = [
        {
          type: 'log',
          level: 'error',
          message: 'Error: Something went wrong',
          timestamp: Date.now(),
        },
      ];

      const result = assertLogEmitted(events, 'error', /Error:/);
      expect(result.message).toMatch(/Error:/);
    });
  });

  describe('assertNoEventEmitted', () => {
    test('passes when no matching events', () => {
      const events: ObservabilityEvent[] = [
        {
          type: 'log',
          level: 'info',
          message: 'Test',
          timestamp: Date.now(),
        },
      ];

      assertNoEventEmitted(events, 'metric');
    });

    test('throws when matching event found', () => {
      const events: ObservabilityEvent[] = [
        {
          type: 'log',
          level: 'info',
          message: 'Test',
          timestamp: Date.now(),
        },
      ];

      expect(() => {
        assertNoEventEmitted(events, 'log');
      }).toThrow(AssertionError);
    });
  });

  describe('assertChronologicalOrder', () => {
    test('passes when events are in order', () => {
      const now = Date.now();
      const events: ObservabilityEvent[] = [
        {
          type: 'log',
          level: 'info',
          message: 'First',
          timestamp: now,
        },
        {
          type: 'log',
          level: 'info',
          message: 'Second',
          timestamp: now + 100,
        },
      ];

      assertChronologicalOrder(events);
    });

    test('throws when events are out of order', () => {
      const now = Date.now();
      const events: ObservabilityEvent[] = [
        {
          type: 'log',
          level: 'info',
          message: 'Second',
          timestamp: now + 100,
        },
        {
          type: 'log',
          level: 'info',
          message: 'First',
          timestamp: now,
        },
      ];

      expect(() => {
        assertChronologicalOrder(events);
      }).toThrow(AssertionError);
    });
  });

  describe('assertSpanNesting', () => {
    test('passes when child span is nested under parent', () => {
      const events: ObservabilityEvent[] = [
        {
          type: 'span.start',
          spanId: 'parent-123',
          traceId: 'trace-456',
          operation: 'parent.op',
          timestamp: Date.now(),
        },
        {
          type: 'span.start',
          spanId: 'child-789',
          traceId: 'trace-456',
          parentSpanId: 'parent-123',
          operation: 'child.op',
          timestamp: Date.now(),
        },
      ];

      const result = assertSpanNesting(events, 'parent.op', 'child.op');
      expect(result.parent.spanId).toBe('parent-123');
      expect(result.child.spanId).toBe('child-789');
    });

    test('throws when parent span IDs do not match', () => {
      const events: ObservabilityEvent[] = [
        {
          type: 'span.start',
          spanId: 'parent-123',
          traceId: 'trace-456',
          operation: 'parent.op',
          timestamp: Date.now(),
        },
        {
          type: 'span.start',
          spanId: 'child-789',
          traceId: 'trace-456',
          parentSpanId: 'wrong-parent',
          operation: 'child.op',
          timestamp: Date.now(),
        },
      ];

      expect(() => {
        assertSpanNesting(events, 'parent.op', 'child.op');
      }).toThrow(AssertionError);
    });
  });

  describe('countEventsByType', () => {
    test('counts events by type', () => {
      const events: ObservabilityEvent[] = [
        {
          type: 'log',
          level: 'info',
          message: 'Test 1',
          timestamp: Date.now(),
        },
        {
          type: 'log',
          level: 'info',
          message: 'Test 2',
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

      const counts = countEventsByType(events);
      expect(counts['log']).toBe(2);
      expect(counts['metric']).toBe(1);
    });
  });

  describe('getSpans', () => {
    test('categorizes spans correctly', () => {
      const now = Date.now();
      const events: ObservabilityEvent[] = [
        {
          type: 'span.start',
          spanId: 'complete-1',
          traceId: 'trace-1',
          operation: 'complete.op',
          timestamp: now,
        },
        {
          type: 'span.end',
          spanId: 'complete-1',
          duration: 100,
          status: 'ok',
          timestamp: now + 100,
        },
        {
          type: 'span.start',
          spanId: 'incomplete-1',
          traceId: 'trace-1',
          operation: 'incomplete.op',
          timestamp: now,
        },
      ];

      const result = getSpans(events);
      expect(result.starts).toHaveLength(2);
      expect(result.ends).toHaveLength(1);
      expect(result.completed).toHaveLength(1);
      expect(result.incomplete).toHaveLength(1);
    });
  });

  describe('getMetricsByName', () => {
    test('filters metrics by name', () => {
      const events: ObservabilityEvent[] = [
        {
          type: 'metric',
          kind: 'counter',
          name: 'requests.count',
          value: 1,
          timestamp: Date.now(),
        },
        {
          type: 'metric',
          kind: 'counter',
          name: 'requests.count',
          value: 2,
          timestamp: Date.now(),
        },
        {
          type: 'metric',
          kind: 'gauge',
          name: 'memory.usage',
          value: 1024,
          timestamp: Date.now(),
        },
      ];

      const result = getMetricsByName(events, 'requests.count');
      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe('requests.count');
    });
  });

  describe('getLogsByLevel', () => {
    test('filters logs by level', () => {
      const events: ObservabilityEvent[] = [
        {
          type: 'log',
          level: 'info',
          message: 'Info',
          timestamp: Date.now(),
        },
        {
          type: 'log',
          level: 'error',
          message: 'Error',
          timestamp: Date.now(),
        },
      ];

      const result = getLogsByLevel(events, 'error');
      expect(result).toHaveLength(1);
      expect(result[0]?.level).toBe('error');
    });
  });
});

describe('Mock Transport', () => {
  test('captures sent messages', () => {
    const transport = createMockTransport<{ type: string }>();

    transport.send({ type: 'test' });

    expect(transport.getSentCount()).toBe(1);
    const messages = transport.getSentMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0]?.message.type).toBe('test');
  });

  test('captures target information', () => {
    const transport = createMockTransport<{ type: string }>();

    transport.send({ type: 'test' }, 'service-a');

    const messages = transport.getMessagesSentTo('service-a');
    expect(messages).toHaveLength(1);
  });

  test('filters messages by predicate', () => {
    const transport = createMockTransport<{ type: string; value: number }>();

    transport.send({ type: 'test', value: 1 });
    transport.send({ type: 'test', value: 2 });
    transport.send({ type: 'other', value: 3 });

    const messages = transport.getMessagesMatching((m) => m.type === 'test');
    expect(messages).toHaveLength(2);
  });

  test('clear removes all messages', () => {
    const transport = createMockTransport<{ type: string }>();

    transport.send({ type: 'test' });
    expect(transport.getSentCount()).toBe(1);

    transport.clear();
    expect(transport.getSentCount()).toBe(0);
  });

  test('injects received messages', () => {
    const transport = createMockTransport<{ type: string }>();

    transport.injectReceived({ type: 'test' });

    expect(transport.getReceivedCount()).toBe(1);
    const messages = transport.getReceivedMessages();
    expect(messages[0]?.message.type).toBe('test');
  });

  test('calls onReceive callback', () => {
    const transport = createMockTransport<{ type: string }>();
    let received: { type: string } | null = null;

    transport.onReceive((msg) => {
      received = msg;
    });

    transport.injectReceived({ type: 'test' });

    expect(received).toEqual({ type: 'test' });
  });

  test('assertSent passes when message sent', () => {
    const transport = createMockTransport<{ type: string }>();

    transport.send({ type: 'test' });

    const result = transport.assertSent((m) => m.type === 'test');
    expect(result.message.type).toBe('test');
  });

  test('assertSent throws when message not sent', () => {
    const transport = createMockTransport<{ type: string }>();

    expect(() => {
      transport.assertSent((m) => m.type === 'missing');
    }).toThrow(TransportAssertionError);
  });

  test('assertSentTo validates target', () => {
    const transport = createMockTransport<{ type: string }>();

    transport.send({ type: 'test' }, 'service-a');

    const result = transport.assertSentTo('service-a');
    expect(result.message.type).toBe('test');

    expect(() => {
      transport.assertSentTo('service-b');
    }).toThrow(TransportAssertionError);
  });

  test('assertReceived validates received messages', () => {
    const transport = createMockTransport<{ type: string }>();

    transport.injectReceived({ type: 'test' });

    const result = transport.assertReceived((m) => m.type === 'test');
    expect(result.message.type).toBe('test');
  });

  test('assertNotSent passes when no matching messages', () => {
    const transport = createMockTransport<{ type: string }>();

    transport.send({ type: 'test' });

    transport.assertNotSent((m) => m.type === 'missing');
  });

  test('assertNotSent throws when matching message found', () => {
    const transport = createMockTransport<{ type: string }>();

    transport.send({ type: 'test' });

    expect(() => {
      transport.assertNotSent((m) => m.type === 'test');
    }).toThrow(TransportAssertionError);
  });
});
