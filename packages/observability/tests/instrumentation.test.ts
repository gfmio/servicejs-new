import { describe, test, expect } from 'bun:test';
import {
  instrumentComponent,
  createMailboxMetrics,
  createTransportMetrics,
  instrumentFunction,
} from '../src/instrumentation.js';
import { createInMemoryObservability } from '../src/capability.js';
import { isSpanStartEvent, isMetricEvent, isLogEvent } from '../src/types.js';

describe('Built-in Instrumentation', () => {
  describe('Component Instrumentation', () => {
    test('instrumentComponent wraps component with observability', () => {
      const obs = createInMemoryObservability();
      let received: unknown = null;

      const component = {
        send: (msg: unknown) => {
          received = msg;
        },
        getState: () => ({ value: 42 }),
      };

      const instrumented = instrumentComponent(component, obs, {
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
      });

      instrumented.send({ type: 'test', data: 'value' });

      expect(received).toEqual({ type: 'test', data: 'value' });

      const events = obs.getEvents();
      expect(events.length).toBeGreaterThan(0);

      const spans = events.filter(isSpanStartEvent);
      expect(spans.length).toBeGreaterThan(0);
    });

    test('instrumentComponent includes service metadata', () => {
      const obs = createInMemoryObservability();

      const component = {
        send: (_msg: unknown) => {},
        getState: () => ({}),
      };

      const instrumented = instrumentComponent(component, obs, {
        serviceName: 'my-service',
        serviceVersion: '2.0.0',
        serviceInstanceId: 'instance-123',
      });

      instrumented.send({ type: 'test' });

      const events = obs.getEvents();
      const spans = events.filter(isSpanStartEvent);

      expect(spans).toHaveLength(1);
      expect(spans[0]?.attributes?.['service.name']).toBe('my-service');
      expect(spans[0]?.attributes?.['service.version']).toBe('2.0.0');
    });

    test('instrumentComponent can disable auto-instrumentation', () => {
      const obs = createInMemoryObservability();

      const component = {
        send: (_msg: unknown) => {},
        getState: () => ({}),
      };

      const instrumented = instrumentComponent(component, obs, {
        serviceName: 'test-service',
        autoInstrument: false,
      });

      instrumented.send({ type: 'test' });

      const events = obs.getEvents();
      expect(events).toHaveLength(0);
    });
  });

  describe('Mailbox Instrumentation', () => {
    test('records enqueued messages', () => {
      const obs = createInMemoryObservability();
      const metrics = createMailboxMetrics(obs, 'test-mailbox');

      metrics.enqueued('user.create');

      const events = obs.getEvents();
      const metricEvents = events.filter(isMetricEvent);

      const enqueued = metricEvents.find(
        (m) => m.name === 'mailbox.messages.enqueued'
      );
      expect(enqueued).toBeDefined();
      expect(enqueued?.value).toBe(1);
      expect(enqueued?.labels?.['mailbox']).toBe('test-mailbox');
      expect(enqueued?.labels?.['message_type']).toBe('user.create');
    });

    test('records dequeued messages with queue time', () => {
      const obs = createInMemoryObservability();
      const metrics = createMailboxMetrics(obs, 'test-mailbox');

      metrics.dequeued('user.create', 150);

      const events = obs.getEvents();
      const metricEvents = events.filter(isMetricEvent);

      const dequeued = metricEvents.find(
        (m) => m.name === 'mailbox.messages.dequeued'
      );
      expect(dequeued).toBeDefined();

      const queueTime = metricEvents.find(
        (m) => m.name === 'mailbox.queue.time'
      );
      expect(queueTime).toBeDefined();
      expect(queueTime?.value).toBe(150);
    });

    test('records processed messages with processing time', () => {
      const obs = createInMemoryObservability();
      const metrics = createMailboxMetrics(obs, 'test-mailbox');

      metrics.processed('user.create', 25);

      const events = obs.getEvents();
      const metricEvents = events.filter(isMetricEvent);

      const processed = metricEvents.find(
        (m) => m.name === 'mailbox.messages.processed'
      );
      expect(processed).toBeDefined();

      const processingTime = metricEvents.find(
        (m) => m.name === 'mailbox.processing.time'
      );
      expect(processingTime).toBeDefined();
      expect(processingTime?.value).toBe(25);
    });

    test('records failed messages with error', () => {
      const obs = createInMemoryObservability();
      const metrics = createMailboxMetrics(obs, 'test-mailbox');

      metrics.failed('user.create', new Error('Processing failed'));

      const events = obs.getEvents();
      const metricEvents = events.filter(isMetricEvent);

      const failed = metricEvents.find(
        (m) => m.name === 'mailbox.messages.failed'
      );
      expect(failed).toBeDefined();

      const logs = events.filter(isLogEvent);
      expect(logs).toHaveLength(1);
      expect(logs[0]?.level).toBe('error');
      expect(logs[0]?.message).toContain('Processing failed');
    });

    test('updates queue depth gauge', () => {
      const obs = createInMemoryObservability();
      const metrics = createMailboxMetrics(obs, 'test-mailbox');

      metrics.updateQueueDepth(5);

      const events = obs.getEvents();
      const metricEvents = events.filter(isMetricEvent);

      const depth = metricEvents.find(
        (m) => m.name === 'mailbox.queue.depth'
      );
      expect(depth).toBeDefined();
      expect(depth?.value).toBe(5);
      expect(depth?.kind).toBe('gauge');
    });

    test('updates capacity gauge', () => {
      const obs = createInMemoryObservability();
      const metrics = createMailboxMetrics(obs, 'test-mailbox');

      metrics.updateCapacity(100);

      const events = obs.getEvents();
      const metricEvents = events.filter(isMetricEvent);

      const capacity = metricEvents.find(
        (m) => m.name === 'mailbox.queue.capacity'
      );
      expect(capacity).toBeDefined();
      expect(capacity?.value).toBe(100);
    });
  });

  describe('Transport Instrumentation', () => {
    test('records sent messages', () => {
      const obs = createInMemoryObservability();
      const metrics = createTransportMetrics(obs, 'websocket');

      metrics.sent('user.create', 256);

      const events = obs.getEvents();
      const metricEvents = events.filter(isMetricEvent);

      const sent = metricEvents.find(
        (m) => m.name === 'transport.messages.sent'
      );
      expect(sent).toBeDefined();

      const size = metricEvents.find(
        (m) => m.name === 'transport.message.size.bytes'
      );
      expect(size).toBeDefined();
      expect(size?.value).toBe(256);
    });

    test('records received messages', () => {
      const obs = createInMemoryObservability();
      const metrics = createTransportMetrics(obs, 'websocket');

      metrics.received('user.created', 512);

      const events = obs.getEvents();
      const metricEvents = events.filter(isMetricEvent);

      const received = metricEvents.find(
        (m) => m.name === 'transport.messages.received'
      );
      expect(received).toBeDefined();
    });

    test('records serialization metrics', () => {
      const obs = createInMemoryObservability();
      const metrics = createTransportMetrics(obs, 'websocket');

      metrics.serialized(15, 1024);

      const events = obs.getEvents();
      const metricEvents = events.filter(isMetricEvent);

      const duration = metricEvents.find(
        (m) => m.name === 'transport.serialization.duration'
      );
      expect(duration).toBeDefined();
      expect(duration?.value).toBe(15);

      const size = metricEvents.find(
        (m) => m.name === 'transport.serialization.size.bytes'
      );
      expect(size).toBeDefined();
      expect(size?.value).toBe(1024);
    });

    test('records deserialization metrics', () => {
      const obs = createInMemoryObservability();
      const metrics = createTransportMetrics(obs, 'websocket');

      metrics.deserialized(12, 512);

      const events = obs.getEvents();
      const metricEvents = events.filter(isMetricEvent);

      const duration = metricEvents.find(
        (m) => m.name === 'transport.deserialization.duration'
      );
      expect(duration).toBeDefined();
      expect(duration?.value).toBe(12);
    });

    test('records transport errors', () => {
      const obs = createInMemoryObservability();
      const metrics = createTransportMetrics(obs, 'websocket');

      metrics.error('connection_failed', 'Connection timeout');

      const events = obs.getEvents();
      const metricEvents = events.filter(isMetricEvent);

      const errors = metricEvents.find((m) => m.name === 'transport.errors');
      expect(errors).toBeDefined();
      expect(errors?.labels?.['error_type']).toBe('connection_failed');

      const logs = events.filter(isLogEvent);
      expect(logs).toHaveLength(1);
      expect(logs[0]?.message).toContain('Connection timeout');
    });

    test('records connection state changes', () => {
      const obs = createInMemoryObservability();
      const metrics = createTransportMetrics(obs, 'websocket');

      metrics.connectionState('connected');

      const events = obs.getEvents();
      const metricEvents = events.filter(isMetricEvent);

      const state = metricEvents.find(
        (m) => m.name === 'transport.connection.state'
      );
      expect(state).toBeDefined();
      expect(state?.value).toBe(1);
      expect(state?.labels?.['state']).toBe('connected');

      const logs = events.filter(isLogEvent);
      expect(logs).toHaveLength(1);
      expect(logs[0]?.message).toContain('connected');
    });

    test('records disconnected state as 0', () => {
      const obs = createInMemoryObservability();
      const metrics = createTransportMetrics(obs, 'websocket');

      metrics.connectionState('disconnected');

      const events = obs.getEvents();
      const metricEvents = events.filter(isMetricEvent);

      const state = metricEvents.find(
        (m) => m.name === 'transport.connection.state'
      );
      expect(state?.value).toBe(0);
    });
  });

  describe('Function Instrumentation', () => {
    test('records function calls', async () => {
      const obs = createInMemoryObservability();

      const fn = instrumentFunction(obs, 'processOrder', (orderId: string) => {
        return { orderId, success: true };
      });

      await fn('order-123');

      const events = obs.getEvents();
      const metricEvents = events.filter(isMetricEvent);

      const calls = metricEvents.find((m) => m.name === 'function.calls');
      expect(calls).toBeDefined();
      expect(calls?.value).toBe(1);
      expect(calls?.labels?.['function']).toBe('processOrder');
    });

    test('records function duration', async () => {
      const obs = createInMemoryObservability();

      const fn = instrumentFunction(obs, 'processOrder', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { success: true };
      });

      await fn();

      const events = obs.getEvents();
      const metricEvents = events.filter(isMetricEvent);

      const duration = metricEvents.find((m) => m.name === 'function.duration');
      expect(duration).toBeDefined();
      expect(duration?.value).toBeGreaterThan(0);
    });

    test('records function success', async () => {
      const obs = createInMemoryObservability();

      const fn = instrumentFunction(obs, 'processOrder', () => {
        return { success: true };
      });

      await fn();

      const events = obs.getEvents();
      const metricEvents = events.filter(isMetricEvent);

      const success = metricEvents.find((m) => m.name === 'function.success');
      expect(success).toBeDefined();
      expect(success?.value).toBe(1);
    });

    test('records function errors', async () => {
      const obs = createInMemoryObservability();

      const fn = instrumentFunction(obs, 'processOrder', () => {
        throw new Error('Processing failed');
      });

      try {
        await fn();
      } catch (error) {
        // Expected
      }

      const events = obs.getEvents();
      const metricEvents = events.filter(isMetricEvent);

      const errors = metricEvents.find((m) => m.name === 'function.errors');
      expect(errors).toBeDefined();
      expect(errors?.value).toBe(1);

      const logs = events.filter(isLogEvent);
      expect(logs).toHaveLength(1);
      expect(logs[0]?.level).toBe('error');
      expect(logs[0]?.message).toContain('processOrder failed');
    });

    test('preserves function return value', async () => {
      const obs = createInMemoryObservability();

      const fn = instrumentFunction(obs, 'add', (a: number, b: number) => {
        return a + b;
      });

      const result = await fn(2, 3);
      expect(result).toBe(5);
    });

    test('preserves function arguments', async () => {
      const obs = createInMemoryObservability();
      let capturedArgs: [string, number] | null = null;

      const fn = instrumentFunction(
        obs,
        'process',
        (name: string, count: number) => {
          capturedArgs = [name, count];
          return true;
        }
      );

      await fn('test', 42);
      expect(capturedArgs).toEqual(['test', 42]);
    });
  });
});
