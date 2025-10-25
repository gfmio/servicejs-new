# @servicejs/hkt

**Meta-package** that re-exports all HKT modules for convenience.

This is a convenience package that includes all HKT modules. For better tree-shaking, consider importing from specific packages instead.

## Installation

```bash
npm install @servicejs/hkt
# or
bun add @servicejs/hkt
```

## Usage

### Option 1: Import from Meta-Package (Convenient)

```typescript
import { HKTF, HKTO, Method, ArithmeticHKTF, StringHKTF } from '@servicejs/hkt';

// Use type-level operations
type Sum = HKTF.Apply<ArithmeticHKTF.Add, { a: 5, b: 3 }>; // 8

// Use runtime functions
const result = ArithmeticHKTF.add(5, 3); // 8
```

### Option 2: Import from Specific Packages (Better Tree-Shaking)

```typescript
import { HKTF } from '@servicejs/hkt-core';
import * as Arithmetic from '@servicejs/hkt-arithmetic';
import * as String from '@servicejs/hkt-string';

// Type-level
type Sum = HKTF.Apply<Arithmetic.Add, { a: 10, b: 20 }>; // 30

// Runtime
const sum = Arithmetic.add(10, 20); // 30
```

## Available Packages

This meta-package includes:

- **[@servicejs/hkt-core](../hkt-core)** - Core HKT infrastructure (HKTF, HKTO, Method, Util)
- **[@servicejs/hkt-arithmetic](../hkt-arithmetic)** - Type-level arithmetic operations
- **[@servicejs/hkt-boolean](../hkt-boolean)** - Type-level boolean operations
- **[@servicejs/hkt-string](../hkt-string)** - Type-level string operations
- **[@servicejs/hkt-tuple](../hkt-tuple)** - Type-level tuple operations
- **[@servicejs/hkt-object](../hkt-object)** - Type-level object operations
- **[@servicejs/hkt-compose](../hkt-compose)** - Function composition utilities
- **[@servicejs/hkt-combinator](../hkt-combinator)** - HKTO combinators

## When to Use Which

### Use the Meta-Package (`@servicejs/hkt`) When:
- You need multiple HKT modules
- Convenience is more important than bundle size
- You're prototyping or experimenting

### Use Specific Packages When:
- You only need one or two modules
- Bundle size optimization matters
- You're building a library for distribution
- You want the best tree-shaking

## Examples

### Type-Level Arithmetic

```typescript
import { HKTF, ArithmeticHKTF as Arithmetic } from '@servicejs/hkt';

type Sum = HKTF.Apply<Arithmetic.Add, { a: 5, b: 3 }>; // 8
type Product = HKTF.Apply<Arithmetic.Multiply, { a: 4, b: 7 }>; // 28
```

### Type-Level String Operations

```typescript
import { HKTF, StringHKTF as Str } from '@servicejs/hkt';

type Greeting = HKTF.Apply<Str.Concat, { str1: 'Hello'; str2: ' World' }>;
// "Hello World"
```

### Function Composition

```typescript
import { HKTF, Compose } from '@servicejs/hkt';

type Pipeline = HKTF.Apply<
  Compose.Pipe,
  {
    functions: readonly [Transform1, Transform2, Transform3];
    input: InputType;
  }
>;
```

## Documentation

For detailed documentation on each module, see the individual package READMEs:

- [Core Concepts - HKTF, HKTO, Method](../hkt-core/README.md)
- [Arithmetic Operations](../hkt-arithmetic/README.md)
- [String Operations](../hkt-string/README.md)
- [Tuple Operations](../hkt-tuple/README.md)
- [Object Operations](../hkt-object/README.md)
- [Composition Utilities](../hkt-compose/README.md)
- [HKTO Combinators](../hkt-combinator/README.md)

## License

MIT
