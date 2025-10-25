# @servicejs/either

Either type with HKT foundation for ServiceJS.

## Overview

This package provides a general-purpose sum type for representing two mutually exclusive values. The `Either<L, R>` type represents either a `Left<L>` or a `Right<R>` value.

By convention:
- `Right` represents the "success" or primary path
- `Left` represents the "error" or alternative path

All code has **zero runtime overhead** for type-level operations, with efficient runtime helpers for working with Either values.

## Core Concepts

### Either Type

An `Either<L, R>` is either:
- `Left<L>` - typically represents an error or alternative path
- `Right<R>` - typically represents success or the primary path

```typescript
import { left, right, type Either } from '@servicejs/either';

// Success case
const success: Either<string, number> = right(42);

// Error case
const failure: Either<string, number> = left('something went wrong');
```

### Type Guards

```typescript
import { isLeft, isRight } from '@servicejs/either';

if (isRight(either)) {
  // TypeScript knows either is Right<R>
  console.log(either.right);
} else {
  // TypeScript knows either is Left<L>
  console.log(either.left);
}
```

### Transformations

```typescript
import { map, mapLeft, biMap } from '@servicejs/either';

// Transform Right value
const doubled = map(either, x => x * 2);

// Transform Left value
const betterError = mapLeft(either, e => `Error: ${e}`);

// Transform both sides
const transformed = biMap(
  either,
  error => error.length,
  value => value * 2
);
```

### Chaining Operations

```typescript
import { andThen, orElse } from '@servicejs/either';

// Chain Right-returning operations (flatMap)
const result = andThen(right(42), x =>
  x > 0 ? right(x * 2) : left('negative')
);

// Recover from Left
const recovered = orElse(left('error'), error =>
  right(error.length)
);
```

### Swapping Sides

```typescript
import { swap } from '@servicejs/either';

// Swap Left and Right
const swapped = swap(right(42)); // Left(42)
```

### Extracting Values

```typescript
import { unwrapRight, unwrapLeft, getOrElse, getOrElseWith } from '@servicejs/either';

// Extract Right or throw
const value = unwrapRight(right(42)); // 42
// unwrapRight(left('error')); // throws

// Extract Right or use default
const value = getOrElse(either, 0);

// Extract Right or compute default
const value = getOrElseWith(either, error => error.length);
```

### Pattern Matching

```typescript
import { match } from '@servicejs/either';

const message = match(either, {
  onLeft: error => `Error: ${error}`,
  onRight: value => `Value: ${value}`,
});
```

## API Reference

### Constructors

- `left<L>(value: L): Left<L>` - Create Left Either
- `right<R>(value: R): Right<R>` - Create Right Either
- `fromNullable<L, R>(value: R | null | undefined, leftValue: L): Either<L, R>` - Create Either from nullable
- `fromPredicate<L, R>(value: R, predicate: (value: R) => boolean, leftValue: L): Either<L, R>` - Create Either from predicate

### Type Guards

- `isLeft<L, R>(either: Either<L, R>): either is Left<L>` - Check if Either is Left
- `isRight<L, R>(either: Either<L, R>): either is Right<R>` - Check if Either is Right

### Transformations

- `map<L, R, U>(either: Either<L, R>, fn: (value: R) => U): Either<L, U>` - Transform Right value
- `mapLeft<L, R, M>(either: Either<L, R>, fn: (value: L) => M): Either<M, R>` - Transform Left value
- `biMap<L, R, M, U>(either: Either<L, R>, leftFn: (value: L) => M, rightFn: (value: R) => U): Either<M, U>` - Transform both sides

### Chaining

- `andThen<L, R, U>(either: Either<L, R>, fn: (value: R) => Either<L, U>): Either<L, U>` - Chain operations on Right (flatMap)
- `orElse<L, R, M>(either: Either<L, R>, fn: (value: L) => Either<M, R>): Either<M, R>` - Chain operations on Left

### Utilities

- `swap<L, R>(either: Either<L, R>): Either<R, L>` - Swap Left and Right

### Extraction

- `unwrapRight<L, R>(either: Either<L, R>): R` - Extract Right value or throw
- `unwrapLeft<L, R>(either: Either<L, R>): L` - Extract Left value or throw
- `getOrElse<L, R>(either: Either<L, R>, defaultValue: R): R` - Extract Right value or use default
- `getOrElseWith<L, R>(either: Either<L, R>, fn: (left: L) => R): R` - Extract Right value or compute default

### Pattern Matching

