# @servicejs/observability

Events-based observability system for ServiceJS - framework-agnostic tracing, metrics, and logging.

## Features

- **Events-Based Architecture** - All observability data (traces, metrics, logs) are events
- **Framework-Agnostic** - Not tied to OpenTelemetry, Prometheus, StatsD, or any specific backend
- **Multiple Backends** - Send same events to OTel, Prometheus, StatsD simultaneously
- **W3C Trace Context** - Compatible with W3C Trace Context specification
- **Message Interception** - Automatic observability from existing messages
- **Zero-Config Option** - Auto-instrumentation that "just works"
- **Testing-First** - Mock observability for easy testing
- **Event Replay** - Time-travel debugging and retroactive analysis
- **Type-Safe** - Full TypeScript support with Result types

## Installation

```bash
bun add @servicejs/observability
```

## Quick Start

```typescript
import { createInMemoryObservability } from '@servicejs/observability';

// Create observability capability
const obs = createInMemoryObservability({
  resource: {
    'service.name': 'my-service',
    'service.version': '1.0.0',
  },
});

// Create a span
obs.withSpan('process.request', (spanId, traceContext) => {
  // Do work
  obs.info('Processing request');

  // Emit metrics
  obs.counter('requests.processed', 1);
  obs.histogram('request.duration', 42);
});

// Get all events
const events = obs.getEvents();
console.log(events);
```

## Core Concepts

### Events-Based Philosophy

ServiceJS observability uses a **unified events-based approach**. Instead of coupling to specific backends:

- **Spans** are represented as `SpanStartEvent` and `SpanEndEvent`
- **Metrics** are represented as `MetricEvent`
- **Logs** are represented as `LogEvent`
- **Custom events** can be application-specific

Different backends (OpenTelemetry, Prometheus, StatsD) are just **consumers** of the same event stream.

### Event Types

```typescript
// Span events
type SpanStartEvent = {
  type: 'span.start';
  spanId: string;
  parentSpanId?: string;
  traceId: string;
  operation: string;
  timestamp: number;
  attributes?: Record<string, unknown>;
};

type SpanEndEvent = {
  type: 'span.end';
  spanId: string;
  duration: number;
  status: 'ok' | 'error';
  timestamp: number;
  error?: { message: string; stack?: string };
};

// Metric event
type MetricEvent = {
  type: 'metric';
  kind: 'counter' | 'gauge' | 'histogram';
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
};

// Log event
type LogEvent = {
  type: 'log';
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
  timestamp: number;
};
```

## Observability Capability

### In-Memory Observability (Testing)

```typescript
import { createInMemoryObservability } from '@servicejs/observability';

const obs = createInMemoryObservability({
  resource: {
    'service.name': 'test-service',
  },
});

// Emit events
obs.info('Application started');
obs.counter('app.started', 1);

// Get events
const events = obs.getEvents();

// Clear events
obs.clear();
```

### No-Op Observability (Zero Overhead)

```typescript
import { createNoOpObservability } from '@servicejs/observability';

// All operations are no-ops with zero overhead
const obs = createNoOpObservability();

obs.withSpan('operation', () => {
  // Do work - no span is actually created
});
```

### Composite Observability (Multiple Backends)

```typescript
import { createCompositeObservability, createInMemoryObservability } from '@servicejs/observability';

const otelAdapter = createInMemoryObservability();
const prometheusAdapter = createInMemoryObservability();
const consoleAdapter = createConsoleAdapter();

// Send events to all backends
const obs = createCompositeObservability([
  otelAdapter,
  prometheusAdapter,
  consoleAdapter,
]);

obs.info('Event goes to all backends');
```

## Distributed Tracing

### Creating Spans

```typescript
obs.withSpan('database.query', (spanId, traceContext) => {
  // Span automatically starts
  const result = database.query('SELECT * FROM users');

  // Span automatically ends (ok status)
  return result;
});

// Nested spans
obs.withSpan('parent.operation', () => {
  obs.withSpan('child.operation', () => {
    // Child span has parent span ID set
  });
});
```

