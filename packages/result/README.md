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

## HKT Types

This package includes HKT (Higher-Kinded Type) definitions for type-level operations:

```typescript
import { type ResultHKTO } from '@servicejs/result';

// ResultHKTO provides type-level operations
// Used internally for compile-time protocol verification
```

## Examples

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

### Async Operations

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
