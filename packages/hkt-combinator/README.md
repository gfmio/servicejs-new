# @servicejs/hkt-combinator

HKTO combinators for Higher-Kinded Types - higher-order functions for HKTOs.

## Features

- **Functor**: map, mapOr, mapOrElse
- **Monad**: andThen, orElse, flatten
- **Applicative**: ap, liftA2, sequence
- **Foldable**: fold, foldMap, reduce
- **Traversable**: traverse, sequence
- **Type-Safe**: Full type inference for all combinators

## Installation

```bash
bun add @servicejs/hkt-combinator
```

## Usage

```typescript
import { HKTO } from '@servicejs/hkt-core';
import * as Combinator from '@servicejs/hkt-combinator';

// Map over HKTO
type Mapped = HKTO.Send<SomeHKTO, {
  type: 'map';
  fn: FunctionHKTF.Fn1<number, string>;
}>;

// Flat map (andThen)
type FlatMapped = HKTO.Send<SomeHKTO, {
  type: 'andThen';
  fn: FunctionHKTF.Fn1<number, SomeHKTO<string>>;
}>;

// Fold
type Folded = HKTO.Send<SomeHKTO, {
  type: 'fold';
  ifSome: FunctionHKTF.Fn1<number, string>;
  ifNone: string;
}>;
```

## License

MIT