### Error Handling

```typescript
try {
  obs.withSpan('risky.operation', () => {
    throw new Error('Something went wrong');
  });
} catch (error) {
  // Span ends with error status
  // Error details captured in span end event
}
```

### Span Attributes

```typescript
obs.withSpan(
  'http.request',
  (spanId) => {
    // Do work
  },
  {
    'http.method': 'GET',
    'http.url': '/api/users',
    'http.status_code': 200,
  }
);
```

## Metrics

### Counter

```typescript
// Increment counter
obs.counter('http.requests', 1, { method: 'GET', status: '200' });

// Counter with labels
obs.counter('cache.hits', 1, { cache: 'redis' });
```

### Gauge

```typescript
// Set gauge value
obs.gauge('queue.depth', 42, { queue: 'messages' });

// Memory usage
obs.gauge('memory.usage', process.memoryUsage().heapUsed);
```

### Histogram

```typescript
// Record duration
const start = Date.now();
// ... do work
const duration = Date.now() - start;
obs.histogram('request.duration', duration, { endpoint: '/api/users' });
```

## Logging

### Log Levels

```typescript
obs.debug('Detailed debugging information');
obs.info('Informational message');
obs.warn('Warning message');
obs.error('Error message');
```

### Structured Logging

```typescript
obs.log('info', 'User logged in', {
  userId: '123',
  username: 'alice',
  timestamp: Date.now(),
});
```

### Logs Linked to Spans

```typescript
obs.withSpan('process.request', () => {
  obs.info('Processing started');
  // Log automatically linked to active span
});
```

## Trace Context Propagation

### Message Injection/Extraction

```typescript
import { injectTraceContext, extractTraceContext } from '@servicejs/observability';

// Inject context into message
const message = { type: 'process', data: 'value' };
const messageWithContext = injectTraceContext(message, traceContext);

// Extract context from message
const context = extractTraceContext(messageWithContext);
```

### HTTP Headers

```typescript
import { injectTraceHeaders, extractTraceHeaders } from '@servicejs/observability';

// Inject W3C Trace Context headers
const headers = injectTraceHeaders({}, traceContext);
// headers['traceparent'] = '00-{traceId}-{spanId}-01'
// headers['tracestate'] = 'vendor=value'

// Extract context from headers
const context = extractTraceHeaders(headers);
```

### W3C Trace Context

```typescript
import { generateTraceId, generateSpanId, formatTraceparent } from '@servicejs/observability';

const traceId = generateTraceId(); // 32 hex chars
const spanId = generateSpanId(); // 16 hex chars

const traceparent = formatTraceparent(traceId, spanId, true);
// "00-{traceId}-{spanId}-01"
```

## Message Interception (Zero-Config)

### Capability Wrapper

```typescript
import { withMessageObservability } from '@servicejs/observability';

// Wrap any capability with automatic observability
const instrumentedCap = withMessageObservability(
  originalCapability,
  obs,
  {
    operation: 'process.message',
    emitMetrics: true,
    createSpans: true,
    propagateContext: true,
  }
);

// Every message sent automatically:
// - Creates a span
// - Injects trace context
// - Emits metrics (count, duration)
// - Logs errors
instrumentedCap.send({ type: 'process', data: 'value' });
```

### Component Instrumentation

```typescript
import { withComponentInstrumentation } from '@servicejs/observability';

const instrumented = withComponentInstrumentation(
  component,
  obs,
  {
    serviceName: 'my-service',
    serviceVersion: '1.0.0',
    autoInstrument: true,
    emitMetrics: true,
  }
);

// All messages automatically traced and metered
instrumented.send({ type: 'process' });
```

## Event Storage and Querying

### Event Buffer (Ring Buffer)

```typescript
import { createEventBuffer } from '@servicejs/observability';

const buffer = createEventBuffer({ maxSize: 10000 });

// Add events
buffer.add(event);

// Query events
const spanEvents = buffer.getEvents({ type: 'span.start' });
const traceEvents = buffer.getEvents({ traceId: 'abc123' });
const recentEvents = buffer.getEvents({
  timeRange: { start: Date.now() - 60000, end: Date.now() },
});

// Clear buffer
buffer.clear();
```

