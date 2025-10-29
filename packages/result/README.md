# @servicejs/result

Rust-style Result type with HKT foundation for ServiceJS.

## Overview

This package provides type-safe error handling without exceptions. The `Result<T, E>` type represents either a success value `Ok<T>` or an error value `Err<E>`.

All code has **zero runtime overhead** for type-level operations, with efficient runtime helpers for working with Result values.

## Core Concepts

### Result Type

A `Result<T, E>` is either:
- `Ok<T>` - contains a success value of type `T`
- `Err<E>` - contains an error value of type `E`

```typescript
import { ok, err, type Result } from '@servicejs/result';

// Success case
const success: Result<number, string> = ok(42);

// Error case
const failure: Result<number, string> = err('something went wrong');
```

### Type Guards

```typescript
import { isOk, isErr } from '@servicejs/result';

if (isOk(result)) {
  // TypeScript knows result is Ok<T>
  console.log(result.value);
} else {
  // TypeScript knows result is Err<E>
  console.log(result.error);
}
```

### Transformations

```typescript
import { map, mapErr } from '@servicejs/result';

// Transform success value
const doubled = map(result, x => x * 2);

// Transform error value
const betterError = mapErr(result, e => `Error: ${e}`);
```

### Chaining Operations

```typescript
import { andThen, orElse } from '@servicejs/result';

// Chain Result-returning operations (flatMap)
const result = andThen(ok(42), x =>
  x > 0 ? ok(x * 2) : err('negative')
);

// Recover from errors
const recovered = orElse(err('error'), () => ok(42));
```

### Extracting Values

```typescript
import { unwrap, unwrapOr, unwrapOrElse } from '@servicejs/result';

// Extract value or throw
const value = unwrap(ok(42)); // 42
// unwrap(err('error')); // throws

// Extract value or use default
const value = unwrapOr(result, 0);

// Extract value or compute default
const value = unwrapOrElse(result, error => error.length);
```

### Pattern Matching

```typescript
import { match } from '@servicejs/result';

const message = match(result, {
  onOk: value => `Success: ${value}`,
  onErr: error => `Error: ${error}`,
});
```

## API Reference

### Constructors

- `ok<T>(value: T): Ok<T>` - Create success Result
- `err<E>(error: E): Err<E>` - Create error Result

### Type Guards

- `isOk<T, E>(result: Result<T, E>): result is Ok<T>` - Check if Result is Ok
- `isErr<T, E>(result: Result<T, E>): result is Err<E>` - Check if Result is Err

### Transformations

- `map<T, E, U>(result: Result<T, E>, fn: (value: T) => U): Result<U, E>` - Transform Ok value
- `mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F>` - Transform Err value

### Chaining

- `andThen<T, E, U>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E>` - Chain operations (flatMap)
- `orElse<T, E, F>(result: Result<T, E>, fn: (error: E) => Result<T, F>): Result<T, F>` - Recover from errors

### Extraction

- `unwrap<T, E>(result: Result<T, E>): T` - Extract value or throw
- `unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T` - Extract value or use default
- `unwrapOrElse<T, E>(result: Result<T, E>, fn: (error: E) => T): T` - Extract value or compute default
- `unwrapErr<T, E>(result: Result<T, E>): E` - Extract error or throw

### Pattern Matching

- `match<T, E, U>(result: Result<T, E>, handlers: { onOk: (value: T) => U; onErr: (error: E) => U }): U` - Pattern match on Result

### Conversion

- `toOption<T, E>(result: Result<T, E>): { value: T } | null` - Convert to Option-like type

### Combinators

- `all<T, E>(results: readonly Result<T, E>[]): Result<readonly T[], E>` - Combine multiple Results (returns first Err or Ok with all values)

### Try-Catch Helpers

- `tryCatch<T, E>(fn: () => T, onError: (error: unknown) => E): Result<T, E>` - Execute function and catch errors
- `tryCatchAsync<T, E>(fn: () => Promise<T>, onError: (error: unknown) => E): Promise<Result<T, E>>` - Execute async function and catch errors

### AsyncResult

AsyncResult is a Promise wrapper for Result types that provides convenient methods for chaining async operations.

