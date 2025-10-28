/**
 * Example 2: Multi-Backend Observability
 *
 * Demonstrates:
 * - Sending same events to multiple backends
 * - Console adapter for development
 * - Prometheus adapter for metrics
 * - In-memory storage for testing/debugging
 */

import {
  createInMemoryObservability,
  createConsoleAdapter,
  createPrometheusAdapter,
  createEventBuffer,
  type ObservabilityEvent,
} from '../src/index.js';

// Create observability capability
const obs = createInMemoryObservability();

// Create multiple adapters
const consoleAdapter = createConsoleAdapter({ colors: true, timestamps: false });
const prometheusAdapter = createPrometheusAdapter({
  prefix: 'myapp_',
  defaultLabels: { service: 'example', env: 'dev' },
});
const eventBuffer = createEventBuffer({ maxSize: 1000 });

// Forward events to all backends
const originalEmit = obs.emit;
obs.emit = (event: ObservabilityEvent) => {
  originalEmit(event);
  consoleAdapter(event);
  prometheusAdapter.process(event);
  eventBuffer.add(event);
};

console.log('\n=== Running Application with Multi-Backend Observability ===\n');

// Simulate some activity
for (let i = 0; i < 5; i++) {
  obs.withSpan('handle.request', () => {
    obs.counter('requests.total', 1, { endpoint: '/api/users' });

    const duration = 50 + Math.random() * 200;
    obs.histogram('request.duration', duration, { endpoint: '/api/users' });

    if (Math.random() > 0.8) {
      obs.counter('requests.errors', 1, { endpoint: '/api/users' });
      obs.log('error', 'Request failed', { endpoint: '/api/users', error: 'timeout' });
    } else {
      obs.log('info', 'Request succeeded', { endpoint: '/api/users' });
    }
  });
}

// Output Prometheus metrics
console.log('\n=== Prometheus Metrics ===\n');
const metrics = prometheusAdapter.getMetrics();
console.log(metrics);

// Output event buffer statistics
console.log('\n=== Event Buffer Statistics ===\n');
const events = eventBuffer.getEvents();
console.log(`Total events: ${events.length}`);
console.log(`Spans: ${events.filter((e) => e.type === 'span.start').length}`);
console.log(`Metrics: ${events.filter((e) => e.type === 'metric').length}`);
console.log(`Logs: ${events.filter((e) => e.type === 'log').length}`);

console.log('\n=== Done ===\n');
