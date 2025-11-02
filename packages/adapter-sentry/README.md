# @servicejs/adapter-sentry

Sentry adapter for error tracking and performance monitoring.

## Features

- **Error Tracking**: Capture errors, exceptions, and messages
- **Performance Monitoring**: Track transactions and spans
- **User Context**: Associate errors with user information
- **Breadcrumbs**: Debug trail for error reproduction
- **Tags & Contexts**: Custom metadata for filtering and analysis
- **Type-Safe API**: Full TypeScript support with Result types

## Installation

```bash
npm install @servicejs/adapter-sentry
```

## Basic Usage

```typescript
import { createSentryAdapter } from '@servicejs/adapter-sentry';
import { isOk } from '@servicejs/result';

const adapter = createSentryAdapter();

await adapter.init({
  dsn: 'https://key@o0.ingest.sentry.io/0',
  environment: 'production',
  release: 'my-app@1.0.0'
});

// Capture an error
await adapter.captureError(new Error('Something went wrong'));

// Start performance monitoring
const tx = await adapter.startTransaction('api.request', 'http');
// ... do work ...
await adapter.finishTransaction(tx.value.id);
```

## API Reference

### Configuration

```typescript
interface SentryConfig {
  dsn: string;              // Sentry DSN
  environment?: string;     // e.g., 'production'
  release?: string;         // Release version
  sampleRate?: number;      // 0.0 to 1.0
  tracesSampleRate?: number; // Performance sampling
}
```

### Error Tracking

- `captureError(error, tags?)` - Capture Error objects
- `captureMessage(message, level?, tags?)` - Capture messages
- `captureException(exception, tags?)` - Capture any exception

### Context

- `setUser(user)` - Set user information
- `setTag(key, value)` - Add global tag
- `setContext(name, context)` - Add custom context
- `addBreadcrumb(breadcrumb)` - Add debug breadcrumb

### Performance

- `startTransaction(name, op, tags?)` - Start transaction
- `finishTransaction(id)` - Complete transaction
- `startSpan(txId, op, description?)` - Start span
- `finishSpan(id)` - Complete span

### Query

- `getEvents(limit?)` - Retrieve captured events

## Examples

See the `examples/` directory for complete examples:
- `basic.ts` - Error tracking and user context
- `performance.ts` - Performance monitoring
- `context.ts` - Tags, contexts, and breadcrumbs

## License

MIT
