import { describe, test, expect } from 'bun:test';
import {
  createInMemoryObservability,
  createNoOpObservability,
  createCompositeObservability,
} from '../src/capability';
import { isSpanStartEvent, isSpanEndEvent, isMetricEvent, isLogEvent } from '../src/types';

describe('In-Memory Observability', () => {
  test('emit stores events', () => {
    const obs = createInMemoryObservability();

    obs.emit({
      type: 'log',
      level: 'info',
      message: 'Test message',
      timestamp: Date.now(),
    });

    const events = obs.getEvents();
    expect(events).toHaveLength(1);
    expect(isLogEvent(events[0])).toBe(true);
  });

  test('withSpan creates span start and end events', () => {
    const obs = createInMemoryObservability();

    const result = obs.withSpan('test.operation', () => {
      return 42;
    });

    expect(result).toBe(42);

    const events = obs.getEvents();
    expect(events).toHaveLength(2);
    expect(isSpanStartEvent(events[0])).toBe(true);
    expect(isSpanEndEvent(events[1])).toBe(true);

    if (isSpanStartEvent(events[0])) {
      expect(events[0].operation).toBe('test.operation');
    }

    if (isSpanEndEvent(events[1])) {
      expect(events[1].status).toBe('ok');
      expect(events[1].duration).toBeGreaterThanOrEqual(0);
    }
  });

  test('withSpan propagates trace context', () => {
    const obs = createInMemoryObservability();

    obs.withSpan('parent', (parentSpanId, parentContext) => {
      obs.withSpan('child', (childSpanId, childContext) => {
        expect(childContext.parentSpanId).toBe(parentSpanId);
        expect(childContext.traceId).toBe(parentContext.traceId);
      });
    });

    const events = obs.getEvents();
    expect(events).toHaveLength(4); // 2 start, 2 end

    const starts = events.filter(isSpanStartEvent);
    expect(starts).toHaveLength(2);

    const parent = starts.find((e) => e.operation === 'parent')!;
    const child = starts.find((e) => e.operation === 'child')!;

    expect(child.parentSpanId).toBe(parent.spanId);
    expect(child.traceId).toBe(parent.traceId);
  });

  test('withSpan handles errors', () => {
    const obs = createInMemoryObservability();

    expect(() => {
      obs.withSpan('error.operation', () => {
        throw new Error('Test error');
      });
    }).toThrow('Test error');

    const events = obs.getEvents();
    const endEvent = events.find(isSpanEndEvent);

    expect(endEvent).toBeDefined();
    if (endEvent) {
      expect(endEvent.status).toBe('error');
      expect(endEvent.error).toBeDefined();
      expect(endEvent.error?.message).toBe('Test error');
    }
  });

  test('counter records metric events', () => {
    const obs = createInMemoryObservability();

    obs.counter('test.counter', 5, { label: 'value' });

    const events = obs.getEvents();
    expect(events).toHaveLength(1);

    const metric = events[0];
    expect(isMetricEvent(metric)).toBe(true);
    if (isMetricEvent(metric)) {
      expect(metric.kind).toBe('counter');
      expect(metric.name).toBe('test.counter');
      expect(metric.value).toBe(5);
      expect(metric.labels).toEqual({ label: 'value' });
    }
  });

  test('gauge records metric events', () => {
    const obs = createInMemoryObservability();

    obs.gauge('test.gauge', 42);

    const events = obs.getEvents();
    const metric = events[0];

    expect(isMetricEvent(metric)).toBe(true);
    if (isMetricEvent(metric)) {
      expect(metric.kind).toBe('gauge');
      expect(metric.name).toBe('test.gauge');
      expect(metric.value).toBe(42);
    }
  });

  test('histogram records metric events', () => {
    const obs = createInMemoryObservability();

    obs.histogram('test.histogram', 100);

    const events = obs.getEvents();
    const metric = events[0];

    expect(isMetricEvent(metric)).toBe(true);
    if (isMetricEvent(metric)) {
      expect(metric.kind).toBe('histogram');
      expect(metric.name).toBe('test.histogram');
      expect(metric.value).toBe(100);
    }
  });

  test('log records log events', () => {
    const obs = createInMemoryObservability();

    obs.log('info', 'Test message', { key: 'value' });

    const events = obs.getEvents();
    const log = events[0];

    expect(isLogEvent(log)).toBe(true);
    if (isLogEvent(log)) {
      expect(log.level).toBe('info');
      expect(log.message).toBe('Test message');
      expect(log.context).toEqual({ key: 'value' });
    }
  });

  test('log helpers work correctly', () => {
    const obs = createInMemoryObservability();

    obs.debug('Debug message');
    obs.info('Info message');
    obs.warn('Warning message');
    obs.error('Error message');

    const events = obs.getEvents();
    expect(events).toHaveLength(4);

    expect(isLogEvent(events[0]) && events[0].level).toBe('debug');
    expect(isLogEvent(events[1]) && events[1].level).toBe('info');
    expect(isLogEvent(events[2]) && events[2].level).toBe('warn');
    expect(isLogEvent(events[3]) && events[3].level).toBe('error');
  });

  test('clear removes all events', () => {
    const obs = createInMemoryObservability();

    obs.info('Message 1');
    obs.info('Message 2');
    expect(obs.getEvents()).toHaveLength(2);

    obs.clear();
    expect(obs.getEvents()).toHaveLength(0);
  });

  test('resource attributes are added to events', () => {
    const obs = createInMemoryObservability({
      resource: {
        'service.name': 'test-service',
        'service.version': '1.0.0',
      },
    });

    obs.info('Test message');

    const events = obs.getEvents();
    const event = events[0];

    expect(event.resource).toEqual({
      'service.name': 'test-service',
      'service.version': '1.0.0',
    });
  });

  test('context management works', () => {
    const obs = createInMemoryObservability();

    expect(obs.getCurrentContext()).toBeUndefined();

    const context = {
      traceId: '1234567890abcdef1234567890abcdef',
      spanId: '1234567890abcdef',
    };

    obs.setCurrentContext(context);
    expect(obs.getCurrentContext()).toEqual(context);

    obs.setCurrentContext(undefined);
    expect(obs.getCurrentContext()).toBeUndefined();
  });
});

