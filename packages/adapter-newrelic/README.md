# @servicejs/adapter-newrelic

New Relic adapter for APM, infrastructure monitoring, and custom analytics.

## Features

- **APM Transactions**: Web and background transaction monitoring
- **Transaction Segments**: Fine-grained performance tracking
- **Custom Metrics**: Business and application metrics
- **Custom Events**: Track user actions and business events
- **Error Tracking**: Associate errors with transactions
- **Type-Safe API**: Full TypeScript support with Result types

## Installation

```bash
npm install @servicejs/adapter-newrelic
```

## Basic Usage

```typescript
import { createNewRelicAdapter } from '@servicejs/adapter-newrelic';

const adapter = createNewRelicAdapter();

await adapter.init({
  licenseKey: 'your-license-key',
  appName: 'my-app',
  environment: 'production'
});

// Track a transaction
const tx = await adapter.startTransaction('web', 'GET /api/users');
await adapter.addTransactionAttribute(tx.value.id, 'userId', '123');
await adapter.endTransaction(tx.value.id);

// Record custom metrics
await adapter.recordMetric('Custom/Revenue', 1500);
await adapter.incrementMetric('Custom/SignUps');

// Track errors
await adapter.noticeError(new Error('Payment failed'), {
  userId: '123',
  amount: 99.99
});
```

## API Reference

### Configuration

```typescript
interface NewRelicConfig {
  licenseKey: string;         // New Relic license key
  appName: string;            // Application name
  environment?: string;       // e.g., 'production'
  distributedTracing?: boolean;
  logLevel?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
}
```

### Transactions

- `startTransaction(type, name)` - Start web/background transaction
- `endTransaction(id)` - Complete transaction
- `addTransactionAttribute(id, key, value)` - Add custom attributes

### Segments

- `startSegment(txId, name, category)` - Start operation segment
- `endSegment(id)` - Complete segment

### Custom Metrics

- `recordMetric(name, value, attributes?)` - Record metric
- `incrementMetric(name, value?)` - Increment counter

### Custom Events

- `recordEvent(eventType, attributes)` - Record business event

### Error Tracking

- `noticeError(error, attributes?)` - Track error with context

### Query

- `getTransactions(limit?)` - Retrieve transactions
- `getMetrics(limit?)` - Retrieve metrics
- `getEvents(limit?)` - Retrieve events
- `getErrors(limit?)` - Retrieve errors

## Examples

See the `examples/` directory:
- `basic.ts` - Transactions, metrics, and errors
- `transactions.ts` - Detailed transaction tracking
- `custom-events.ts` - Business events and metrics

## License

MIT
