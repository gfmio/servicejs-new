# Testing Guide

**Last Updated:** 2025-10-25

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Unit Testing Pure Reducers](#unit-testing-pure-reducers)
3. [Testing with Fake Capabilities](#testing-with-fake-capabilities)
4. [Deterministic Testing Strategies](#deterministic-testing-strategies)
5. [Integration Testing](#integration-testing)
6. [Property-Based Testing](#property-based-testing)
7. [Testing Async Operations](#testing-async-operations)
8. [Coverage Strategies](#coverage-strategies)

---

## Testing Philosophy

ServiceJS is designed for **testability by default**:

- **Pure Reducers**: Easy to test in isolation
- **Dependency Injection**: Capabilities passed as parameters
- **Result Types**: No exceptions to catch
- **Deterministic**: Fake time, in-memory storage
- **Isolated**: No global state, no ambient authority

**Testing Pyramid:**
```
         ┌──────────────┐
         │     E2E      │  ← Few, slow, realistic
         ├──────────────┤
         │ Integration  │  ← Some, medium speed
         ├──────────────┤
         │     Unit     │  ← Many, fast, focused
         └──────────────┘
```

---

## Unit Testing Pure Reducers

Reducers are pure functions - perfect for unit testing:

```typescript
import { describe, test, expect } from 'bun:test';

// Simple counter reducer
type CounterState = { count: number };
type CounterMessage =
  | { type: 'increment'; amount: number }
  | { type: 'decrement'; amount: number };

function counterReducer(
  state: CounterState,
  message: CounterMessage
): ReducerResult<CounterState, CounterMessage> {
  switch (message.type) {
    case 'increment':
      return stay({ count: state.count + message.amount }, counterReducer, []);
    case 'decrement':
      return stay({ count: state.count - message.amount }, counterReducer, []);
  }
}

describe('Counter Reducer', () => {
  test('increments count', () => {
    const state = { count: 0 };
    const message = { type: 'increment', amount: 5 };

    const result = counterReducer(state, message);

    expect(result.state.count).toBe(5);
    expect(result.effects).toEqual([]);
  });

  test('decrements count', () => {
    const state = { count: 10 };
    const message = { type: 'decrement', amount: 3 };

    const result = counterReducer(state, message);

    expect(result.state.count).toBe(7);
  });

  test('maintains immutability', () => {
    const state = { count: 0 };
    const message = { type: 'increment', amount: 1 };

    counterReducer(state, message);

    // Original state unchanged
    expect(state.count).toBe(0);
  });
});
```

---

## Testing with Fake Capabilities

### Fake Time

```typescript
import { createFakeTime } from '@servicejs/capability-time';

test('debounce with fake time', async () => {
  const time = createFakeTime(0);
  const calls: number[] = [];

  const debounced = debounce(
    (value: number) => calls.push(value),
    1000,
    time
  );

  // Call multiple times rapidly
  debounced(1);
  debounced(2);
  debounced(3);

  // Advance time - only last call should execute
  time.advance(1000);

  expect(calls).toEqual([3]);
  expect(time.now()).toBe(1000);
});

test('setTimeout execution order', () => {
  const time = createFakeTime(0);
  const order: number[] = [];

  time.setTimeout(() => order.push(1), 100);
  time.setTimeout(() => order.push(2), 50);
  time.setTimeout(() => order.push(3), 150);

  // Advance in steps
  time.advance(50);
  expect(order).toEqual([2]);

  time.advance(50);
  expect(order).toEqual([2, 1]);

  time.advance(50);
  expect(order).toEqual([2, 1, 3]);
});
```

### In-Memory File System

```typescript
import { createInMemoryFileSystem } from '@servicejs/capability-fs';

test('config loader with in-memory FS', async () => {
  const fs = createInMemoryFileSystem();

  // Arrange: Set up test files
  await fs.writeFile('/config.json', encode('{"port":3000}'));
  await fs.writeFile('/secret.key', encode('super-secret'));

  // Act: Use your code
  const config = await loadConfig(fs);

  // Assert
  expect(config.ok).toBe(true);
  if (config.ok) {
    expect(config.value.port).toBe(3000);
  }
});

test('handles missing file', async () => {
  const fs = createInMemoryFileSystem();

  const result = await fs.readFile('/nonexistent.txt');

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.type).toBe('ENOENT');
  }
});
```

### Mock HTTP

```typescript
import { createMockHTTP } from '@servicejs/capability-http';

test('API client with mock HTTP', async () => {
  const http = createMockHTTP();

  // Set up mock responses
  http.addResponse({
    url: 'https://api.example.com/users',
    response: {
      status: 200,
      body: [{ id: 1, name: 'Alice' }]
    }
  });

  // Use the mock
  const client = createAPIClient(http);
  const users = await client.getUsers();

  expect(users).toHaveLength(1);
  expect(users[0].name).toBe('Alice');
});

test('handles network errors', async () => {
  const http = createMockHTTP();

  http.addResponse({
    url: 'https://api.example.com/users',
    response: {
      status: 500,
      body: { error: 'Internal Server Error' }
    }
  });

  const client = createAPIClient(http);
  const result = await client.getUsers();

  expect(result.ok).toBe(false);
});
```

### Buffered Console

```typescript
import { createBufferedConsole } from '@servicejs/capability-console';

test('logs validation errors', () => {
  const console = createBufferedConsole();

  validateInput({ age: -5 }, console);

  const logs = console.getLogs();
  expect(logs).toContainEqual({
    level: 'error',
    args: ['Invalid age:', -5]
  });
});

test('logs in correct order', () => {
  const console = createBufferedConsole();

  console.log('First');
  console.warn('Second');
  console.error('Third');

  const logs = console.getLogs();
  expect(logs.map(l => l.args[0])).toEqual(['First', 'Second', 'Third']);
});
```

---

## Deterministic Testing Strategies

### Complete Test Runtime

```typescript
function createTestRuntime(overrides?: Partial<RuntimeCapabilities>): RuntimeCapabilities {
  return {
    env: createInMemoryEnv({ NODE_ENV: 'test', PORT: '3000' }),
    time: createFakeTime(0),
    lifecycle: createInMemoryLifecycle(),
    fs: createInMemoryFileSystem(),
    http: createMockHTTP(),
    console: createBufferedConsole(),
    streams: createInMemoryStreams(),
    crypto: createDeterministicCrypto('test-seed'),
    ...overrides
  };
}

test('application with full test runtime', async () => {
  const runtime = createTestRuntime({
    env: createInMemoryEnv({ PORT: '8080' })
  });

  const app = await createApp(runtime);

  expect(app.port).toBe(8080);
  expect(runtime.console.getLogs()).toContainEqual({
    level: 'info',
    args: ['Server starting on port 8080']
  });
});
```

### Deterministic Crypto

```typescript
import { createDeterministicCrypto } from '@servicejs/capability-crypto';

test('generates predictable UUIDs', () => {
  const crypto = createDeterministicCrypto('seed-123');

  const uuid1 = crypto.randomUUID();
  const uuid2 = crypto.randomUUID();

  // Different UUIDs
  expect(uuid1).not.toBe(uuid2);

  // But reproducible with same seed
  const crypto2 = createDeterministicCrypto('seed-123');
  expect(crypto2.randomUUID()).toBe(uuid1);
});
```

---

## Integration Testing

### Testing Components Together

```typescript
test('request/reply pattern integration', async () => {
  const runtime = createTestRuntime();

  // Create server component
  const server = createServer(runtime);

  // Create client component
  const client = createClient(server.capability);

  // Send request
  const response = await client.request({ type: 'ping' });

  expect(response.ok).toBe(true);
  if (response.ok) {
    expect(response.value.type).toBe('pong');
  }
});
```

### Testing with Mock Transport

```typescript
test('distributed system with mock transport', async () => {
  const transport = createMockTransport();

  // Create components on different "nodes"
  const node1 = createNode('node1', transport);
  const node2 = createNode('node2', transport);

  // Send message from node1 to node2
  await transport.send('node2', { type: 'hello' });

  // Verify node2 received message
  expect(node2.getMessages()).toContainEqual({ type: 'hello' });
});
```

---

## Property-Based Testing

Use property-based testing for complex logic:

```typescript
import { fc, test } from '@fast-check/vitest';

test.prop([fc.array(fc.integer())])('reducer maintains count invariant', (numbers) => {
  let state = { count: 0 };

  for (const num of numbers) {
    const result = counterReducer(state, { type: 'increment', amount: num });
    state = result.state;
  }

  const expectedCount = numbers.reduce((sum, n) => sum + n, 0);
  expect(state.count).toBe(expectedCount);
});
```

---

## Testing Async Operations

### Testing Async Reducers

```typescript
test('async database operation', async () => {
  const db = createMockDatabase();
  const reducer = createDatabaseReducer(db);

  const state = initialState;
  const message = { type: 'fetch-user', id: 123 };

  const result = await reducer(state, message);

  expect(result.state.loading).toBe(false);
  expect(result.state.user).toBeDefined();
});
```

### Testing Timeouts

```typescript
test('request timeout', async () => {
  const time = createFakeTime(0);
  const http = createMockHTTP();

  // Set up slow response
  http.addResponse({
    url: '/slow',
    delay: 5000,
    response: { status: 200, body: 'OK' }
  });

  const promise = fetchWithTimeout('/slow', { timeout: 3000 }, http, time);

  // Advance past timeout
  time.advance(3000);

  const result = await promise;

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.type).toBe('TIMEOUT');
  }
});
```

---

## Coverage Strategies

### Measuring Coverage

```bash
# Run tests with coverage
bun test --coverage

# Check coverage report
bun test --coverage --coverage-reporter=html
open coverage/index.html
```

### Coverage Goals

- **Unit Tests**: >90% line coverage
- **Integration Tests**: Cover main user flows
- **E2E Tests**: Cover critical business paths

### What to Test

**✅ Do Test:**
- All reducer logic
- Error handling paths
- Edge cases (empty arrays, null, undefined)
- Boundary conditions
- Complex algorithms

**❌ Don't Test:**
- Third-party library internals
- TypeScript type system
- Trivial getters/setters
- Auto-generated code

### Example Coverage Report

```
File                  | % Stmts | % Branch | % Funcs | % Lines |
----------------------|---------|----------|---------|---------|
reducer.ts            |     100 |      100 |     100 |     100 |
config.ts             |    92.5 |     87.5 |     100 |    92.5 |
utils.ts              |      85 |       75 |      90 |      85 |
----------------------|---------|----------|---------|---------|
All files             |    94.2 |     89.7 |    96.7 |    94.2 |
```

---

## Testing Checklist

### Before Merging

- [ ] All tests pass
- [ ] Coverage >90%
- [ ] No skipped tests
- [ ] Integration tests pass
- [ ] Async operations tested
- [ ] Error cases tested
- [ ] Edge cases covered
- [ ] No console.log in code
- [ ] Test files follow naming convention

### Test Naming Convention

```typescript
// Good: Descriptive test names
test('returns error when file does not exist');
test('increments counter by specified amount');
test('handles concurrent requests correctly');

// Bad: Vague test names
test('works');
test('test1');
test('should do something');
```

---

## Summary

**Key Takeaways:**

1. **Use fake capabilities for deterministic tests**
2. **Test reducers in isolation (unit tests)**
3. **Test components together (integration tests)**
4. **Use property-based testing for complex logic**
5. **Measure coverage and aim for >90%**
6. **Test error paths and edge cases**

**Best Practices:**

- ✅ Write tests first or alongside code
- ✅ Use descriptive test names
- ✅ Keep tests focused and simple
- ✅ Use fake time for time-dependent code
- ✅ Test with realistic data
- ✅ Don't test implementation details

For capability-specific testing examples, see:
- `packages/capability-*/tests/` for capability tests
- `packages/runtime-*/tests/` for runtime tests
- `.claude/docs/capability-patterns.md` for capability testing patterns