describe('No-Op Observability', () => {
  test('all operations are no-ops', () => {
    const obs = createNoOpObservability();

    // These should all complete without errors
    obs.emit({ type: 'log', level: 'info', message: 'test', timestamp: Date.now() });
    obs.counter('test', 1);
    obs.gauge('test', 1);
    obs.histogram('test', 1);
    obs.log('info', 'test');
    obs.debug('test');
    obs.info('test');
    obs.warn('test');
    obs.error('test');

    const result = obs.withSpan('test', () => 42);
    expect(result).toBe(42);

    expect(obs.getCurrentContext()).toBeUndefined();
  });
});

describe('Composite Observability', () => {
  test('forwards events to all capabilities', () => {
    const obs1 = createInMemoryObservability();
    const obs2 = createInMemoryObservability();
    const composite = createCompositeObservability([obs1, obs2]);

    composite.info('Test message');

    expect(obs1.getEvents()).toHaveLength(1);
    expect(obs2.getEvents()).toHaveLength(1);
  });

  test('withSpan uses first capability', () => {
    const obs1 = createInMemoryObservability();
    const obs2 = createInMemoryObservability();
    const composite = createCompositeObservability([obs1, obs2]);

    composite.withSpan('test', () => {});

    // Both should receive the events
    expect(obs1.getEvents()).toHaveLength(2); // start + end
    expect(obs2.getEvents()).toHaveLength(2);
  });

  test('handles empty capability list', () => {
    const composite = createCompositeObservability([]);

    // Should not throw
    composite.info('Test');
    const result = composite.withSpan('test', () => 42);
    expect(result).toBe(42);
  });
});
