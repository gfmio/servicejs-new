# @servicejs/capability-lifecycle

Lifecycle and graceful shutdown capability for ServiceJS - platform-agnostic application lifecycle management.

## Features

- **No Ambient Authority** - Lifecycle management is explicitly granted via capabilities
- **Platform Agnostic** - Same interface works across Node.js, browser, Deno, edge runtimes
- **Type Safe** - Full TypeScript support with Result types
- **Graceful Shutdown** - Coordinated cleanup of resources on application exit
- **Never Throws** - All operations return `Result<T, E>` instead of throwing exceptions
- **LIFO Execution** - Handlers run in reverse registration order (last in, first out)
- **Async Support** - Handlers can be synchronous or asynchronous

## Installation

```bash
bun add @servicejs/capability-lifecycle
```

## Usage

### Basic Shutdown Handling

```typescript
import { createInMemoryLifecycle } from '@servicejs/capability-lifecycle';
import { isOk } from '@servicejs/result';

const lifecycle = createInMemoryLifecycle();

// Register cleanup handlers
const result = lifecycle.onShutdown(async (signal) => {
  console.log(`Shutting down: ${signal.reason}`);
  console.log(`Timestamp: ${new Date(signal.timestamp).toISOString()}`);

  // Cleanup resources
  await database.close();
  await cache.disconnect();
});

if (isOk(result)) {
  const unregister = result.value;

  // Later, if needed:
  // unregister(); // Remove this handler
}

// Trigger shutdown
await lifecycle.shutdown('User requested shutdown');
```

### In Production (Node.js)

```typescript
import { bootstrap } from '@servicejs/runtime-node';

const runtime = bootstrap({
  captureShutdownSignals: true,
  signals: ['SIGINT', 'SIGTERM'],
});

// Register cleanup for database
runtime.lifecycle.onShutdown(async (signal) => {
  runtime.console.log('Closing database connection...');
  await database.close();
  runtime.console.log('Database closed');
});

// Register cleanup for cache
runtime.lifecycle.onShutdown(async (signal) => {
  runtime.console.log('Disconnecting from cache...');
  await cache.disconnect();
  runtime.console.log('Cache disconnected');
});

// Handlers will run automatically on SIGINT/SIGTERM
// Or manually trigger shutdown:
// await runtime.lifecycle.shutdown('Manual shutdown');
```

## API

### LifecycleCapability

```typescript
interface LifecycleCapability {
  onShutdown(handler: ShutdownHandler): Result<UnregisterFn, LifecycleError>;
  shutdown(reason?: string): Promise<Result<void, LifecycleError>>;
  isShuttingDown(): boolean;
}
```

### Types

```typescript
type ShutdownHandler = (signal: ShutdownSignal) => Promise<void> | void;
type UnregisterFn = () => void;

interface ShutdownSignal {
  readonly reason: string;
  readonly signal?: string;      // e.g., 'SIGTERM', 'SIGINT'
  readonly timestamp: number;
}

interface LifecycleError {
  readonly code: 'ALREADY_SHUTDOWN' | 'HANDLER_ERROR';
  readonly message: string;
}
```

## Methods

### `onShutdown(handler): Result<UnregisterFn, LifecycleError>`

Register a shutdown handler to run during graceful shutdown.

**Execution Order**: Handlers run in **LIFO order** (Last In, First Out) - the last registered handler runs first. This allows you to register handlers in dependency order.

```typescript
const result = lifecycle.onShutdown(async (signal) => {
  console.log('Cleaning up...');
  await cleanupResources();
});

if (isOk(result)) {
  const unregister = result.value;

  // Remove handler if needed
  unregister();
}
```

**Error**: Returns `Err` with code `'ALREADY_SHUTDOWN'` if shutdown has already completed.

### `shutdown(reason?): Promise<Result<void, LifecycleError>>`

Trigger graceful shutdown and run all registered handlers.

```typescript
const result = await lifecycle.shutdown('Application exit');

if (isOk(result)) {
  console.log('Shutdown complete');
} else {
  console.error('Shutdown error:', result.error);
}
```

