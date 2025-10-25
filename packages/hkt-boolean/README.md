# @servicejs/hkt-boolean

Type-level boolean operations for Higher-Kinded Types - compile-time logic on boolean types.

## Features

- **Logical Operations**: And, Or, Not, Xor
- **Conditional**: If (ternary operator)
- **Aggregate**: All (every), Any (some)
- **Runtime Functions**: Matching runtime implementations
- **Type-Safe**: Full type inference at compile time

## Installation

```bash
bun add @servicejs/hkt-boolean
```

## Usage

```typescript
import { HKTF } from '@servicejs/hkt-core';
import * as Boolean from '@servicejs/hkt-boolean';

// AND
type AndResult = HKTF.Apply<Boolean.And, { a: true; b: false }>;
// AndResult: false

// OR
type OrResult = HKTF.Apply<Boolean.Or, { a: true; b: false }>;
// OrResult: true

// NOT
type NotResult = HKTF.Apply<Boolean.Not, { value: true }>;
// NotResult: false

// XOR
type XorResult = HKTF.Apply<Boolean.Xor, { a: true; b: false }>;
// XorResult: true

// IF (ternary)
type IfResult = HKTF.Apply<Boolean.If<'yes', 'no'>, { condition: true }>;
// IfResult: 'yes'

// ALL (every)
type AllResult = HKTF.Apply<Boolean.All, { values: [true, true, true] }>;
// AllResult: true

// ANY (some)
type AnyResult = HKTF.Apply<Boolean.Any, { values: [false, true, false] }>;
// AnyResult: true
```

## API Reference

- `And` - Logical AND (&&)
- `Or` - Logical OR (||)
- `Not` - Logical NOT (!)
- `Xor` - Logical XOR (exclusive or)
- `If` - Conditional (ternary operator)
- `All` - Check if all values are true
- `Any` - Check if any value is true

## License

MIT
