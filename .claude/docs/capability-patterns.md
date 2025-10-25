# Capability-Based Design Patterns

**Last Updated:** 2025-10-25

---

## Table of Contents

1. [Introduction](#introduction)
2. [Core Capability Concepts](#core-capability-concepts)
3. [Designing Capabilities](#designing-capabilities)
4. [Capability Composition Patterns](#capability-composition-patterns)
5. [Testing Strategies](#testing-strategies)
6. [Integration with Dependency Injection](#integration-with-dependency-injection)
7. [Common Pitfalls and Anti-Patterns](#common-pitfalls-and-anti-patterns)
8. [Real-World Examples](#real-world-examples)

---

## Introduction

Capabilities are the foundation of ServiceJS's security model. They provide:

- **Security by Design**: No ambient authority - components can only access what they're explicitly given
- **Testability**: Easy to mock and substitute implementations
- **Flexibility**: Compose, wrap, filter, and attenuate capabilities
- **Type Safety**: TypeScript ensures capabilities are used correctly

This guide shows you how to design, use, and test capabilities effectively.

---

## Core Capability Concepts

### What is a Capability?

A capability is an **unforgeable reference** that grants access to a resource or operation. In ServiceJS:

```typescript
interface Capability<T> {
  // Methods that provide access to T
}
```

**Key Properties:**
- **Unforgeable**: Can't be created without authorization
- **Transferable**: Can be passed to other components
- **Attenuatable**: Can be restricted before passing on

### Capability vs Traditional API

**Traditional API (ambient authority):**
```typescript
// Anyone can access the file system
import fs from 'fs';

function readConfig() {
  // Implicitly has ALL file system access
  return fs.readFileSync('/etc/config.json');
}
```

**Capability-based API:**
```typescript
// Must be explicitly given file system capability
function readConfig(fs: FileSystemCapability) {
  // Only has access to what 'fs' allows
  return fs.readFile('/etc/config.json');
}
```

**Benefits:**
- ✅ Clear dependencies (visible in function signature)
- ✅ Easy to test (pass mock FS)
- ✅ Easy to restrict (pass attenuated capability)
- ✅ Principle of least privilege

---

## Designing Capabilities

### Step 1: Define the Interface

Start with the operations you need:

```typescript
// Bad: Too broad, too many responsibilities
interface DatabaseCapability {
  query(sql: string): Promise<Result<Row[], DatabaseError>>;
  execute(sql: string): Promise<Result<void, DatabaseError>>;
  migrate(): Promise<Result<void, DatabaseError>>;
  backup(): Promise<Result<void, DatabaseError>>;
  shutdown(): Promise<Result<void, DatabaseError>>;
}

// Good: Focused, single responsibility
interface QueryCapability {
  query(sql: string): Promise<Result<Row[], QueryError>>;
}

interface CommandCapability {
  execute(sql: string): Promise<Result<void, CommandError>>;
}

interface MigrationCapability {
  migrate(): Promise<Result<void, MigrationError>>;
}
```

**Principles:**
- **Single Responsibility**: Each capability should do one thing well
- **Minimal Surface Area**: Expose only what's necessary
- **Clear Errors**: Use Result types with specific error types
- **Composability**: Design for composition, not inheritance

### Step 2: Define Error Types

Capabilities should never throw - use Result types:

```typescript
// Error hierarchy
type FileSystemError =
  | { type: 'ENOENT'; path: string }
  | { type: 'EACCES'; path: string }
  | { type: 'EISDIR'; path: string }
  | { type: 'ENOTDIR'; path: string }
  | { type: 'UNKNOWN'; message: string };

// Capability returns Results
interface FileSystemCapability {
  readFile(path: string): Promise<Result<Uint8Array, FileSystemError>>;
  writeFile(path: string, data: Uint8Array): Promise<Result<void, FileSystemError>>;
}
```

### Step 3: Provide Multiple Implementations

Always provide at least:
1. **Production implementation** (uses real resources)
2. **Test implementation** (in-memory, deterministic)
3. **No-op implementation** (for tests that don't need the capability)

```typescript
// Production (uses real FS)
function createNodeFileSystem(): FileSystemCapability {
  return {
    readFile: async (path) => {
      try {
        const data = await fs.promises.readFile(path);
        return Ok(new Uint8Array(data));
      } catch (error) {
        return Err(mapFSError(error));
      }
    },
    // ...
  };
}

// Test (in-memory)
function createInMemoryFileSystem(
  files: Map<string, Uint8Array> = new Map()
): FileSystemCapability {
  return {
    readFile: async (path) => {
      const data = files.get(path);
      if (!data) {
        return Err({ type: 'ENOENT', path });
      }
      return Ok(data);
    },
    // ...
  };
}

// No-op (for tests that don't need FS)
function createNoOpFileSystem(): FileSystemCapability {
  return {
    readFile: async () => Err({ type: 'UNKNOWN', message: 'No-op FS' }),
    writeFile: async () => Err({ type: 'UNKNOWN', message: 'No-op FS' }),
  };
}
```

### Step 4: Document Usage and Invariants

```typescript
/**
 * File system capability providing read/write access.
 *
 * **Security:** This capability grants full file system access.
 * Consider using `restrictToDirectory()` to limit access.
 *
 * **Thread Safety:** All operations are async and safe to call concurrently.
 *
 * **Error Handling:** All operations return Result types. Never throws.
 *
 * @example
 * ```typescript
 * const fs = createNodeFileSystem();
 * const result = await fs.readFile('/etc/config.json');
 *
 * if (result.ok) {
 *   console.log('Config:', result.value);
 * } else {
 *   console.error('Error:', result.error);
 * }
 * ```
 */
interface FileSystemCapability {
  // ...
}
```

---

## Capability Composition Patterns

### 1. Wrapping (Adapter Pattern)

Add functionality by wrapping an existing capability:

```typescript
// Add logging to any capability
function withLogging<T extends Capability>(
  cap: T,
  logger: ConsoleCapability
): T {
  return new Proxy(cap, {
    get(target, prop) {
      const original = target[prop];
      if (typeof original !== 'function') return original;

      return async (...args: any[]) => {
        logger.log(`Calling ${String(prop)} with`, args);
        const result = await original.apply(target, args);
        logger.log(`Result:`, result);
        return result;
      };
    }
  });
}

// Usage
const fs = withLogging(createNodeFileSystem(), console);
```

### 2. Filtering (Security)

Restrict what can be accessed:

```typescript
// Restrict FS to a specific directory
function restrictToDirectory(
  fs: FileSystemCapability,
  baseDir: string
): FileSystemCapability {
  const resolvePath = (path: string): Result<string, FileSystemError> => {
    const resolved = path.resolve(baseDir, path);
    if (!resolved.startsWith(baseDir)) {
      return Err({ type: 'EACCES', path });
    }
    return Ok(resolved);
  };

  return {
    readFile: async (path) => {
      const resolvedResult = resolvePath(path);
      if (!resolvedResult.ok) return resolvedResult;
      return fs.readFile(resolvedResult.value);
    },
    writeFile: async (path, data) => {
      const resolvedResult = resolvePath(path);
      if (!resolvedResult.ok) return resolvedResult;
      return fs.writeFile(resolvedResult.value, data);
    },
  };
}

// Usage - limit access to /app/data only
const restrictedFS = restrictToDirectory(fs, '/app/data');
```

### 3. Read-Only Attenuation

Remove dangerous operations:

```typescript
// Create read-only version of FS capability
function readOnly(fs: FileSystemCapability): ReadOnlyFileSystemCapability {
  return {
    readFile: fs.readFile.bind(fs),
    exists: fs.exists.bind(fs),
    stat: fs.stat.bind(fs),
    readdir: fs.readdir.bind(fs),
    // writeFile, mkdir, remove NOT exposed
  };
}
```

### 4. Caching

Add caching layer:

```typescript
function withCache<T>(
  cap: { get(key: string): Promise<Result<T, Error>> },
  maxAge: number
): { get(key: string): Promise<Result<T, Error>> } {
  const cache = new Map<string, { value: T; expires: number }>();

  return {
    get: async (key) => {
      const cached = cache.get(key);
      if (cached && cached.expires > Date.now()) {
        return Ok(cached.value);
      }

      const result = await cap.get(key);
      if (result.ok) {
        cache.set(key, {
          value: result.value,
          expires: Date.now() + maxAge
        });
      }
      return result;
    }
  };
}
```

### 5. Rate Limiting

Control access frequency:

```typescript
function withRateLimit<T extends Capability>(
  cap: T,
  requestsPerSecond: number
): T {
  const tokens = requestsPerSecond;
  let available = tokens;
  let lastRefill = Date.now();

  const refill = () => {
    const now = Date.now();
    const elapsed = now - lastRefill;
    const tokensToAdd = (elapsed / 1000) * requestsPerSecond;
    available = Math.min(tokens, available + tokensToAdd);
    lastRefill = now;
  };

  return new Proxy(cap, {
    get(target, prop) {
      const original = target[prop];
      if (typeof original !== 'function') return original;

      return async (...args: any[]) => {
        refill();
        if (available < 1) {
          throw new Error('Rate limit exceeded');
        }
        available -= 1;
        return original.apply(target, args);
      };
    }
  });
}
```

### 6. Retry Logic

Add automatic retries:

```typescript
function withRetry<T extends Capability>(
  cap: T,
  maxRetries: number = 3,
  backoff: number = 1000
): T {
  return new Proxy(cap, {
    get(target, prop) {
      const original = target[prop];
      if (typeof original !== 'function') return original;

      return async (...args: any[]) => {
        let lastError;
        for (let i = 0; i <= maxRetries; i++) {
          try {
            const result = await original.apply(target, args);
            if (result.ok || i === maxRetries) return result;
            lastError = result.error;
          } catch (error) {
            lastError = error;
          }
          await new Promise(resolve => setTimeout(resolve, backoff * Math.pow(2, i)));
        }
        return Err(lastError);
      };
    }
  });
}
```

---

## Testing Strategies

### 1. In-Memory Implementations

The most common testing pattern:

```typescript
import { describe, test, expect } from 'bun:test';
import { createInMemoryFileSystem } from '@servicejs/capability-fs';

describe('Config loader', () => {
  test('loads config from file', async () => {
    // Arrange: Create in-memory FS with test data
    const fs = createInMemoryFileSystem();
    await fs.writeFile('/config.json', new TextEncoder().encode('{"port":3000}'));

    // Act: Use your code with the test capability
    const config = await loadConfig(fs);

    // Assert
    expect(config.ok).toBe(true);
    if (config.ok) {
      expect(config.value.port).toBe(3000);
    }
  });

  test('handles missing config file', async () => {
    // Arrange: Empty FS
    const fs = createInMemoryFileSystem();

    // Act
    const config = await loadConfig(fs);

    // Assert
    expect(config.ok).toBe(false);
    if (!config.ok) {
      expect(config.error.type).toBe('ENOENT');
    }
  });
});
```

### 2. Fake Time for Deterministic Tests

```typescript
import { createFakeTime } from '@servicejs/capability-time';

test('retry with exponential backoff', async () => {
  const time = createFakeTime(0);
  let attempts = 0;

  const failingOp = async () => {
    attempts++;
    if (attempts < 3) {
      throw new Error('Transient failure');
    }
    return 'success';
  };

  // Start the retry operation
  const promise = retryWithBackoff(failingOp, time);

  // Manually advance time to trigger retries
  time.advance(1000);  // First retry after 1s
  time.advance(2000);  // Second retry after 2s

  const result = await promise;

  expect(result).toBe('success');
  expect(attempts).toBe(3);
  expect(time.now()).toBe(3000);
});
```

### 3. Mock HTTP Responses

```typescript
import { createMockHTTP } from '@servicejs/capability-http';

test('fetches user from API', async () => {
  const http = createMockHTTP();

  // Set up mock responses
  http.addResponse({
    url: 'https://api.example.com/users/123',
    response: {
      status: 200,
      body: { id: 123, name: 'Alice' }
    }
  });

  // Use the mock in your code
  const user = await fetchUser(http, 123);

  expect(user.name).toBe('Alice');
});
```

### 4. Buffered Console for Assertions

```typescript
import { createBufferedConsole } from '@servicejs/capability-console';

test('logs warning on invalid input', () => {
  const console = createBufferedConsole();

  processInput('invalid', console);

  const logs = console.getLogs();
  expect(logs).toContainEqual({
    level: 'warn',
    args: ['Invalid input:', 'invalid']
  });
});
```

### 5. Combining Test Capabilities

```typescript
test('application bootstrap', async () => {
  // Create a complete test runtime
  const runtime = {
    env: createInMemoryEnv({ PORT: '3000', NODE_ENV: 'test' }),
    time: createFakeTime(0),
    fs: createInMemoryFileSystem(),
    http: createMockHTTP(),
    console: createBufferedConsole(),
    lifecycle: createInMemoryLifecycle(),
  };

  // Use the test runtime
  const app = await bootstrap(runtime);

  // Make assertions
  expect(app.port).toBe(3000);
  expect(runtime.console.getLogs()).toContainEqual({
    level: 'info',
    args: ['Server starting on port 3000']
  });
});
```

---

## Integration with Dependency Injection

ServiceJS's DI system (`@servicejs/di`) works seamlessly with capabilities:

```typescript
import { createContainer, Token } from '@servicejs/di';

// Define tokens for capabilities
const FileSystemToken = Token<FileSystemCapability>('FileSystem');
const HTTPToken = Token<HTTPCapability>('HTTP');
const ConfigToken = Token<Config>('Config');

// Create container
const container = createContainer();

// Register capabilities
container.register(FileSystemToken, () => createNodeFileSystem());
container.register(HTTPToken, () => createNodeHTTP());

// Register services that depend on capabilities
container.register(ConfigToken, (c) => {
  const fs = c.resolve(FileSystemToken);
  return loadConfig(fs);
});

// Resolve and use
const config = container.resolve(ConfigToken);
```

### Testing with DI

```typescript
test('service with mocked capabilities', () => {
  const testContainer = createContainer();

  // Register test implementations
  testContainer.register(FileSystemToken, () =>
    createInMemoryFileSystem()
  );
  testContainer.register(HTTPToken, () =>
    createMockHTTP()
  );

  // Service gets test capabilities automatically
  const service = testContainer.resolve(MyServiceToken);

  // Test the service
  // ...
});
```

---

## Common Pitfalls and Anti-Patterns

### ❌ Don't: Use Global Singletons

```typescript
// Bad: Global singleton
export const fileSystem = createNodeFileSystem();

function readConfig() {
  return fileSystem.readFile('/config.json'); // Ambient authority!
}
```

```typescript
// Good: Capability parameter
function readConfig(fs: FileSystemCapability) {
  return fs.readFile('/config.json');
}
```

### ❌ Don't: Create Capabilities Inside Components

```typescript
// Bad: Component creates its own capability
class ConfigService {
  private fs = createNodeFileSystem(); // Hard to test!

  async load() {
    return this.fs.readFile('/config.json');
  }
}
```

```typescript
// Good: Inject capability
class ConfigService {
  constructor(private fs: FileSystemCapability) {}

  async load() {
    return this.fs.readFile('/config.json');
  }
}
```

### ❌ Don't: Pass More Capability Than Needed

```typescript
// Bad: Pass entire runtime when only need FS
function loadConfig(runtime: RuntimeCapabilities) {
  return runtime.fs.readFile('/config.json');
}
```

```typescript
// Good: Pass only what's needed
function loadConfig(fs: FileSystemCapability) {
  return fs.readFile('/config.json');
}
```

### ❌ Don't: Use Exceptions for Control Flow

```typescript
// Bad: Throws exceptions
interface BadCapability {
  readFile(path: string): Promise<Uint8Array>; // Throws!
}
```

```typescript
// Good: Returns Result
interface GoodCapability {
  readFile(path: string): Promise<Result<Uint8Array, FileSystemError>>;
}
```

### ❌ Don't: Expose Internal State

```typescript
// Bad: Exposes internal state
interface BadCapability {
  cache: Map<string, any>; // Mutable state exposed!
  readFile(path: string): Promise<Result<Uint8Array, Error>>;
}
```

```typescript
// Good: Encapsulates state
interface GoodCapability {
  readFile(path: string): Promise<Result<Uint8Array, Error>>;
  // State is internal, not exposed
}
```

---

## Real-World Examples

### Example 1: File System Capability

See `@servicejs/capability-fs` for a complete implementation with:
- Production implementation (wraps Node.js fs)
- In-memory implementation (for testing)
- No-op implementation
- Comprehensive tests

### Example 2: HTTP Capability

See `@servicejs/capability-http` for:
- Production HTTP client
- Mock HTTP with response matching
- No-op HTTP client
- Request/response types

### Example 3: Time Capability

See `@servicejs/capability-time` for:
- Real time implementation
- Fake time (controllable, deterministic)
- No-op time
- Timer management

### Example 4: Lifecycle Capability

See `@servicejs/capability-lifecycle` for:
- Graceful shutdown coordination
- LIFO handler execution
- Signal handling
- Shutdown testing

### Example 5: Complete Runtime

See `@servicejs/runtime-node` for how all capabilities compose into a complete runtime.

---

## Summary

**Key Takeaways:**

1. **Design capabilities with single responsibilities**
2. **Always use Result types, never throw**
3. **Provide production, test, and no-op implementations**
4. **Compose capabilities using wrapping, filtering, and attenuation**
5. **Test with in-memory/mock capabilities for determinism**
6. **Integrate with DI for clean architecture**
7. **Avoid ambient authority and global state**

**Benefits:**

- ✅ **Security**: Principle of least privilege enforced structurally
- ✅ **Testability**: Easy to mock and substitute
- ✅ **Flexibility**: Compose and restrict capabilities
- ✅ **Clarity**: Dependencies visible in function signatures
- ✅ **Type Safety**: TypeScript ensures correct usage

For more examples, see the capability packages in `packages/capability-*/` and runtime packages in `packages/runtime-*/`.
