/**
 * Example 3: Distributed Tracing
 *
 * Demonstrates:
 * - Trace context propagation across components
 * - Parent-child span relationships
 * - Reconstructing trace trees
 * - W3C Trace Context format
 */

import {
  createInMemoryObservability,
  createConsoleAdapter,
  injectTraceContext,
  extractTraceContext,
  reconstructTrace,
  createEventBuffer,
} from '../src/index.js';

// Simulated services
interface Message {
  type: string;
  data: unknown;
  _trace?: unknown;
}

// Create observability for each service
const apiObs = createInMemoryObservability();
const dbObs = createInMemoryObservability();
const cacheObs = createInMemoryObservability();

// Shared event buffer to collect all events
const allEvents = createEventBuffer({ maxSize: 1000 });

// Console adapter
const consoleAdapter = createConsoleAdapter({ colors: true, pretty: false });

// Forward all events to console and buffer
[apiObs, dbObs, cacheObs].forEach((obs) => {
  const originalEmit = obs.emit;
  obs.emit = (event) => {
    originalEmit(event);
    consoleAdapter(event);
    allEvents.add(event);
  };
});

console.log('\n=== Distributed Trace Example ===\n');

// API service receives request
apiObs.withSpan('api.handleRequest', (_, apiTrace) => {
  apiObs.log('info', '[API] Received request');

  // Create message with trace context
  const message: Message = {
    type: 'cache.get',
    data: { key: 'user:123' },
  };
  const messageWithTrace = injectTraceContext(message, apiTrace);

  // Send to cache service
  cacheObs.withSpan('cache.get', () => {
    // Extract trace context from message
    const receivedTrace = extractTraceContext(messageWithTrace);
    if (receivedTrace) {
      // Set parent span from extracted context
      cacheObs.log('info', '[Cache] Checking cache', { key: 'user:123' });

      // Cache miss - query database
      const dbMessage: Message = {
        type: 'db.query',
        data: { table: 'users', id: '123' },
      };
      const dbMessageWithTrace = injectTraceContext(dbMessage, receivedTrace);

      // Send to database service
      dbObs.withSpan('db.query', () => {
        const dbTrace = extractTraceContext(dbMessageWithTrace);
        if (dbTrace) {
          dbObs.log('info', '[DB] Querying database', { table: 'users' });
          dbObs.histogram('db.query.duration', 45);
        }
      });

      cacheObs.log('info', '[Cache] Storing in cache');
    }
  });

  apiObs.log('info', '[API] Sending response');
  apiObs.histogram('api.request.duration', 150);
});

// Reconstruct the trace
console.log('\n=== Reconstructing Trace ===\n');
const events = allEvents.getEvents();

// Find all unique trace IDs
const traceIds = new Set<string>();
events.forEach((e) => {
  if ('traceId' in e) {
    traceIds.add(e.traceId);
  }
});

traceIds.forEach((traceId) => {
  const trace = reconstructTrace(events, traceId);
  if (trace) {
    console.log(`\nTrace ID: ${traceId}`);
    console.log(`Duration: ${trace.duration}ms`);
    console.log(`Spans: ${trace.spans.length}`);

    trace.spans.forEach((span) => {
      const indent = span.parentSpanId ? '  ' : '';
      console.log(
        `${indent}- ${span.operation} (${span.duration}ms) [${span.status}]`
      );
    });
  }
});

console.log('\n=== Done ===\n');