**Static Methods:**
- `AsyncResult.from<T, E>(promise: Promise<T>, mapError?: (error: unknown) => E): AsyncResult<T, E>` - Create from Promise, catching errors
- `AsyncResult.fromResult<T, E>(result: Result<T, E>): AsyncResult<T, E>` - Wrap Result in AsyncResult
- `AsyncResult.ok<T>(value: T): AsyncResult<T, never>` - Create AsyncResult with Ok
- `AsyncResult.err<E>(error: E): AsyncResult<never, E>` - Create AsyncResult with Err
- `AsyncResult.all<T, E>(results: AsyncResult<T, E>[]): AsyncResult<T[], E>` - Combine multiple AsyncResults
- `AsyncResult.race<T, E>(results: AsyncResult<T, E>[]): AsyncResult<T, E>` - Race multiple AsyncResults

**Instance Methods:**
- `map<U>(fn: (value: T) => U): AsyncResult<U, E>` - Transform Ok value
- `mapErr<F>(fn: (error: E) => F): AsyncResult<T, F>` - Transform Err value
- `andThen<U>(fn: (value: T) => AsyncResult<U, E> | Result<U, E>): AsyncResult<U, E>` - Chain operations
- `orElse<F>(fn: (error: E) => AsyncResult<T, F> | Result<T, F>): AsyncResult<T, F>` - Recover from errors
- `unwrap(): Promise<T>` - Extract value or throw
- `unwrapOr(defaultValue: T): Promise<T>` - Extract value or use default
- `unwrapOrElse(fn: (error: E) => T): Promise<T>` - Extract value or compute default
- `unwrapErr(): Promise<E>` - Extract error or throw
- `isOk(): Promise<boolean>` - Check if Result is Ok
- `isErr(): Promise<boolean>` - Check if Result is Err
- `match<U>(handlers: { onOk: (value: T) => U; onErr: (error: E) => U }): Promise<U>` - Pattern match
- `toOption(): Promise<Option<T>>` - Convert to Option

**Awaitable:**
AsyncResult implements `PromiseLike<Result<T, E>>`, so you can await it directly:
```typescript
const result: Result<T, E> = await asyncResult;
```

### Helper Functions for Wrapping Functions

These helpers wrap functions to automatically catch errors and convert them to Results:

- `trySafe<T, E>(fn: () => T, mapError: (error: unknown) => E): Result<T, E>` - Wrap synchronous function
- `tryAsync<T, E>(fn: () => Promise<T>, mapError: (error: unknown) => E): AsyncResult<T, E>` - Wrap async function
- `tryMaybeAsync<T, E>(fn: () => T | Promise<T>, mapError: (error: unknown) => E): Result<T, E> | AsyncResult<T, E>` - Wrap function that may be sync or async

**When to use:**

- Use `trySafe` for synchronous functions that may throw
- Use `tryAsync` for async functions (most common)
- Use `tryMaybeAsync` when you want to preserve sync performance (e.g., cache with async fallback)

**Examples:**

```typescript
// trySafe - for synchronous operations
const parseResult = trySafe(
  () => JSON.parse(jsonString),
  error => `Parse error: ${error}`
);

// tryAsync - for async operations (most common)
const fetchResult = tryAsync(
  async () => {
    const response = await fetch('/api/user');
    return response.json();
  },
  error => `Fetch failed: ${error}`
);

// Chain operations on AsyncResult
const userName = await fetchResult
  .map(user => user.name)
  .mapErr(error => new Error(error));

// tryMaybeAsync - for functions that may be sync or async
const cache = new Map();
const getUser = (id: number) => {
  const cached = cache.get(id);
  if (cached) return cached; // sync
  return fetch(`/api/users/${id}`).then(r => r.json()); // async
};

const result = tryMaybeAsync(
  () => getUser(123),
  error => String(error)
);

// Handle both sync and async cases
if (result instanceof AsyncResult) {
  const user = await result;
  console.log(user);
} else {
  // It's a Result, no await needed
  if (isOk(result)) {
    console.log(result.value);
  }
}
```

## HKT Types

This package includes HKT (Higher-Kinded Type) definitions for type-level operations:

```typescript
import { type ResultHKTO } from '@servicejs/result';

// ResultHKTO provides type-level operations
// Used internally for compile-time protocol verification
```

## Examples

### AsyncResult Examples

#### Basic Usage
```typescript
import { AsyncResult } from '@servicejs/result';

// Create from a Promise that might throw
async function fetchData(url: string): AsyncResult<Data, string> {
  return AsyncResult.from(
    fetch(url).then(r => r.json()),
    error => `Fetch failed: ${error}`
  );
}

// Use as return type of async functions
async function divide(a: number, b: number): AsyncResult<number, string> {
  if (b === 0) {
    return AsyncResult.err('Division by zero');
  }
  return AsyncResult.ok(a / b);
}

// Chain operations
const result = await divide(10, 2)
  .map(x => x * 2)
  .map(x => `Result: ${x}`);
```