### Trace Reconstruction

```typescript
import { reconstructTrace } from '@servicejs/observability';

const events = buffer.getEvents();
const trace = reconstructTrace(events, traceId);

console.log(trace.spans); // Hierarchical span tree
console.log(trace.duration); // Total trace duration
```

### Metric Aggregation

```typescript
import { aggregateMetrics } from '@servicejs/observability';

const stats = aggregateMetrics(events, 'request.duration');

console.log(stats.count); // Number of observations
console.log(stats.sum); // Total
console.log(stats.avg); // Average
console.log(stats.min); // Minimum
console.log(stats.max); // Maximum
```

## Backend Adapters

### Console Adapter

```typescript
import { createConsoleAdapter } from '@servicejs/observability';

const adapter = createConsoleAdapter({
  colors: true,
  pretty: true,
  timestamps: true,
});

// Pretty-print events to console
obs.emit = (event) => {
  adapter(event);
  // Also store or send elsewhere
};
```

## Testing

### Mock Observability

```typescript
import { test, expect } from 'bun:test';
import { createInMemoryObservability } from '@servicejs/observability';

test('component emits correct events', () => {
  const obs = createInMemoryObservability();

  // Test your component
  myComponent(obs);

  // Assert on events
  const events = obs.getEvents();
  expect(events).toHaveLength(3);

  const spans = events.filter((e) => e.type === 'span.start');
  expect(spans[0].operation).toBe('expected.operation');

  const metrics = events.filter((e) => e.type === 'metric');
  expect(metrics[0].value).toBe(42);
});
```

### Event Assertions

```typescript
test('traces are correctly structured', () => {
  const obs = createInMemoryObservability();

  obs.withSpan('parent', () => {
    obs.withSpan('child', () => {});
  });

  const events = obs.getEvents();
  const starts = events.filter((e) => e.type === 'span.start');

  expect(starts).toHaveLength(2);
  expect(starts[1].parentSpanId).toBe(starts[0].spanId);
  expect(starts[1].traceId).toBe(starts[0].traceId);
});
```

## Best Practices

1. **Default Sampling**: Sample everything by default, filter at adapter level
2. **Resource Attributes**: Always set service.name and service.version
3. **Span Attributes**: Add meaningful attributes (user.id, http.method, etc.)
4. **Trace Context**: Propagate context across all boundaries
5. **No-Op Production**: Use no-op observability if overhead matters
6. **Multi-Backend**: Send same events to multiple backends
7. **Event Storage**: Keep recent events in memory for debugging
8. **Testing**: Always use mock observability in tests

## Comparison with Traditional Approaches

### Traditional (OpenTelemetry directly)

```typescript
// Tightly coupled to OTel
const tracer = otel.trace.getTracer('my-service');
const span = tracer.startSpan('operation');
// ... do work
span.end();

// Hard to test, hard to switch backends
```

### ServiceJS Events-Based

```typescript
// Framework-agnostic
observability.withSpan('operation', (spanId) => {
  // ... do work
});

// Easy to test (mock), easy to switch backends
// Same events → OTel, Prometheus, StatsD, custom
```

## Benefits

✅ **Framework-Agnostic** - Not locked into any specific backend
✅ **Multi-Backend** - Same events feed multiple backends simultaneously
✅ **Testing-First** - Mock observability makes testing trivial
✅ **Zero-Config** - Message interception enables automatic instrumentation
✅ **Event Replay** - Time-travel debugging and retroactive metric calculation
✅ **Aligned with ServiceJS** - Everything is messages/events
✅ **Flexible Sampling** - Sample everything by default, filter at adapter level
✅ **Production Ready** - Zero-overhead no-op mode when needed

## Examples

See the `/tests` directory for comprehensive examples of all features.

## API Reference

See TypeScript types for complete API documentation. All types are exported from the main package.

## License

MIT © 2025 ServiceJS Contributors
