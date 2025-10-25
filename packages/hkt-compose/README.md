# @servicejs/hkt-compose

Function composition for Higher-Kinded Types - type-safe function composition.

## Features

- **Composition**: Compose, Pipe, Flow
- **Currying**: Curry, Uncurry
- **Partial Application**: Partial
- **Type-Safe**: Full type inference through composition chains
- **Runtime Functions**: Matching runtime implementations

## Installation

```bash
bun add @servicejs/hkt-compose
```

## Usage

```typescript
import { HKTF, FunctionHKTF } from '@servicejs/hkt-core';
import * as Compose from '@servicejs/hkt-compose';

// Compose functions
type Composed = HKTF.Apply<Compose.Compose, {
  f: FunctionHKTF.Fn1<number, string>;
  g: FunctionHKTF.Fn1<string, boolean>;
}>;
// Composed: FunctionHKTF.Fn1<number, boolean>

// Pipe (left-to-right composition)
type Piped = HKTF.Apply<Compose.Pipe, {
  fns: [
    FunctionHKTF.Fn1<number, string>,
    FunctionHKTF.Fn1<string, boolean>
  ]
}>;
```

## License

MIT
