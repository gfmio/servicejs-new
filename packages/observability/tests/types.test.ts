import { describe, test, expect } from 'bun:test';
import {
  isSpanStartEvent,
  isSpanEndEvent,
  isMetricEvent,
  isLogEvent,
  isCustomEvent,
  type ObservabilityEvent,
  type SpanStartEvent,
  type SpanEndEvent,
  type MetricEvent,
  type LogEvent,
} from '../src/types';

describe('Event Type Guards', () => {
  test('isSpanStartEvent identifies span start events', () => {
    const event: SpanStartEvent = {
      type: 'span.start',
      spanId: '1234567890abcdef',
      traceId: '1234567890abcdef1234567890abcdef',
      operation: 'test.operation',
      timestamp: Date.now(),
    };

    expect(isSpanStartEvent(event)).toBe(true);
    expect(isSpanEndEvent(event)).toBe(false);
    expect(isMetricEvent(event)).toBe(false);
    expect(isLogEvent(event)).toBe(false);
    expect(isCustomEvent(event)).toBe(false);
  });

  test('isSpanEndEvent identifies span end events', () => {
    const event: SpanEndEvent = {
      type: 'span.end',
      spanId: '1234567890abcdef',
      duration: 100,
      status: 'ok',
      timestamp: Date.now(),
    };

    expect(isSpanStartEvent(event)).toBe(false);
    expect(isSpanEndEvent(event)).toBe(true);
    expect(isMetricEvent(event)).toBe(false);
    expect(isLogEvent(event)).toBe(false);
    expect(isCustomEvent(event)).toBe(false);
  });

  test('isMetricEvent identifies metric events', () => {
    const event: MetricEvent = {
      type: 'metric',
      kind: 'counter',
      name: 'test.counter',
      value: 42,
      timestamp: Date.now(),
    };

    expect(isSpanStartEvent(event)).toBe(false);
    expect(isSpanEndEvent(event)).toBe(false);
    expect(isMetricEvent(event)).toBe(true);
    expect(isLogEvent(event)).toBe(false);
    expect(isCustomEvent(event)).toBe(false);
  });

  test('isLogEvent identifies log events', () => {
    const event: LogEvent = {
      type: 'log',
      level: 'info',
      message: 'Test log message',
      timestamp: Date.now(),
    };

    expect(isSpanStartEvent(event)).toBe(false);
    expect(isSpanEndEvent(event)).toBe(false);
    expect(isMetricEvent(event)).toBe(false);
    expect(isLogEvent(event)).toBe(true);
    expect(isCustomEvent(event)).toBe(false);
  });

  test('isCustomEvent identifies custom events', () => {
    const event: ObservabilityEvent = {
      type: 'custom.event',
      data: { foo: 'bar' },
      timestamp: Date.now(),
    };

    expect(isSpanStartEvent(event)).toBe(false);
    expect(isSpanEndEvent(event)).toBe(false);
    expect(isMetricEvent(event)).toBe(false);
    expect(isLogEvent(event)).toBe(false);
    expect(isCustomEvent(event)).toBe(true);
  });
});
