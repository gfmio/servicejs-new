# @servicejs/pure

Pure function utilities with HKT foundation for ServiceJS.

## Overview

This package provides functional programming utilities for composing and working with pure functions. It includes function composition, classic combinators, and predicate utilities.

All code has **zero runtime overhead** for type-level operations, with efficient runtime helpers.

## Core Concepts

### Identity Monad

The Identity monad provides a convenient wrapper for pure functional transformations and method chaining.

```typescript
import { Identity } from '@servicejs/pure';

// Create and chain transformations
const result = Identity.of(42)
  .map(x => x / 2)
  .map(x => x + 10)
  .unwrap(); // 31

// Use flatMap for nested computations
const doubled = Identity.of(10)
  .andThen(x => Identity.of(x * 2))
  .unwrap(); // 20

// Tap for debugging
const debug = Identity.of(5)
  .map(x => x * 2)
  .tap(x => console.log('After double:', x))
  .map(x => x + 3)
  .unwrap(); // 13

// Available as Id for shorter code
import { Id } from '@servicejs/pure';
const value = new Id(42).map(x => x * 2).unwrap();
```

### Function Composition

Compose functions to build complex operations from simple building blocks.

```typescript
import { pipe, compose } from '@servicejs/pure';

const addOne = (x: number) => x + 1;
const double = (x: number) => x * 2;

// Left-to-right composition
const fn1 = pipe(addOne, double);
fn1(5); // 12

// Right-to-left composition
const fn2 = compose(double, addOne);
fn2(5); // 12
```

### Basic Combinators

```typescript
import { identity, constant, flip, curry } from '@servicejs/pure';

// Identity - returns argument unchanged
identity(42); // 42

// Constant - always returns same value
const always42 = constant(42);
always42(); // 42

// Flip - swaps argument order
const subtract = (a: number, b: number) => a - b;
const flipped = flip(subtract);
flipped(5, 10); // 5 (10 - 5)

// Curry - converts to curried form
const add = (a: number, b: number) => a + b;
const curried = curry(add);
curried(5)(10); // 15
```

### Predicate Utilities

```typescript
import { and, or, not, greaterThan, isNotEmpty } from '@servicejs/pure';

const isPositive = (x: number) => x > 0;
const isEven = (x: number) => x % 2 === 0;

// Combine predicates
const isPositiveEven = and(isPositive, isEven);
isPositiveEven(4); // true

// Negate predicate
const isOdd = not(isEven);
isOdd(3); // true
```

## API Reference

### Identity Monad

- `Identity.of<T>(value: T): Identity<T>` - Create an Identity wrapping a value
- `new Identity<T>(value: T)` - Constructor for Identity
- `identity.map<U>(fn: (value: T) => U): Identity<U>` - Transform the wrapped value
- `identity.andThen<U>(fn: (value: T) => Identity<U>): Identity<U>` - Chain Identity-returning operations (flatMap)
- `identity.flatMap<U>(fn: (value: T) => Identity<U>): Identity<U>` - Alias for andThen
- `identity.chain<U>(fn: (value: T) => Identity<U>): Identity<U>` - Alias for andThen
- `identity.ap<U>(fn: Identity<(value: T) => U>): Identity<U>` - Apply a wrapped function
- `identity.unwrap(): T` - Extract the wrapped value
- `identity.extract(): T` - Alias for unwrap
- `identity.tap(fn: (value: T) => void): Identity<T>` - Execute side effect without changing value
- `of<T>(value: T): Identity<T>` - Function to create Identity
- `pure<T>(value: T): Identity<T>` - Alias for of
- `Id` - Shorter alias for Identity class

### Composition

- `pipe<A, B, ...>(...fns): (a: A) => Z` - Compose functions left-to-right
- `compose<A, B, ...>(...fns): (a: A) => Z` - Compose functions right-to-left

### Basic Combinators

- `identity<T>(value: T): T` - Returns argument unchanged
- `constant<T>(value: T): () => T` - Returns function that always returns same value
- `noop(): void` - Does nothing
- `flip<A, B, C>(fn: (a: A, b: B) => C): (b: B, a: A) => C` - Swaps argument order
- `curry<A, B, C>(fn: (a: A, b: B) => C): (a: A) => (b: B) => C` - Converts to curried form
- `uncurry<A, B, C>(fn: (a: A) => (b: B) => C): (a: A, b: B) => C` - Converts from curried form
- `partial<A, B, C>(fn: (a: A, b: B) => C, a: A): (b: B) => C` - Partially applies first argument
- `partialRight<A, B, C>(fn: (a: A, b: B) => C, b: B): (a: A) => C` - Partially applies second argument

### Predicate Combinators

- `not<T>(predicate: Predicate<T>): Predicate<T>` - Negates predicate
- `and<T>(...predicates: Predicate<T>[]): Predicate<T>` - Combines with AND logic
- `or<T>(...predicates: Predicate<T>[]): Predicate<T>` - Combines with OR logic

### Advanced Combinators

- `once<Args, Return>(fn: (...args: Args) => Return): (...args: Args) => Return` - Ensures function is called at most once
- `memoize<A, B>(fn: (a: A) => B): (a: A) => B` - Caches function results
- `tap<T>(fn: (value: T) => void): (value: T) => T` - Executes side effect and returns original value
- `apply<A, B>(fn: (a: A) => B, value: A): B` - Applies function to value
- `applyTo<A, B>(value: A): (fn: (a: A) => B) => B` - Creates function that applies its argument to value

### Basic Predicates

