# @servicejs/hkt-object

Type-level object operations for Higher-Kinded Types - compile-time object manipulation on object types.

## Features

- **Access**: Keys, Values, Get, Has
- **Transform**: Map, Filter, Pick, Omit, Partial, Required
- **Manipulation**: Merge, Assign, FromEntries, ToEntries
- **Runtime Functions**: Matching runtime implementations
- **Type-Safe**: Full type inference on object types

## Installation

```bash
bun add @servicejs/hkt-object
```

## Usage

```typescript
import { HKTF } from '@servicejs/hkt-core';
import * as Obj from '@servicejs/hkt-object';

// Keys
type K = HKTF.Apply<Obj.Keys, { obj: { a: 1; b: 2 } }>;
// K: ['a', 'b']

// Values
type V = HKTF.Apply<Obj.Values, { obj: { a: 1; b: 2 } }>;
// V: [1, 2]

// Pick
type P = HKTF.Apply<Obj.Pick, { obj: { a: 1; b: 2; c: 3 }; keys: ['a', 'c'] }>;
// P: { a: 1; c: 3 }

// Omit
type O = HKTF.Apply<Obj.Omit, { obj: { a: 1; b: 2; c: 3 }; keys: ['b'] }>;
// O: { a: 1; c: 3 }

// Merge
type M = HKTF.Apply<Obj.Merge, { a: { x: 1 }; b: { y: 2 } }>;
// M: { x: 1; y: 2 }
```

## License

MIT
