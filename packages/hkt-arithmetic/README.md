# @servicejs/hkt-arithmetic

Type-level arithmetic operations for Higher-Kinded Types - compile-time math on number literals.

## Features

- **Basic Operations**: Add, Subtract, Multiply, Divide, Pow, Mod
- **Unary Operations**: Negate, Abs
- **Comparisons**: Gt, Lt, Eq, GtOrEq, LtOrEq, Max, Min
- **Type Checks**: IsPositive, IsNegative, IsOdd, IsEven, IsInt, IsNotInt
- **Bit Operations**: And, Or, Xor, Not
- **Runtime Functions**: All operations have matching runtime implementations
- **Type-Safe**: Full type inference and checking at compile time

## Installation

```bash
bun add @servicejs/hkt-arithmetic
```

## Usage

### Type-Level Arithmetic

```typescript
import { HKTF } from '@servicejs/hkt-core';
import * as Arithmetic from '@servicejs/hkt-arithmetic';

// Addition
type Sum = HKTF.Apply<Arithmetic.Add, { a: 2; b: 3 }>;
// Sum: 5

// Subtraction
type Diff = HKTF.Apply<Arithmetic.Subtract, { a: 10; b: 3 }>;
// Diff: 7

// Multiplication
type Product = HKTF.Apply<Arithmetic.Multiply, { a: 4; b: 5 }>;
// Product: 20

// Division
type Quotient = HKTF.Apply<Arithmetic.Divide, { a: 15; b: 3 }>;
// Quotient: 5

// Power
type Power = HKTF.Apply<Arithmetic.Pow, { base: 2; exponent: 8 }>;
// Power: 256

// Modulo
type Remainder = HKTF.Apply<Arithmetic.Mod, { a: 17; b: 5 }>;
// Remainder: 2
```

### Runtime Functions

```typescript
import { add, subtract, multiply, divide, pow, mod } from '@servicejs/hkt-arithmetic';

// Runtime arithmetic (with type inference)
const sum = add(2, 3); // 5 (inferred as literal type)
const diff = subtract(10, 3); // 7
const product = multiply(4, 5); // 20
const quotient = divide(15, 3); // 5
const power = pow(2, 8); // 256
const remainder = mod(17, 5); // 2
```

### Comparisons

```typescript
// Greater than
type IsGreater = HKTF.Apply<Arithmetic.Gt, { a: 5; b: 3 }>;
// IsGreater: true

// Less than
type IsLess = HKTF.Apply<Arithmetic.Lt, { a: 3; b: 5 }>;
// IsLess: true

// Equal
type IsEqual = HKTF.Apply<Arithmetic.Eq, { a: 5; b: 5 }>;
// IsEqual: true

// Maximum
type Maximum = HKTF.Apply<Arithmetic.Max, { a: 5; b: 10 }>;
// Maximum: 10

// Minimum
type Minimum = HKTF.Apply<Arithmetic.Min, { a: 5; b: 10 }>;
// Minimum: 5
```

### Type Checks

```typescript
// Check if positive
type CheckPositive = HKTF.Apply<Arithmetic.IsPositive, { value: 5 }>;
// CheckPositive: true

// Check if negative
type CheckNegative = HKTF.Apply<Arithmetic.IsNegative, { value: -5 }>;
// CheckNegative: true

// Check if odd
type CheckOdd = HKTF.Apply<Arithmetic.IsOdd, { value: 7 }>;
// CheckOdd: true

// Check if even
type CheckEven = HKTF.Apply<Arithmetic.IsEven, { value: 8 }>;
// CheckEven: true
```

### Bit Operations

```typescript
// Bitwise AND
type BitwiseAnd = HKTF.Apply<Arithmetic.And, { a: 5; b: 3 }>;
// BitwiseAnd: 1 (0101 & 0011 = 0001)

// Bitwise OR
type BitwiseOr = HKTF.Apply<Arithmetic.Or, { a: 5; b: 3 }>;
// BitwiseOr: 7 (0101 | 0011 = 0111)

// Bitwise XOR
type BitwiseXor = HKTF.Apply<Arithmetic.Xor, { a: 5; b: 3 }>;
// BitwiseXor: 6 (0101 ^ 0011 = 0110)

// Bitwise NOT
type BitwiseNot = HKTF.Apply<Arithmetic.Not, { value: 5 }>;
// BitwiseNot: -6 (~5 = -6)
```

## Use Cases

### Compile-Time Validation

```typescript
// Ensure array length is within bounds
type ValidLength<N extends number> =
  HKTF.Apply<Arithmetic.GtOrEq, { a: N; b: 0 }> extends true
    ? HKTF.Apply<Arithmetic.LtOrEq, { a: N; b: 100 }> extends true
      ? N
      : never
    : never;

type Length1 = ValidLength<50>; // 50
type Length2 = ValidLength<150>; // never
```

### Type-Level Fibonacci

```typescript
type Fib<N extends number> =
  HKTF.Apply<Arithmetic.LtOrEq, { a: N; b: 1 }> extends true
    ? N
    : HKTF.Apply<Arithmetic.Add, {
        a: Fib<HKTF.Apply<Arithmetic.Subtract, { a: N; b: 1 }>>;
        b: Fib<HKTF.Apply<Arithmetic.Subtract, { a: N; b: 2 }>>;
      }>;

type Fib5 = Fib<5>; // 5
type Fib10 = Fib<10>; // 55
```

### Tuple Index Calculations

```typescript
type SafeIndex<Arr extends readonly any[], Idx extends number> =
  HKTF.Apply<Arithmetic.Lt, { a: Idx; b: Arr['length'] }> extends true
    ? Arr[Idx]
    : never;

type Arr = [1, 2, 3, 4, 5];
type Item1 = SafeIndex<Arr, 2>; // 3
type Item2 = SafeIndex<Arr, 10>; // never
```

## API Reference

All HKTFs follow the Args/Result pattern from `@servicejs/hkt-core`.

### Basic Operations

- `Add` - Addition
- `Subtract` - Subtraction
- `Multiply` - Multiplication
- `Divide` - Division
- `Pow` - Exponentiation
- `Mod` - Modulo

### Unary Operations

- `Negate` - Negation (-x)
- `Abs` - Absolute value

### Comparisons

- `Gt` - Greater than (>)
- `Lt` - Less than (<)
- `Eq` - Equal (===)
- `GtOrEq` - Greater than or equal (>=)
- `LtOrEq` - Less than or equal (<=)
- `Max` - Maximum of two numbers
- `Min` - Minimum of two numbers

### Type Checks

- `IsPositive` - Check if number is positive
- `IsNegative` - Check if number is negative
- `IsOdd` - Check if number is odd
- `IsEven` - Check if number is even
- `IsInt` - Check if number is an integer
- `IsNotInt` - Check if number is not an integer

### Bit Operations

- `And` - Bitwise AND (&)
- `Or` - Bitwise OR (|)
- `Xor` - Bitwise XOR (^)
- `Not` - Bitwise NOT (~)

## Limitations

- Only works with **number literal types** (e.g., `5`, not `number`)
- Limited to TypeScript's type system capabilities
- Large numbers may cause type recursion limits
- Floating point operations have limited precision

## Design Philosophy

Type-level arithmetic enables:

1. **Compile-Time Validation** - Catch numerical errors before runtime
2. **Type-Safe Indexing** - Safe array/tuple access
3. **Protocol Verification** - Verify numerical constraints in types
4. **Zero Runtime Cost** - All checks disappear after compilation

## License

MIT