- `match<L, R, U>(either: Either<L, R>, handlers: { onLeft: (value: L) => U; onRight: (value: R) => U }): U` - Pattern match on Either

### Conversion

- `toTuple<L, R>(either: Either<L, R>): readonly [L | null, R | null]` - Convert to tuple

### Try-Catch Helpers

- `tryCatch<L, R>(fn: () => R, onError: (error: unknown) => L): Either<L, R>` - Execute function and catch errors
- `tryCatchAsync<L, R>(fn: () => Promise<R>, onError: (error: unknown) => L): Promise<Either<L, R>>` - Execute async function and catch errors

### Combinators

- `all<L, R>(eithers: readonly Either<L, R>[]): Either<L, readonly R[]>` - Combine multiple Eithers (returns first Left or Right with all values)
- `partition<L, R>(eithers: readonly Either<L, R>[]): readonly [readonly L[], readonly R[]]` - Partition Eithers into Lefts and Rights

## HKT Types

This package includes HKT (Higher-Kinded Type) definitions for type-level operations:

```typescript
import { type EitherHKTO } from '@servicejs/either';

// EitherHKTO provides type-level operations
// Used internally for compile-time protocol verification
```

## Examples

### Basic Usage

```typescript
import { left, right, map, andThen, getOrElse } from '@servicejs/either';

function safeDivide(a: number, b: number): Either<string, number> {
  if (b === 0) {
    return left('division by zero');
  }
  return right(a / b);
}

// Chain operations
const result = andThen(safeDivide(10, 2), x =>
  andThen(safeDivide(x, 2), y =>
    right(y * 10)
  )
);

// Extract value safely
const value = getOrElse(result, 0); // 25
```

### Error Handling

```typescript
import { tryCatch, map, match } from '@servicejs/either';

// Safely parse JSON
const result = tryCatch(
  () => JSON.parse(jsonString),
  error => `Parse error: ${error}`
);

// Transform and handle
const message = match(
  map(result, data => data.name),
  {
    onLeft: error => `Error: ${error}`,
    onRight: name => `Hello, ${name}!`,
  }
);
```

### Combining Eithers

```typescript
import { all, map } from '@servicejs/either';

const results = [
  safeDivide(10, 2),  // Right(5)
  safeDivide(20, 4),  // Right(5)
  safeDivide(30, 6),  // Right(5)
];

// Get all values or first error
const combined = all(results);
// Result: Right([5, 5, 5])

const sum = map(combined, values =>
  values.reduce((a, b) => a + b, 0)
);
// Result: Right(15)
```

### Partitioning

```typescript
import { partition } from '@servicejs/either';

const results = [
  safeDivide(10, 2),  // Right(5)
  safeDivide(10, 0),  // Left('division by zero')
  safeDivide(20, 4),  // Right(5)
];

const [errors, successes] = partition(results);
// errors: ['division by zero']
// successes: [5, 5]
```

### Swapping Sides

```typescript
import { swap, map } from '@servicejs/either';

// Sometimes you want to work with the Left side
const result = right(42);
const swapped = swap(result); // Left(42)
const doubled = map(swap(swapped), x => x * 2); // Right(84)
```

### BiMap Example

```typescript
import { biMap } from '@servicejs/either';

// Transform both sides at once
const result = biMap(
  either,
  error => ({ message: error, timestamp: Date.now() }),
  value => ({ data: value, status: 'success' })
);
```

### Validation

```typescript
import { fromPredicate, andThen, map } from '@servicejs/either';

function validateAge(age: number): Either<string, number> {
  return fromPredicate(age, a => a >= 0 && a <= 120, 'Invalid age');
}

function validateEmail(email: string): Either<string, string> {
  return fromPredicate(
    email,
    e => e.includes('@'),
    'Invalid email'
  );
}

// Chain validations
const validated = andThen(
  validateAge(25),
  age => map(validateEmail('user@example.com'), email => ({ age, email }))
);
```

## Either vs Result

While similar to `Result<T, E>`, `Either<L, R>` is more general:
- `Result` is semantically tied to success/error
- `Either` can represent any two alternatives
- Use `Result` when modeling operations that can fail
- Use `Either` when modeling general branching logic

## Design Philosophy

This Either type follows these principles:

1. **Explicit Alternatives**: Both paths are explicit values
2. **Type Safety**: Full TypeScript inference and type guards
3. **Composability**: Chain operations with `map`, `andThen`, etc.
4. **Zero Cost**: Type-level operations have no runtime overhead
5. **Functional**: Inspired by Haskell and Scala

## License

MIT
