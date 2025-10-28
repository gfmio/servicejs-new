import { describe, test, expect } from 'bun:test';
import { createConsoleAdapter } from '../src/adapters/console.js';
import { createOpenTelemetryAdapter } from '../src/adapters/opentelemetry.js';
import { createPrometheusAdapter } from '../src/adapters/prometheus.js';
import { createStatsDAdapter } from '../src/adapters/statsd.js';
import { createStructuredLogAdapter } from '../src/adapters/structured-log.js';
import { createAxiomAdapter } from '../src/adapters/axiom.js';
import type { ObservabilityEvent } from '../src/types.js';

describe('Adapters', () => {
  describe('Console Adapter', () => {
    test('processes events without errors', () => {
      const outputs: string[] = [];
      const adapter = createConsoleAdapter({
        output: (line) => outputs.push(line),
        colors: false,
      });

      const event: ObservabilityEvent = {
        type: 'log',
        level: 'info',
        message: 'Test message',
        timestamp: Date.now(),
      };

      adapter(event);

      expect(outputs.length).toBeGreaterThan(0);
    });

    test('formats span events', () => {
      const outputs: string[] = [];
      const adapter = createConsoleAdapter({
        output: (line) => outputs.push(line),
        colors: false,
      });

      const spanStart: ObservabilityEvent = {
        type: 'span.start',
        spanId: '1234567890abcdef',
        traceId: '1234567890abcdef1234567890abcdef',
        operation: 'test.operation',
        timestamp: Date.now(),
      };

      adapter(spanStart);

      expect(outputs.length).toBeGreaterThan(0);
      expect(outputs[0]).toContain('test.operation');
    });

    test('formats metric events', () => {
      const outputs: string[] = [];
      const adapter = createConsoleAdapter({
        output: (line) => outputs.push(line),
        colors: false,
      });

      const metric: ObservabilityEvent = {
        type: 'metric',
        kind: 'counter',
        name: 'test.counter',
        value: 42,
        timestamp: Date.now(),
      };

      adapter(metric);

      expect(outputs.length).toBeGreaterThan(0);
      expect(outputs[0]).toContain('test.counter');
      expect(outputs[0]).toContain('42');
    });
  });

  describe('OpenTelemetry Adapter', () => {
    test('processes span events', async () => {
      const exported: unknown[] = [];
      const adapter = createOpenTelemetryAdapter({
        export: async (result) => {
          exported.push(result);
        },
        batchSize: 1,
      });

      const spanStart: ObservabilityEvent = {
        type: 'span.start',
        spanId: '1234567890abcdef',
        traceId: '1234567890abcdef1234567890abcdef',
        operation: 'test.operation',
        timestamp: Date.now(),
      };

      const spanEnd: ObservabilityEvent = {
        type: 'span.end',
        spanId: '1234567890abcdef',
        duration: 100,
        status: 'ok',
        timestamp: Date.now(),
      };

      adapter.process(spanStart);
      adapter.process(spanEnd);
      await adapter.flush();

      expect(exported.length).toBeGreaterThan(0);

      await adapter.shutdown();
    });

    test('processes metric events', async () => {
      const exported: unknown[] = [];
      const adapter = createOpenTelemetryAdapter({
        export: async (result) => {
          exported.push(result);
        },
        batchSize: 1,
      });

      const metric: ObservabilityEvent = {
        type: 'metric',
        kind: 'counter',
        name: 'test.counter',
        value: 42,
        timestamp: Date.now(),
      };

      adapter.process(metric);
      await adapter.flush();

      expect(exported.length).toBeGreaterThan(0);

      await adapter.shutdown();
    });

    test('processes log events', async () => {
      const exported: unknown[] = [];
      const adapter = createOpenTelemetryAdapter({
        export: async (result) => {
          exported.push(result);
        },
        batchSize: 1,
      });

      const log: ObservabilityEvent = {
        type: 'log',
        level: 'info',
        message: 'Test log',
        timestamp: Date.now(),
      };

      adapter.process(log);
      await adapter.flush();

      expect(exported.length).toBeGreaterThan(0);

      await adapter.shutdown();
    });

    test('handles span errors', async () => {
      const exported: unknown[] = [];
      const adapter = createOpenTelemetryAdapter({
        export: async (result) => {
          exported.push(result);
        },
        batchSize: 2,
      });

      const spanStart: ObservabilityEvent = {
        type: 'span.start',
        spanId: '1234567890abcdef',
        traceId: '1234567890abcdef1234567890abcdef',
        operation: 'test.operation',
        timestamp: Date.now(),
      };

      const spanEnd: ObservabilityEvent = {
        type: 'span.end',
        spanId: '1234567890abcdef',
        duration: 100,
        status: 'error',
        timestamp: Date.now(),
        error: {
          type: 'Error',
          message: 'Test error',
          stack: 'Error: Test error\n  at test.ts:10',
        },
      };

      adapter.process(spanStart);
      adapter.process(spanEnd);
      await adapter.flush();

      expect(exported.length).toBeGreaterThan(0);

      await adapter.shutdown();
    });
  });

  describe('Prometheus Adapter', () => {
    test('aggregates counter metrics', () => {
      const adapter = createPrometheusAdapter();

      const metric: ObservabilityEvent = {
        type: 'metric',
        kind: 'counter',
        name: 'test.counter',
        value: 10,
        timestamp: Date.now(),
      };

      adapter.process(metric);
      adapter.process(metric);

      const metrics = adapter.getMetrics();
      const counter = metrics.find((m) => m.name === 'test_counter');

      expect(counter).toBeDefined();
      expect(counter?.samples[0]?.value).toBe(20);
    });

    test('tracks gauge metrics', () => {
      const adapter = createPrometheusAdapter();

      const metric1: ObservabilityEvent = {
        type: 'metric',
        kind: 'gauge',
        name: 'test.gauge',
        value: 100,
        timestamp: Date.now(),
      };

      const metric2: ObservabilityEvent = {
        type: 'metric',
        kind: 'gauge',
        name: 'test.gauge',
        value: 200,
        timestamp: Date.now(),
      };

      adapter.process(metric1);
      adapter.process(metric2);

      const metrics = adapter.getMetrics();
      const gauge = metrics.find((m) => m.name === 'test_gauge');

      expect(gauge).toBeDefined();
      expect(gauge?.samples[0]?.value).toBe(200); // Last value wins
    });

    test('creates histogram buckets', () => {
      const adapter = createPrometheusAdapter({
        histogramBuckets: [1, 5, 10],
      });

      const metric: ObservabilityEvent = {
        type: 'metric',
        kind: 'histogram',
        name: 'test.histogram',
        value: 3,
        timestamp: Date.now(),
      };

      adapter.process(metric);

      const metrics = adapter.getMetrics();
      const buckets = metrics.filter((m) => m.name === 'test_histogram_bucket');

      expect(buckets.length).toBeGreaterThan(0);
    });

    test('formats metrics in Prometheus text format', () => {
      const adapter = createPrometheusAdapter();

      const metric: ObservabilityEvent = {
        type: 'metric',
        kind: 'counter',
        name: 'test.counter',
        value: 42,
        timestamp: Date.now(),
      };

      adapter.process(metric);

      const text = adapter.format();

      expect(text).toContain('# HELP');
      expect(text).toContain('# TYPE');
      expect(text).toContain('test_counter');
      expect(text).toContain('42');
    });

    test('supports metric labels', () => {
      const adapter = createPrometheusAdapter();

      const metric: ObservabilityEvent = {
        type: 'metric',
        kind: 'counter',
        name: 'http.requests',
        value: 1,
        labels: {
          method: 'GET',
          status: '200',
        },
        timestamp: Date.now(),
      };

      adapter.process(metric);

      const text = adapter.format();

      expect(text).toContain('method="GET"');
      expect(text).toContain('status="200"');
    });

    test('reset clears all metrics', () => {
      const adapter = createPrometheusAdapter();

      const metric: ObservabilityEvent = {
        type: 'metric',
        kind: 'counter',
        name: 'test.counter',
        value: 42,
        timestamp: Date.now(),
      };

      adapter.process(metric);
      expect(adapter.getMetrics().length).toBeGreaterThan(0);

      adapter.reset();
      expect(adapter.getMetrics()).toHaveLength(0);
    });
  });

  describe('StatsD Adapter', () => {
    test('formats counter metrics', () => {
      const packets: string[] = [];
      const adapter = createStatsDAdapter({
        send: (packet) => packets.push(packet),
      });

      const metric: ObservabilityEvent = {
        type: 'metric',
        kind: 'counter',
        name: 'test.counter',
        value: 42,
        timestamp: Date.now(),
      };

      adapter.process(metric);

      expect(packets.length).toBeGreaterThan(0);
      expect(packets[0]).toContain('test_counter:42|c');
    });

    test('formats gauge metrics', () => {
      const packets: string[] = [];
      const adapter = createStatsDAdapter({
        send: (packet) => packets.push(packet),
      });

      const metric: ObservabilityEvent = {
        type: 'metric',
        kind: 'gauge',
        name: 'test.gauge',
        value: 100,
        timestamp: Date.now(),
      };

      adapter.process(metric);

      expect(packets.length).toBeGreaterThan(0);
      expect(packets[0]).toContain('test_gauge:100|g');
    });

    test('formats histogram metrics', () => {
      const packets: string[] = [];
      const adapter = createStatsDAdapter({
        send: (packet) => packets.push(packet),
      });

      const metric: ObservabilityEvent = {
        type: 'metric',
        kind: 'histogram',
        name: 'test.histogram',
        value: 250,
        timestamp: Date.now(),
      };

      adapter.process(metric);

      expect(packets.length).toBeGreaterThan(0);
      expect(packets[0]).toContain('test_histogram:250|h');
    });

    test('includes DogStatsD tags', () => {
      const packets: string[] = [];
      const adapter = createStatsDAdapter({
        send: (packet) => packets.push(packet),
        useDogStatsD: true,
      });

      const metric: ObservabilityEvent = {
        type: 'metric',
        kind: 'counter',
        name: 'test.counter',
        value: 1,
        labels: {
          environment: 'production',
          service: 'api',
        },
        timestamp: Date.now(),
      };

      adapter.process(metric);

      expect(packets[0]).toContain('|#');
      expect(packets[0]).toContain('environment:production');
      expect(packets[0]).toContain('service:api');
    });

    test('applies metric prefix', () => {
      const packets: string[] = [];
      const adapter = createStatsDAdapter({
        send: (packet) => packets.push(packet),
        prefix: 'myapp.',
      });

      const metric: ObservabilityEvent = {
        type: 'metric',
        kind: 'counter',
        name: 'requests',
        value: 1,
        timestamp: Date.now(),
      };

      adapter.process(metric);

      expect(packets[0]).toContain('myapp.requests');
    });
  });

  describe('Structured Log Adapter', () => {
    test('converts events to structured logs', () => {
      const logs: string[] = [];
      const adapter = createStructuredLogAdapter({
        output: (log) => logs.push(log),
      });

      const event: ObservabilityEvent = {
        type: 'log',
        level: 'info',
        message: 'Test message',
        timestamp: Date.now(),
      };

      adapter.process(event);

      expect(logs.length).toBeGreaterThan(0);

      const parsed = JSON.parse(logs[0]!);
      expect(parsed.level).toBe('info');
      expect(parsed.msg).toBe('Test message');
    });

    test('converts span events to logs', () => {
      const logs: string[] = [];
      const adapter = createStructuredLogAdapter({
        output: (log) => logs.push(log),
      });

      const spanStart: ObservabilityEvent = {
        type: 'span.start',
        spanId: '1234567890abcdef',
        traceId: '1234567890abcdef1234567890abcdef',
        operation: 'test.operation',
        timestamp: Date.now(),
      };

      adapter.process(spanStart);

      expect(logs.length).toBeGreaterThan(0);

      const parsed = JSON.parse(logs[0]!);
      expect(parsed.event_type).toBe('span.start');
      expect(parsed.trace_id).toBe('1234567890abcdef1234567890abcdef');
    });

    test('converts metric events to logs', () => {
      const logs: string[] = [];
      const adapter = createStructuredLogAdapter({
        output: (log) => logs.push(log),
      });

      const metric: ObservabilityEvent = {
        type: 'metric',
        kind: 'counter',
        name: 'test.counter',
        value: 42,
        timestamp: Date.now(),
      };

      adapter.process(metric);

      expect(logs.length).toBeGreaterThan(0);

      const parsed = JSON.parse(logs[0]!);
      expect(parsed.event_type).toBe('metric');
      expect(parsed.metric_name).toBe('test.counter');
      expect(parsed.metric_value).toBe(42);
    });

    test('supports different log formats', () => {
      const logs: string[] = [];
      const adapter = createStructuredLogAdapter({
        format: 'pino',
        output: (log) => logs.push(log),
      });

      const event: ObservabilityEvent = {
        type: 'log',
        level: 'info',
        message: 'Test',
        timestamp: Date.now(),
      };

      adapter.process(event);

      expect(logs.length).toBeGreaterThan(0);

      const parsed = JSON.parse(logs[0]!);
      expect(parsed.level).toBe(30); // Pino uses numeric levels
    });

    test('filters by minimum log level', () => {
      const logs: string[] = [];
      const adapter = createStructuredLogAdapter({
        minLevel: 'warn',
        output: (log) => logs.push(log),
      });

      const debug: ObservabilityEvent = {
        type: 'log',
        level: 'debug',
        message: 'Debug message',
        timestamp: Date.now(),
      };

      const warn: ObservabilityEvent = {
        type: 'log',
        level: 'warn',
        message: 'Warning message',
        timestamp: Date.now(),
      };

      adapter.process(debug);
      adapter.process(warn);

      expect(logs).toHaveLength(1); // Only warn should be logged
    });
  });

  describe('Axiom Adapter', () => {
    test('processes events without errors', async () => {
      // Note: This would need mocking in real tests
      // For now, just test that it doesn't throw
      const adapter = createAxiomAdapter({
        token: 'test-token',
        dataset: 'test-dataset',
        batchSize: 1000, // Large batch to avoid auto-flush
      });

      const event: ObservabilityEvent = {
        type: 'log',
        level: 'info',
        message: 'Test message',
        timestamp: Date.now(),
      };

      // Process event (won't actually send without real token)
      adapter.process(event);

      await adapter.shutdown();
    });

    test('converts span events to Axiom format', () => {
      const adapter = createAxiomAdapter({
        token: 'test-token',
        dataset: 'test-dataset',
        batchSize: 1000,
        transform: (event) => {
          // Just return the event to test conversion
          return {
            _time: new Date(event.timestamp).toISOString(),
            event_type: event.type,
          };
        },
      });

      const spanStart: ObservabilityEvent = {
        type: 'span.start',
        spanId: '1234567890abcdef',
        traceId: '1234567890abcdef1234567890abcdef',
        operation: 'test.operation',
        timestamp: Date.now(),
      };

      adapter.process(spanStart);
      // No errors expected
    });
  });

  describe('Adapter Integration', () => {
    test('multiple adapters can process same events', () => {
      const consoleOutputs: string[] = [];
      const consoleAdapter = createConsoleAdapter({
        output: (line) => consoleOutputs.push(line),
        colors: false,
      });

      const prometheusAdapter = createPrometheusAdapter();

      const statsdPackets: string[] = [];
      const statsdAdapter = createStatsDAdapter({
        send: (packet) => statsdPackets.push(packet),
      });

      const event: ObservabilityEvent = {
        type: 'metric',
        kind: 'counter',
        name: 'test.counter',
        value: 42,
        timestamp: Date.now(),
      };

      // Process with all adapters
      consoleAdapter(event);
      prometheusAdapter.process(event);
      statsdAdapter.process(event);

      // Verify each adapter processed the event
      expect(consoleOutputs.length).toBeGreaterThan(0);
      expect(prometheusAdapter.getMetrics().length).toBeGreaterThan(0);
      expect(statsdPackets.length).toBeGreaterThan(0);
    });
  });
});
