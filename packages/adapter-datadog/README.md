# @servicejs/adapter-datadog

Datadog adapter for metrics collection, logging, and APM tracing.

## Features

- **Custom Metrics**: Gauge, counter, histogram, and distribution metrics
- **Structured Logging**: Debug, info, warn, error levels with attributes
- **APM Tracing**: Distributed tracing with spans
- **Tags & Dimensions**: Custom tags for filtering and aggregation
- **Type-Safe API**: Full TypeScript support with Result types

## Installation

```bash
npm install @servicejs/adapter-datadog
```

## Basic Usage

```typescript
import { createDatadogAdapter } from '@servicejs/adapter-datadog';

const adapter = createDatadogAdapter();

await adapter.init({
  apiKey: 'your-api-key',
  service: 'my-app',
  env: 'production',
  tags: ['team:backend']
});

// Send metrics
await adapter.gauge('system.cpu.usage', 75.5);
await adapter.increment('api.requests');

// Log messages
await adapter.info('User logged in', { userId: '123' });

// APM tracing
const span = await adapter.startSpan('db.query', 'my-service', 'SELECT *');
await adapter.finishSpan(span.value.spanId);
```

## API Reference

### Configuration

```typescript
interface DatadogConfig {
  apiKey: string;         // Datadog API key
  appKey?: string;        // App key (optional)
  site?: string;          // e.g., 'datadoghq.com'
  service?: string;       // Service name
  env?: string;           // Environment
  tags?: string[];        // Default tags
}
```

### Metrics

- `sendMetric(name, value, type?, tags?)` - Send any metric type
- `gauge(name, value, tags?)` - Current value
- `increment(name, value?, tags?)` - Counter
- `histogram(name, value, tags?)` - Value distribution
- `distribution(name, value, tags?)` - Global distribution

### Logging

- `log(level, message, attributes?)` - Log with custom level
- `debug(message, attributes?)` - Debug level
- `info(message, attributes?)` - Info level
- `warn(message, attributes?)` - Warning level
- `error(message, attributes?)` - Error level

### APM Tracing

- `startSpan(name, service, resource, tags?)` - Start trace span
- `finishSpan(spanId)` - Complete span
- `getSpans(limit?)` - Retrieve completed spans

### Query

- `getMetrics(limit?)` - Retrieve sent metrics
- `getLogs(limit?)` - Retrieve logs

## Examples

See the `examples/` directory:
- `basic.ts` - Metrics and logging
- `apm.ts` - APM tracing
- `monitoring.ts` - System monitoring

## License

MIT
