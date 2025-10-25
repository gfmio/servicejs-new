# @servicejs/capability-console

Console logging capability for ServiceJS - platform-agnostic logging interface.

## Features

- **No Ambient Authority** - Console access is explicitly granted via capabilities
- **Platform Agnostic** - Same interface works across Node.js, browser, Deno, edge runtimes
- **Type Safe** - Full TypeScript support with Result types
- **Test Friendly** - Buffered implementation captures logs for assertions
- **Never Throws** - All operations return `Result<T, E>` instead of throwing exceptions
- **Multiple Levels** - log, info, warn, error, debug

## Installation

```bash
bun add @servicejs/capability-console
```

## Usage

### In Tests

```typescript
import { createBufferedConsole } from '@servicejs/capability-console';

const console = createBufferedConsole();

// Log messages
console.log('Application started');
console.info('User logged in', { userId: 123 });
console.warn('Deprecated API used');
console.error('Failed to connect', { error: 'ECONNREFUSED' });
console.debug('Request details', { method: 'GET', path: '/api/users' });

// Retrieve logs for assertions
const logs = console.getLogs();
console.log(logs.length); // 5

// Check specific log
const firstLog = logs[0];
console.log(firstLog.level); // 'log'
console.log(firstLog.message); // 'Application started'
console.log(firstLog.timestamp); // Unix timestamp
console.log(firstLog.args); // []

// Clear buffer
console.clear();
console.log(console.getLogs().length); // 0
```

### In Production

```typescript
import { bootstrap } from '@servicejs/runtime-node';

const runtime = bootstrap();

// Log at different levels
runtime.console.log('Server started on port 3000');
runtime.console.info('Connected to database');
runtime.console.warn('High memory usage detected');
runtime.console.error('Failed to process request', { requestId: '123' });
runtime.console.debug('Cache hit', { key: 'user:42' });
```

## API

### ConsoleCapability

```typescript
interface ConsoleCapability {
  log(message: string, ...args: unknown[]): Result<void, ConsoleError>;
  info(message: string, ...args: unknown[]): Result<void, ConsoleError>;
  warn(message: string, ...args: unknown[]): Result<void, ConsoleError>;
  error(message: string, ...args: unknown[]): Result<void, ConsoleError>;
  debug(message: string, ...args: unknown[]): Result<void, ConsoleError>;
}
```

### Types

```typescript
type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly args: readonly unknown[];
  readonly timestamp: number;
}

interface ConsoleError {
  readonly code: 'WRITE_ERROR';
  readonly message: string;
}
```

## Methods

All methods follow the same pattern:

```typescript
log(message: string, ...args: unknown[]): Result<void, ConsoleError>
info(message: string, ...args: unknown[]): Result<void, ConsoleError>
warn(message: string, ...args: unknown[]): Result<void, ConsoleError>
error(message: string, ...args: unknown[]): Result<void, ConsoleError>
debug(message: string, ...args: unknown[]): Result<void, ConsoleError>
```

**Parameters:**
- `message` - Main log message
- `...args` - Additional data to log (objects, numbers, etc.)

**Returns:** `Result<void, ConsoleError>`

**Example:**

```typescript
import { isOk } from '@servicejs/result';

const result = console.log('User action', { action: 'login', userId: 42 });

if (isOk(result)) {
  // Logged successfully
} else {
  // Handle error (unlikely with buffered/no-op implementations)
  console.error('Failed to log:', result.error);
}
```

## Buffered Console Implementation

### createBufferedConsole

Create a buffered console that captures all log messages for testing.

```typescript
function createBufferedConsole(): BufferedConsoleCapability;
```

**Features:**
- Captures all log messages in memory
- Provides access to log history
- Includes timestamps and argument details
- Can be cleared for test isolation

**Extended Interface:**

```typescript
interface BufferedConsoleCapability extends ConsoleCapability {
  getLogs(): readonly LogEntry[];
  clear(): void;
}
```

**Example:**

```typescript
import { createBufferedConsole } from '@servicejs/capability-console';

const console = createBufferedConsole();

console.log('Message 1');
console.info('Message 2', { data: 'value' });
console.warn('Message 3');

// Get all logs
const logs = console.getLogs();
console.log(logs.length); // 3

// Inspect first log
const first = logs[0];
console.log(first.level); // 'log'
console.log(first.message); // 'Message 1'
console.log(first.args); // []
console.log(new Date(first.timestamp)); // Log timestamp

// Clear for next test
console.clear();
```

## No-Op Console Implementation

### createNoOpConsole

Create a no-op console that discards all log messages.

```typescript
function createNoOpConsole(): ConsoleCapability;
```

**Use cases:**
- Silent mode / production builds
- Disabling logging
- Performance testing (eliminate logging overhead)
- Security sandboxing

**Example:**

```typescript
import { createNoOpConsole } from '@servicejs/capability-console';

const console = createNoOpConsole();

console.log('This message is discarded');
console.info('This too');
console.warn('And this');
console.error('Even errors');
console.debug('Debug messages too');

// All messages are silently discarded
// No memory allocated, no performance impact
```

## Examples

### Testing Log Output

```typescript
import { test, expect } from 'bun:test';
import { createBufferedConsole } from '@servicejs/capability-console';

test('application logs startup message', () => {
  const console = createBufferedConsole();

  // Run application with test console
  startApplication(console);

  // Assert logs
  const logs = console.getLogs();
  expect(logs.length).toBe(1);
  expect(logs[0].level).toBe('info');
  expect(logs[0].message).toBe('Application started');
});

function startApplication(console: ConsoleCapability) {
  console.info('Application started');
}
```

### Filtering Logs by Level