**Execution**:
1. Sets `isShuttingDown()` to `true`
2. Calls all handlers in reverse registration order
3. Waits for async handlers to complete
4. Catches and logs errors from handlers (doesn't propagate)
5. Sets shutdown as complete
6. Returns `Ok(void)` or `Err` if already shutdown

**Error**: Returns `Err` with code `'ALREADY_SHUTDOWN'` if shutdown was already called.

### `isShuttingDown(): boolean`

Check if shutdown is currently in progress.

```typescript
if (lifecycle.isShuttingDown()) {
  console.log('Currently shutting down, rejecting new requests');
}
```

## Examples

### Graceful Resource Cleanup

```typescript
import { createInMemoryLifecycle } from '@servicejs/capability-lifecycle';

const lifecycle = createInMemoryLifecycle();

// Simulate resources
const resources = {
  database: { connected: true },
  cache: { connected: true },
  queue: { connected: true },
};

// Register cleanup handlers
lifecycle.onShutdown(async (signal) => {
  console.log(`Shutdown: ${signal.reason}`);
  console.log('Closing database...');
  resources.database.connected = false;
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log('Database closed');
});

lifecycle.onShutdown(async (signal) => {
  console.log('Disconnecting cache...');
  resources.cache.connected = false;
  await new Promise(resolve => setTimeout(resolve, 50));
  console.log('Cache disconnected');
});

lifecycle.onShutdown(async (signal) => {
  console.log('Stopping queue...');
  resources.queue.connected = false;
  await new Promise(resolve => setTimeout(resolve, 75));
  console.log('Queue stopped');
});

// Trigger shutdown
await lifecycle.shutdown('User requested shutdown');

// All resources are now disconnected
```

### Handler Execution Order (LIFO)

Handlers run in **reverse** order of registration:

```typescript
const lifecycle = createInMemoryLifecycle();
const order: number[] = [];

lifecycle.onShutdown(async () => order.push(1)); // Runs 3rd
lifecycle.onShutdown(async () => order.push(2)); // Runs 2nd
lifecycle.onShutdown(async () => order.push(3)); // Runs 1st

await lifecycle.shutdown();

console.log(order); // [3, 2, 1]
```

This is intentional! It allows you to register dependencies in natural order:

```typescript
// Register in dependency order
lifecycle.onShutdown(async () => {
  console.log('1. Close database connection');
  await db.close();
});

lifecycle.onShutdown(async () => {
  console.log('2. Flush pending operations');
  await db.flush(); // This runs BEFORE db.close()
});

lifecycle.onShutdown(async () => {
  console.log('3. Stop accepting new operations');
  acceptingOperations = false; // This runs FIRST
});

// Shutdown order: 3 → 2 → 1
// Perfect! Stop operations, flush pending, then close.
```

### Unregistering Handlers

```typescript
const lifecycle = createInMemoryLifecycle();

const result = lifecycle.onShutdown(async () => {
  console.log('This might not run');
});

if (isOk(result)) {
  const unregister = result.value;

  // Changed our mind, don't run this handler
  unregister();
}

await lifecycle.shutdown();
// Handler was removed, won't run
```

### Cleanup Temporary Files

```typescript
const lifecycle = createInMemoryLifecycle();
const tempFiles: string[] = [];

// Register file cleanup
lifecycle.onShutdown(async () => {
  console.log('Removing temporary files...');
  for (const file of tempFiles) {
    console.log(`  Deleting ${file}`);
    await fs.unlink(file);
  }
  tempFiles.length = 0;
});

// Create temp files during operation
tempFiles.push('/tmp/app-12345.log');
tempFiles.push('/tmp/cache-67890.dat');

// On exit, files are cleaned up
await lifecycle.shutdown('Application exit');
```

### Error Handling in Handlers

Errors in handlers are caught and logged, but don't prevent other handlers from running:

```typescript
const lifecycle = createInMemoryLifecycle();

lifecycle.onShutdown(async () => {
  console.log('Handler 1');
  await cleanResource1();
});

lifecycle.onShutdown(async () => {
  console.log('Handler 2');
  throw new Error('Oops!'); // Error is caught and logged
});

lifecycle.onShutdown(async () => {
  console.log('Handler 3');
  await cleanResource3();
});

await lifecycle.shutdown();
// Output:
// Handler 3
// Handler 2
// Error in shutdown handler: Error: Oops!
// Handler 1
// All handlers run despite error in Handler 2
```

### Preventing Multiple Shutdowns

```typescript
const lifecycle = createInMemoryLifecycle();

lifecycle.onShutdown(async () => {
  console.log('Cleanup running...');
});

const result1 = await lifecycle.shutdown('First shutdown');
console.log(isOk(result1)); // true

const result2 = await lifecycle.shutdown('Second shutdown');
console.log(isErr(result2)); // true
console.log(result2.error.code); // 'ALREADY_SHUTDOWN'
```

### Checking Shutdown State

```typescript
const lifecycle = createInMemoryLifecycle();

// Check before shutdown
console.log(lifecycle.isShuttingDown()); // false

lifecycle.onShutdown(async () => {
  // Check during shutdown
  console.log(lifecycle.isShuttingDown()); // true

  // Reject new operations
  if (lifecycle.isShuttingDown()) {
    rejectNewRequests();
  }
});

await lifecycle.shutdown();

// Check after shutdown
console.log(lifecycle.isShuttingDown()); // false
```

### Integration with Signal Handlers (Node.js)

```typescript
import { bootstrap } from '@servicejs/runtime-node';

const runtime = bootstrap({
  captureShutdownSignals: true,
  signals: ['SIGINT', 'SIGTERM'],
});

runtime.lifecycle.onShutdown(async (signal) => {
  runtime.console.log(`Received ${signal.signal}: ${signal.reason}`);
  runtime.console.log('Cleaning up...');

  // Close server
  await server.close();

  // Disconnect database
  await db.close();

  runtime.console.log('Cleanup complete');
});

// When user presses Ctrl+C or process receives SIGTERM:
// - Signal is captured
// - Handlers run automatically
// - Process exits gracefully
```

## In-Memory Implementation

### createInMemoryLifecycle

Create an in-memory lifecycle capability for testing.

```typescript
function createInMemoryLifecycle(): LifecycleCapability;
```

**Features:**
- Fully functional lifecycle management
- Synchronous and async handler support
- LIFO execution order
- Error handling
- Perfect for unit tests

**Example:**

```typescript
import { test, expect } from 'bun:test';
import { createInMemoryLifecycle } from '@servicejs/capability-lifecycle';

test('cleanup runs on shutdown', async () => {
  const lifecycle = createInMemoryLifecycle();
  let cleaned = false;

  lifecycle.onShutdown(async () => {
    cleaned = true;
  });

  await lifecycle.shutdown();
  expect(cleaned).toBe(true);
});
```

## Platform Implementations

This package provides the interface and in-memory implementation. Platform-specific implementations are provided by runtime packages:

- **@servicejs/runtime-node** - Node.js (captures SIGINT, SIGTERM, etc.)
- **@servicejs/runtime-browser** - Browser (beforeunload event)
- **@servicejs/runtime-deno** - Deno (signal handlers)
- **@servicejs/runtime-cloudflare** - Cloudflare Workers (request-scoped cleanup)

## Design Philosophy

This package follows ServiceJS's capability-based security model:

1. **No Ambient Authority** - Applications don't register global handlers; they receive a capability
2. **Explicit Grants** - Lifecycle management must be explicitly granted by the runtime
3. **Testable** - Easy to substitute with in-memory implementation for deterministic tests
4. **Type Safe** - Full TypeScript support with Result types for error handling
5. **Platform Agnostic** - Same interface across all JavaScript runtimes

## Common Patterns

### Dependency Order with LIFO

Since handlers run in LIFO order, register dependencies from bottom to top:

```typescript
// Bottom layer: database connection
lifecycle.onShutdown(async () => {
  await database.close();
});

// Middle layer: repository that uses database
lifecycle.onShutdown(async () => {
  await repository.flush();
});

// Top layer: HTTP server that uses repository
lifecycle.onShutdown(async () => {
  await server.close();
});

// Shutdown order: server → repository → database ✓
```

### Graceful HTTP Server Shutdown

```typescript
lifecycle.onShutdown(async (signal) => {
  console.log('Stopping HTTP server...');

  // Stop accepting new connections
  server.close();

  // Wait for existing requests to complete (with timeout)
  await Promise.race([
    server.waitForRequests(),
    new Promise(resolve => setTimeout(resolve, 5000)),
  ]);

  console.log('HTTP server stopped');
});
```

### Conditional Cleanup

```typescript
lifecycle.onShutdown(async (signal) => {
  if (signal.signal === 'SIGTERM') {
    // Graceful shutdown requested
    await gracefulCleanup();
  } else if (signal.signal === 'SIGINT') {
    // User interrupt (Ctrl+C)
    await quickCleanup();
  } else {
    // Manual shutdown
    await normalCleanup();
  }
});
```

## License

MIT
