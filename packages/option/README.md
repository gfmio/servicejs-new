# @servicejs/option

Option type with HKT foundation for ServiceJS.

## Overview

This package provides null-safe programming without `null`/`undefined`. The `Option<T>` type represents either a value `Some<T>` or the absence of a value `None`.

All code has **zero runtime overhead** for type-level operations, with efficient runtime helpers for working with Option values.

## Core Concepts

### Option Type

An `Option<T>` is either:
- `Some<T>` - contains a value of type `T`
- `None` - represents absence of a value

```typescript
import { some, none, type Option } from '@servicejs/option';

// Present value
const present: Option<number> = some(42);

// Absent value
const absent: Option<number> = none();
```

### Type Guards

```typescript
import { isSome, isNone } from '@servicejs/option';

if (isSome(option)) {
  // TypeScript knows option is Some<T>
  console.log(option.value);
} else {
  // TypeScript knows option is None
  console.log('No value');
}
```

### Creating Options

```typescript
import { some, none, fromNullable } from '@servicejs/option';

// Create explicitly
const explicit = some(42);

// From nullable value
const fromNull = fromNullable(maybeNull); // Some or None
const fromUndef = fromNullable(maybeUndefined); // Some or None
```

### Transformations

```typescript
import { map } from '@servicejs/option';

// Transform value if present
const doubled = map(option, x => x * 2);
```

### Chaining Operations

```typescript
import { andThen, or, orElse } from '@servicejs/option';

// Chain Option-returning operations (flatMap)
const result = andThen(some(42), x =>
  x > 0 ? some(x * 2) : none()
);

// Provide alternative if None
const withDefault = or(option, some(0));

// Lazily provide alternative if None
const withLazyDefault = orElse(option, () => some(0));
```

### Filtering

```typescript
import { filter } from '@servicejs/option';

// Keep value only if predicate is true
const positive = filter(option, x => x > 0);
```

### Extracting Values

```typescript
import { unwrap, unwrapOr, unwrapOrElse } from '@servicejs/option';

// Extract value or throw
const value = unwrap(some(42)); // 42
// unwrap(none()); // throws

// Extract value or use default
const value = unwrapOr(option, 0);

// Extract value or compute default
const value = unwrapOrElse(option, () => 0);
```

### Pattern Matching

```typescript
import { match } from '@servicejs/option';

const message = match(option, {
  onSome: value => `Value: ${value}`,
  onNone: () => 'No value',
});
```

## API Reference

### Constructors

- `some<T>(value: T): Some<T>` - Create Some Option
- `none(): None` - Create None Option
- `fromNullable<T>(value: T | null | undefined): Option<T>` - Create Option from nullable

### Type Guards

- `isSome<T>(option: Option<T>): option is Some<T>` - Check if Option is Some
- `isNone<T>(option: Option<T>): option is None` - Check if Option is None

### Transformations

- `map<T, U>(option: Option<T>, fn: (value: T) => U): Option<U>` - Transform value if present

### Chaining

- `andThen<T, U>(option: Option<T>, fn: (value: T) => Option<U>): Option<U>` - Chain operations (flatMap)
- `or<T>(option: Option<T>, alternative: Option<T>): Option<T>` - Provide alternative if None
- `orElse<T>(option: Option<T>, fn: () => Option<T>): Option<T>` - Lazily provide alternative if None

### Filtering

- `filter<T>(option: Option<T>, predicate: (value: T) => boolean): Option<T>` - Keep value only if predicate is true

### Extraction

- `unwrap<T>(option: Option<T>): T` - Extract value or throw
- `unwrapOr<T>(option: Option<T>, defaultValue: T): T` - Extract value or use default
- `unwrapOrElse<T>(option: Option<T>, fn: () => T): T` - Extract value or compute default

### Conversion

- `toNullable<T>(option: Option<T>): T | null` - Convert to nullable value
- `toUndefined<T>(option: Option<T>): T | undefined` - Convert to value or undefined

### Pattern Matching

- `match<T, U>(option: Option<T>, handlers: { onSome: (value: T) => U; onNone: () => U }): U` - Pattern match on Option

### Combinators

- `all<T>(options: readonly Option<T>[]): Option<readonly T[]>` - Combine multiple Options (returns None if any are None, otherwise Some with all values)
- `any<T>(options: readonly Option<T>[]): Option<T>` - Return first Some or None if all are None
- `zip<T, U>(a: Option<T>, b: Option<U>): Option<readonly [T, U]>` - Zip two Options into tuple
- `zipWith<T, U, V>(a: Option<T>, b: Option<U>, fn: (x: T, y: U) => V): Option<V>` - Zip two Options with combining function

## HKT Types

This package includes HKT (Higher-Kinded Type) definitions for type-level operations:

```typescript
import { type OptionHKTO } from '@servicejs/option';

// OptionHKTO provides type-level operations
// Used internally for compile-time protocol verification
```

## Examples

### Basic Usage

```typescript
import { some, none, map, andThen, unwrapOr } from '@servicejs/option';

function safeDivide(a: number, b: number): Option<number> {
  if (b === 0) {
    return none();
  }
  return some(a / b);
}

// Chain operations
const result = andThen(safeDivide(10, 2), x =>
  andThen(safeDivide(x, 2), y =>
    some(y * 10)
  )
);

// Extract value safely
const value = unwrapOr(result, 0); // 25
```

### Null Safety

```typescript
import { fromNullable, map, match } from '@servicejs/option';

interface User {
  name: string;
  email?: string;
}

function getUserEmail(user: User): Option<string> {
  return fromNullable(user.email);
}

const message = match(
  map(getUserEmail(user), email => email.toLowerCase()),
  {
    onSome: email => `Email: ${email}`,
    onNone: () => 'No email provided',
  }
);
```

### Combining Options

```typescript
import { all, zip, zipWith } from '@servicejs/option';

// Get all values or None
const options = [some(1), some(2), some(3)];
const combined = all(options);
// Result: Some([1, 2, 3])

// Zip two options
const tuple = zip(some(1), some('a'));
// Result: Some([1, 'a'])

// Zip with combining function
const sum = zipWith(some(2), some(3), (a, b) => a + b);
// Result: Some(5)
```

### Filtering

```typescript
import { some, filter, andThen } from '@servicejs/option';

// Filter and chain
const result = andThen(
  filter(some(42), x => x > 0),
  x => some(x * 2)
);
// Result: Some(84)

const filtered = filter(some(-5), x => x > 0);
// Result: None
```

### Working with Arrays

```typescript
import { fromNullable, all, map } from '@servicejs/option';

// Parse multiple values safely
const inputs = ['1', '2', '3'];
const parsed = all(
  inputs.map(s => {
    const n = parseInt(s, 10);
    return isNaN(n) ? none() : some(n);
  })
);

if (isSome(parsed)) {
  const sum = parsed.value.reduce((a, b) => a + b, 0);
  console.log(sum); // 6
}
```

## Design Philosophy

This Option type follows these principles:

1. **Explicit Absence**: Absence is a value, not null/undefined
2. **Type Safety**: Full TypeScript inference and type guards
3. **Composability**: Chain operations with `map`, `andThen`, etc.
4. **Zero Cost**: Type-level operations have no runtime overhead
5. **Rust-Inspired**: Familiar API for Rust developers

## License

MIT