- `alwaysTrue<T>(): Predicate<T>` - Always returns true
- `alwaysFalse<T>(): Predicate<T>` - Always returns false
- `isNullish<T>(value: T | null | undefined): boolean` - Checks if null or undefined
- `isNotNullish<T>(value: T | null | undefined): boolean` - Checks if not null or undefined
- `isDefined<T>(value: T | undefined): boolean` - Checks if defined
- `isUndefined<T>(value: T | undefined): boolean` - Checks if undefined
- `equals<T>(expected: T): Predicate<T>` - Checks equality

### Numeric Predicates

- `greaterThan(min: number): Predicate<number>` - Checks if greater than
- `greaterThanOrEqual(min: number): Predicate<number>` - Checks if greater than or equal
- `lessThan(max: number): Predicate<number>` - Checks if less than
- `lessThanOrEqual(max: number): Predicate<number>` - Checks if less than or equal
- `between(min: number, max: number): Predicate<number>` - Checks if between (inclusive)

### String Predicates

- `isEmpty(value: string): boolean` - Checks if empty
- `isNotEmpty(value: string): boolean` - Checks if not empty
- `matches(regex: RegExp): Predicate<string>` - Checks if matches regex
- `startsWith(prefix: string): Predicate<string>` - Checks if starts with prefix
- `endsWith(suffix: string): Predicate<string>` - Checks if ends with suffix
- `contains(substring: string): Predicate<string>` - Checks if contains substring

### Array Predicates

- `isEmptyArray<T>(value: T[]): boolean` - Checks if array is empty
- `isNotEmptyArray<T>(value: T[]): boolean` - Checks if array is not empty
- `includes<T>(item: T): Predicate<T[]>` - Checks if array includes item

### Type Predicates

- `isInstanceOf<T>(constructor: new (...args: any[]) => T): Predicate<unknown>` - Checks if instance of class
- `hasProperty<K>(key: K): (value: unknown) => boolean` - Checks if has property

## Examples

### Identity Monad Examples

```typescript
import { Identity } from '@servicejs/pure';

// Simple calculation with chaining
const result = Identity.of(42)
  .map(x => x / 2)
  .map(x => x + 8)
  .map(x => x * 3)
  .unwrap(); // 87

// String processing
const formatted = Identity.of('hello world')
  .map(s => s.toUpperCase())
  .map(s => s.split(' '))
  .map(arr => arr.reverse())
  .map(arr => arr.join('-'))
  .unwrap(); // "WORLD-HELLO"

// Working with objects
interface User {
  name: string;
  age: number;
}

const updated = Identity.of<User>({ name: 'Alice', age: 30 })
  .map(user => ({ ...user, age: user.age + 1 }))
  .map(user => ({ ...user, name: user.name.toUpperCase() }))
  .unwrap(); // { name: 'ALICE', age: 31 }

// Conditional logic with flatMap
const validate = (x: number) =>
  x > 0 ? Identity.of(x) : Identity.of(0);

const positive = Identity.of(42)
  .andThen(validate)
  .map(x => x * 2)
  .unwrap(); // 84

const negative = Identity.of(-5)
  .andThen(validate)
  .map(x => x * 2)
  .unwrap(); // 0
```

### Pipeline Processing

```typescript
import { pipe, map, filter } from '@servicejs/pure';

const processNumbers = pipe(
  (nums: number[]) => nums.filter(x => x > 0),
  (nums: number[]) => nums.map(x => x * 2),
  (nums: number[]) => nums.reduce((a, b) => a + b, 0)
);

processNumbers([1, -2, 3, -4, 5]); // 18
```

### Complex Predicates

```typescript
import { and, or, not, between, isNotEmpty } from '@servicejs/pure';

// Validate age
const isValidAge = and(
  (x: number) => x >= 0,
  (x: number) => x <= 120
);

// Validate username
const isValidUsername = and(
  isNotEmpty,
  (s: string) => s.length >= 3,
  (s: string) => s.length <= 20,
  matches(/^[a-zA-Z0-9_]+$/)
);
```

### Memoization

```typescript
import { memoize, pipe } from '@servicejs/pure';

// Expensive computation
const fibonacci = memoize((n: number): number => {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
});

fibonacci(40); // Fast due to memoization
```

### Once Wrapper

```typescript
import { once } from '@servicejs/pure';

let count = 0;
const increment = once(() => ++count);

increment(); // 1
increment(); // 1
increment(); // 1
```

### Tap for Debugging

```typescript
import { pipe, tap } from '@servicejs/pure';

const processData = pipe(
  (x: number) => x + 1,
  tap(x => console.log('After add:', x)),
  (x: number) => x * 2,
  tap(x => console.log('After multiply:', x))
);

processData(5);
// Logs:
// After add: 6
// After multiply: 12
```

### Partial Application

```typescript
import { partial, partialRight } from '@servicejs/pure';

const divide = (a: number, b: number) => a / b;

// Partial application from left
const divideBy2 = partial(flip(divide), 2);
divideBy2(10); // 5

// Partial application from right
const half = partialRight(divide, 2);
half(10); // 5
```

### Currying

```typescript
import { curry } from '@servicejs/pure';

const add = (a: number, b: number) => a + b;
const curriedAdd = curry(add);

// Can apply arguments one at a time
const add5 = curriedAdd(5);
add5(10); // 15
add5(20); // 25
```

## HKT Types

This package includes HKT (Higher-Kinded Type) definitions for type-level operations:

```typescript
import { type PipeHKTF, type ComposeHKTF } from '@servicejs/pure';

// PipeHKTF and ComposeHKTF provide type-level composition
// Used internally for compile-time type inference
```

## Design Philosophy

This package follows these principles:

1. **Pure Functions**: All utilities work with pure functions
2. **Composability**: Functions are designed to be composed
3. **Type Safety**: Full TypeScript inference
4. **Zero Cost**: Type-level operations have no runtime overhead
5. **Functional**: Inspired by Haskell, Ramda, and fp-ts

## License

MIT
