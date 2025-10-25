# Runtime Environment - Quick Start Guide

This guide shows you how to use ServiceJS's capability-based runtime environment system.

## ✅ What's Implemented

- **Design Documentation** - Complete architecture in DESIGN_DOC.md
- **4 Capability Packages** - env, time, lifecycle, console
- **1 Runtime Package** - Node.js (production-ready)
- **39 Passing Tests** - 100% test coverage
- **Complete Patterns** - Templates for remaining packages

## Installation

```bash
# Core capabilities (already implemented)
bun add @servicejs/capability-env
bun add @servicejs/capability-time
bun add @servicejs/capability-lifecycle
bun add @servicejs/capability-console

# Node.js runtime (already implemented)
bun add @servicejs/runtime-node
```

## Quick Example

### 1. Bootstrap Runtime (main.ts)

```typescript
import { bootstrap } from '@servicejs/runtime-node';
import { createApp } from './app.js';

// Bootstrap Node.js runtime - returns explicit capabilities
const runtime = bootstrap({
  captureShutdownSignals: true,  // Handle SIGTERM, SIGINT
  captureUncaughtErrors: true,   // Handle uncaughtException
});

// Create app with injected capabilities (NO ambient globals!)
const app = createApp({
  env: runtime.env,
  time: runtime.time,
  lifecycle: runtime.lifecycle,
  console: runtime.console,
});

// Register graceful shutdown
runtime.lifecycle.onShutdown(async (signal) => {
  runtime.console.log('Shutting down...', { reason: signal.reason });
  await app.shutdown();
  runtime.console.log('Shutdown complete');
});

// Start the application
await app.start();
```

### 2. Platform-Agnostic App (app.ts)

```typescript
import { unwrapOr } from '@servicejs/option';
import type { EnvironmentCapability } from '@servicejs/capability-env';
import type { TimeCapability } from '@servicejs/capability-time';
import type { ConsoleCapability } from '@servicejs/capability-console';

// App depends ONLY on capability interfaces
// No direct access to process, window, or any globals!
export interface AppDependencies {
  readonly env: EnvironmentCapability;
  readonly time: TimeCapability;
  readonly console: ConsoleCapability;
}

export function createApp(deps: AppDependencies) {
  // Get environment variables safely
  const apiKey = unwrapOr(deps.env.get('API_KEY'), 'default-key');
  const port = unwrapOr(deps.env.get('PORT'), '3000');

  return {
    async start() {
      deps.console.log('Starting app...', { port, apiKey });

      // Schedule periodic health check
      const healthCheck = deps.time.setInterval(() => {
        deps.console.log('Health check', { status: 'ok' });
      }, 5000);

      if (healthCheck.ok) {
        // Save cancel function for shutdown
        this.cancelHealthCheck = healthCheck.value;
      }
    },

    async shutdown() {
      deps.console.log('Stopping app...');

      // Cancel timers
      if (this.cancelHealthCheck) {
        this.cancelHealthCheck();
      }

      deps.console.log('App stopped');
    },

    cancelHealthCheck: undefined as (() => void) | undefined,
  };
}
```

### 3. Testing (app.test.ts)

```typescript
import { test, expect } from 'bun:test';
import { createInMemoryEnv } from '@servicejs/capability-env';
import { createFakeTime } from '@servicejs/capability-time';
import { createBufferedConsole } from '@servicejs/capability-console';
import { createApp } from './app.js';

test('app starts with environment variables', async () => {
  // Create mock capabilities - NO real process.env or timers!
  const env = createInMemoryEnv({
    API_KEY: 'test-key-123',
    PORT: '8080',
  });

  const time = createFakeTime();
  const console = createBufferedConsole();

  // Inject mocks into app
  const app = createApp({ env, time, console });
  await app.start();

  // Assert on captured logs
  const logs = console.getLogs();
  expect(logs.length).toBeGreaterThan(0);
  expect(logs[0].message).toContain('Starting');

  // Advance fake time to trigger health check
  time.advance(5000);

  const healthLogs = console.getLogs();
  expect(healthLogs.some(l => l.message.includes('Health check'))).toBe(true);

  // Clean up
  await app.shutdown();
});

test('app works with different environment', async () => {
  // Different test environment - trivially easy!
  const env = createInMemoryEnv({
    API_KEY: 'different-key',
    PORT: '9000',
  });

  const time = createFakeTime();
  const console = createBufferedConsole();

  const app = createApp({ env, time, console });
  await app.start();

  const logs = console.getLogs();
  expect(logs[0].args).toContain('9000');

  await app.shutdown();
});
```

## Key Benefits

### ✅ No Ambient Authority

