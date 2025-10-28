/**
 * Example 1: Basic Observability
 *
 * Demonstrates:
 * - Creating an in-memory observability capability
 * - Manual span creation
 * - Recording metrics
 * - Logging
 * - Console adapter for output
 */

import {
  createInMemoryObservability,
  createConsoleAdapter,
  type ObservabilityCapability,
} from '../src/index.js';

// Create console adapter to see output
const consoleAdapter = createConsoleAdapter({
  colors: true,
  pretty: true,
  timestamps: true,
});

// Create observability capability
const obs: ObservabilityCapability = createInMemoryObservability();

// Forward all events to console
const originalEmit = obs.emit;
obs.emit = (event) => {
  originalEmit(event);
  consoleAdapter(event);
};

// Example: Process a request
console.log('\n=== Processing Request ===\n');

obs.withSpan('process.request', () => {
  // Log start
  obs.log('info', 'Processing request', { requestId: '123' });

  // Record metric
  obs.counter('requests.count', 1);

  // Simulate work
  const startTime = Date.now();

  // Nested span for database query
  obs.withSpan('db.query', () => {
    obs.log('debug', 'Querying database', { table: 'users' });

    // Simulate query time
    const queryTime = 50 + Math.random() * 100;
    obs.histogram('db.query.duration', queryTime);
  });

  // Record processing duration
  const duration = Date.now() - startTime;
  obs.histogram('request.duration', duration);

  obs.log('info', 'Request processed successfully');
});

console.log('\n=== Done ===\n');