```typescript
const console = createBufferedConsole();

console.log('Regular message');
console.info('Info message');
console.warn('Warning message');
console.error('Error message');
console.debug('Debug message');

const logs = console.getLogs();

// Filter errors
const errors = logs.filter(log => log.level === 'error');
console.log(errors.length); // 1

// Filter warnings and errors
const important = logs.filter(log =>
  log.level === 'warn' || log.level === 'error'
);
console.log(important.length); // 2

// Get only debug logs
const debugLogs = logs.filter(log => log.level === 'debug');
console.log(debugLogs.length); // 1
```

### Inspecting Log Arguments

```typescript
const console = createBufferedConsole();

console.log('User action', { action: 'login', userId: 42 });
console.error('API error', { code: 500, message: 'Internal error' });

const logs = console.getLogs();

// First log arguments
const loginLog = logs[0];
console.log(loginLog.args[0]); // { action: 'login', userId: 42 }

// Second log arguments
const errorLog = logs[1];
console.log(errorLog.args[0]); // { code: 500, message: 'Internal error' }
```

### Conditional Logging

```typescript
function createLogger(verbose: boolean): ConsoleCapability {
  return verbose ? createBufferedConsole() : createNoOpConsole();
}

// In test mode - capture logs
const testLogger = createLogger(true);
testLogger.log('Test message');

// In production - silent
const prodLogger = createLogger(false);
prodLogger.log('This is discarded');
```

### Timestamp Analysis

```typescript
const console = createBufferedConsole();

const start = Date.now();
console.log('Start');

await someAsyncOperation();

console.log('End');
const logs = console.getLogs();

const duration = logs[1].timestamp - logs[0].timestamp;
console.log(`Operation took ${duration}ms`);
```

### Multiple Log Levels in Tests

```typescript
test('error handling logs appropriate messages', () => {
  const console = createBufferedConsole();

  try {
    riskyOperation(console);
  } catch (error) {
    handleError(error, console);
  }

  const logs = console.getLogs();

  // Check that error was logged
  const errorLogs = logs.filter(l => l.level === 'error');
  expect(errorLogs.length).toBeGreaterThan(0);

  // Check warning was logged
  const warnLogs = logs.filter(l => l.level === 'warn');
  expect(warnLogs.length).toBeGreaterThan(0);
});
```

### Structured Logging

```typescript
const console = createBufferedConsole();

// Log with structured data
console.info('Request completed', {
  method: 'GET',
  path: '/api/users',
  status: 200,
  duration: 45,
});

console.error('Database error', {
  error: 'CONNECTION_TIMEOUT',
  database: 'postgres',
  retryCount: 3,
});

// Retrieve and analyze
const logs = console.getLogs();
const requestLog = logs[0];

console.log(requestLog.args[0]);
// {
//   method: 'GET',
//   path: '/api/users',
//   status: 200,
//   duration: 45
// }
```

### Clearing Between Tests

```typescript
describe('MyService', () => {
  let console: BufferedConsoleCapability;

  beforeEach(() => {
    console = createBufferedConsole();
  });

  test('logs startup', () => {
    const service = new MyService(console);
    service.start();

    expect(console.getLogs()[0].message).toBe('Service started');
  });

  test('logs shutdown', () => {
    const service = new MyService(console);
    service.shutdown();

    expect(console.getLogs()[0].message).toBe('Service stopped');
  });

  // Each test gets fresh console (no cleanup needed)
});
```

### Silent Mode Example

```typescript
// Configuration
const config = {
  logLevel: process.env.LOG_LEVEL || 'silent',
};

// Create appropriate logger
const console = config.logLevel === 'silent'
  ? createNoOpConsole()
  : createBufferedConsole();

// Use console normally
console.log('This may or may not be logged');
console.error('Errors too');

// In silent mode, no memory is used
// In verbose mode, logs can be retrieved for debugging
```

## Platform Implementations

This package provides the interface and test implementations. Platform-specific implementations are provided by runtime packages:

- **@servicejs/runtime-node** - Node.js (console.log, console.error, etc.)
- **@servicejs/runtime-browser** - Browser (console API)
- **@servicejs/runtime-deno** - Deno (console API)
- **@servicejs/runtime-cloudflare** - Cloudflare Workers (console API)

## Design Philosophy

This package follows ServiceJS's capability-based security model:

1. **No Ambient Authority** - Applications don't access console directly; they receive a capability
2. **Explicit Grants** - Console access must be explicitly granted by the runtime
3. **Testable** - Easy to substitute with buffered implementation for assertions
4. **Type Safe** - Full TypeScript support with Result types for error handling
5. **Platform Agnostic** - Same interface across all JavaScript runtimes

## Best Practices

### Inject Console as Dependency

```typescript
// ✅ Good: Console injected as capability
class UserService {
  constructor(private console: ConsoleCapability) {}

  async createUser(name: string) {
    this.console.info('Creating user', { name });
    // ...
  }
}

// ❌ Bad: Direct console access
class UserService {
  async createUser(name: string) {
    console.log('Creating user', name);
    // ...
  }
}
```

### Use Structured Logging

```typescript
// ✅ Good: Structured data as arguments
console.info('Request completed', {
  method: 'GET',
  path: '/api/users',
  status: 200,
  duration: 45,
});

// ❌ Bad: String interpolation
console.info(`GET /api/users completed with status 200 in 45ms`);
```

### Test Log Output

```typescript
test('logs error on failure', () => {
  const console = createBufferedConsole();
  const service = new Service(console);

  service.failingOperation();

  const errorLogs = console.getLogs().filter(l => l.level === 'error');
  expect(errorLogs.length).toBe(1);
  expect(errorLogs[0].message).toContain('operation failed');
});
```

## License

MIT