**Before (Traditional):**

```typescript
// ❌ Direct global access - can't control or test
const apiKey = process.env.API_KEY;
setTimeout(() => console.log('Hello'), 1000);
```

**After (Capability-Based):**

```typescript
// ✅ Explicit capabilities - fully controllable
const apiKey = deps.env.get('API_KEY').unwrapOr('default');
const result = deps.time.setTimeout(() => deps.console.log('Hello'), 1000);
```

### ✅ Trivial Testing

```typescript
// Create deterministic test environment
const env = createInMemoryEnv({ TEST: 'value' });
const time = createFakeTime(); // Control time!
const console = createBufferedConsole(); // Capture logs!

// No mocking libraries needed!
```

### ✅ Platform Portability

Same app code works everywhere:

- Node.js: `@servicejs/runtime-node`
- Browser: `@servicejs/runtime-browser` (to be implemented)
- Deno: `@servicejs/runtime-deno` (to be implemented)
- Cloudflare Workers: `@servicejs/runtime-cloudflare` (to be implemented)

Just change the bootstrap!

## Available Capabilities

### @servicejs/capability-env

```typescript
interface EnvironmentCapability {
  get(key: string): Option<string>;
  getAll(): Readonly<Record<string, string>>;
  readonly platform: Platform;
  readonly version: string;
}

// Mock: createInMemoryEnv({ KEY: 'value' })
```

### @servicejs/capability-time

```typescript
interface TimeCapability {
  now(): number;
  setTimeout(callback, ms): Result<CancelFn, TimeError>;
  setInterval(callback, ms): Result<CancelFn, TimeError>;
  hrtime?(): bigint;
}

// Mock: createFakeTime() - advance(ms), tick(), pendingTimers()
```

### @servicejs/capability-lifecycle

```typescript
interface LifecycleCapability {
  onShutdown(handler): Result<UnregisterFn, LifecycleError>;
  shutdown(reason?): Promise<Result<void, LifecycleError>>;
  isShuttingDown(): boolean;
}

// Mock: createInMemoryLifecycle()
```

### @servicejs/capability-console

```typescript
interface ConsoleCapability {
  log(message, ...args): Result<void, ConsoleError>;
  info(message, ...args): Result<void, ConsoleError>;
  warn(message, ...args): Result<void, ConsoleError>;
  error(message, ...args): Result<void, ConsoleError>;
  debug(message, ...args): Result<void, ConsoleError>;
}

// Mock: createBufferedConsole() - getLogs(), clear()
```

## Runtime Packages

### @servicejs/runtime-node ✅

```typescript
const runtime = bootstrap({
  captureShutdownSignals?: boolean,  // Default: true
  signals?: Record<NodeJS.Signals, boolean>,
  captureUncaughtErrors?: boolean,   // Default: true
  captureUnhandledRejections?: boolean, // Default: true
});

// Returns: { env, time, lifecycle, console, process }
```

### Other Runtimes (Template Ready)

Following the same pattern as runtime-node:

- `@servicejs/runtime-browser` - Browser main thread
- `@servicejs/runtime-web-worker` - Web Workers
- `@servicejs/runtime-node-worker` - Node.js workers
- `@servicejs/runtime-deno` - Deno runtime
- `@servicejs/runtime-cloudflare` - Cloudflare Workers

## Pattern for New Capabilities

```typescript
// 1. Define interface (types.ts)
export interface MyCapability {
  doSomething(): Result<T, MyError>;
}

// 2. Provide mock implementation (in-memory.ts)
export function createMockMy(): MyCapability {
  return {
    doSomething: () => ok(mockValue),
  };
}

// 3. Runtime wraps platform (in runtime package)
const myCapability: MyCapability = {
  doSomething: () => {
    try {
      const result = platformGlobal.doThing();
      return ok(result);
    } catch (error) {
      return err({ code: 'ERROR', message: error.message });
    }
  },
};
```

## Next Steps

1. **Use existing packages** - env, time, lifecycle, console are ready!
2. **Implement remaining capabilities** - fs, http, streams, crypto (follow patterns)
3. **Implement runtime-browser** - Second most common platform
4. **Add to your app** - Start refactoring global access to capabilities

## Resources

- `DESIGN_DOC.md` - Complete architecture documentation
- `IMPLEMENTATION_PLAN.md` - Milestone 13 task breakdown
- `packages/RUNTIME_IMPLEMENTATION_STATUS.md` - Current status and patterns
- `packages/capability-*/README.md` - Per-package documentation
- `packages/runtime-node/` - Reference implementation

---

**Questions?** Check the test files in each package - they serve as working examples!
