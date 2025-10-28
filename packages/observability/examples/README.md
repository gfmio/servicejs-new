# Observability Examples

This directory contains examples demonstrating various observability features.

## Running Examples

```bash
# From the observability package directory
bun run examples/1-basic-observability.ts
bun run examples/2-multi-backend.ts
bun run examples/3-distributed-tracing.ts
bun run examples/4-testing-with-observability.ts
bun run examples/5-automatic-instrumentation.ts
```

## Examples Overview

### 1. Basic Observability
**File:** `1-basic-observability.ts`

Demonstrates:
- Creating an in-memory observability capability
- Manual span creation with `withSpan()`
- Recording metrics (counters, histograms)
- Structured logging
- Console adapter for pretty output
- Nested spans for hierarchical tracing

### 2. Multi-Backend Observability
**File:** `2-multi-backend.ts`

Demonstrates:
- Sending same events to multiple backends simultaneously
- Console adapter for development visibility
- Prometheus adapter for metrics aggregation
- Event buffer for in-memory storage and debugging
- Exporting Prometheus metrics in text format

### 3. Distributed Tracing
**File:** `3-distributed-tracing.ts`

Demonstrates:
- Trace context propagation across multiple services
- Parent-child span relationships
- W3C Trace Context format (traceparent/tracestate)
- Injecting and extracting trace context from messages
- Reconstructing complete trace trees from events
- Visualizing distributed traces

### 4. Testing with Observability
**File:** `4-testing-with-observability.ts`

Demonstrates:
- Test assertions for observability events
- `assertSpanCreated()` - verify spans were created
- `assertSpanCompleted()` - verify spans completed successfully
- `assertMetricRecorded()` - verify metrics were recorded
- `assertLogEmitted()` - verify logs were emitted
- `assertSpanNesting()` - verify parent-child relationships
- Mock transport for testing message passing
- Comprehensive testing patterns

### 5. Automatic Instrumentation
**File:** `5-automatic-instrumentation.ts`

Demonstrates:
- Zero-config observability through message interception
- `withMessageObservability()` capability wrapper
- Automatic span creation for every message
- Automatic metric emission (counts, latencies)
- Automatic trace context propagation
- Operation names extracted from message types

## Key Concepts

### Events-Based Architecture
All observability data (traces, metrics, logs) are represented as events. This enables:
- Framework-agnostic design
- Multiple backend support
- Easy testing and debugging
- Replay and time-travel capabilities

### Adapters
Adapters consume events and translate them to backend-specific formats:
- **Console** - Pretty-printed output for development
- **OpenTelemetry** - Industry-standard telemetry protocol
- **Prometheus** - Metrics aggregation and scraping
- **StatsD** - UDP/TCP metrics protocol
- **Structured Logs** - JSON logs for aggregation (Bunyan, Pino, Winston)
- **Axiom** - Serverless log analytics

### Testing Utilities
The package includes comprehensive testing support:
- Assertion helpers for all event types
- Mock transport for message testing
- In-memory storage for test verification
- No external dependencies required

## Best Practices

1. **Use withSpan() for operations** - Automatically handles span lifecycle and error status
2. **Propagate trace context** - Enables distributed tracing across components
3. **Use multiple backends** - Send events to console (dev) + Prometheus (prod)
4. **Test your telemetry** - Use assertions to verify observability in tests
5. **Leverage automatic instrumentation** - Wrap capabilities for zero-config telemetry

## Next Steps

- Check out the main README for complete API documentation
- Explore the test files for more usage examples
- Review adapter implementations to understand event processing