#### Validation Chain
```typescript
interface User {
  name: string;
  age: number;
  email: string;
}

const validateName = (user: User): AsyncResult<User, string> => {
  return user.name.length > 0
    ? AsyncResult.ok(user)
    : AsyncResult.err('Name is required');
};

const validateAge = (user: User): AsyncResult<User, string> => {
  return user.age >= 18
    ? AsyncResult.ok(user)
    : AsyncResult.err('Must be 18 or older');
};

const validateEmail = (user: User): AsyncResult<User, string> => {
  return user.email.includes('@')
    ? AsyncResult.ok(user)
    : AsyncResult.err('Invalid email');
};

// Chain validations
const result = await AsyncResult.ok(userData)
  .andThen(validateName)
  .andThen(validateAge)
  .andThen(validateEmail);

// Handle result
if (isOk(result)) {
  console.log('User is valid:', result.value);
} else {
  console.error('Validation failed:', result.error);
}
```

#### Error Recovery
```typescript
const primary = AsyncResult.from(
  fetchFromPrimary(),
  error => `Primary failed: ${error}`
);

const result = await primary.orElse(error => {
  console.warn(error);
  return AsyncResult.from(
    fetchFromBackup(),
    error => `Backup also failed: ${error}`
  );
});
```

#### Combining Multiple AsyncResults
```typescript
const results = await AsyncResult.all([
  fetchUser(1),
  fetchUser(2),
  fetchUser(3),
]);

// results is Ok([user1, user2, user3]) or first Err

const users = await results.match({
  onOk: users => users.map(u => u.name),
  onErr: error => [],
});
```

### Basic Usage

```typescript
import { ok, err, map, andThen, unwrapOr } from '@servicejs/result';

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return err('division by zero');
  }
  return ok(a / b);
}

// Chain operations
const result = andThen(divide(10, 2), x =>
  andThen(divide(x, 2), y =>
    ok(y * 10)
  )
);

// Extract value safely
const value = unwrapOr(result, 0); // 25
```

### Error Handling

```typescript
import { tryCatch, map, match } from '@servicejs/result';

// Safely parse JSON
const result = tryCatch(
  () => JSON.parse(jsonString),
  error => `Parse error: ${error}`
);

// Transform and handle
const message = match(
  map(result, data => data.name),
  {
    onOk: name => `Hello, ${name}!`,
    onErr: error => `Error: ${error}`,
  }
);
```

### Combining Results

```typescript
import { all, map } from '@servicejs/result';

const results = [
  divide(10, 2),  // Ok(5)
  divide(20, 4),  // Ok(5)
  divide(30, 6),  // Ok(5)
];

// Get all values or first error
const combined = all(results);
// Result: Ok([5, 5, 5])

const sum = map(combined, values =>
  values.reduce((a, b) => a + b, 0)
);
// Result: Ok(15)
```

### Async Operations with AsyncResult

```typescript
import { AsyncResult } from '@servicejs/result';

// AsyncResult provides a better way to handle async operations
async function fetchUser(id: number): AsyncResult<User, string> {
  return AsyncResult.from(
    fetch(`/api/users/${id}`).then(r => r.json()),
    error => `Fetch failed: ${error}`
  );
}

// Chain async operations without try/catch
const result = await fetchUser(123)
  .map(user => user.name)
  .mapErr(error => `Error: ${error}`)
  .andThen(name => validateName(name));

// Use with pattern matching
const message = await fetchUser(123).match({
  onOk: user => `Hello, ${user.name}!`,
  onErr: error => `Error: ${error}`,
});
```

### Legacy Async Operations (using tryCatchAsync)

```typescript
import { tryCatchAsync, andThen } from '@servicejs/result';

async function fetchUser(id: number) {
  return tryCatchAsync(
    async () => {
      const response = await fetch(`/api/users/${id}`);
      return response.json();
    },
    error => `Fetch failed: ${error}`
  );
}

// Chain async operations
const result = await tryCatchAsync(
  async () => {
    const userResult = await fetchUser(123);
    if (isErr(userResult)) {
      throw new Error(userResult.error);
    }
    return userResult.value;
  },
  error => String(error)
);
```

## Design Philosophy

This Result type follows these principles:

1. **Explicit Error Handling**: Errors are values, not exceptions
2. **Type Safety**: Full TypeScript inference and type guards
3. **Composability**: Chain operations with `map`, `andThen`, etc.
4. **Zero Cost**: Type-level operations have no runtime overhead
5. **Rust-Inspired**: Familiar API for Rust developers

## License

MIT
