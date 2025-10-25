# @servicejs/hkt-tuple

Type-level tuple operations for Higher-Kinded Types - compile-time array/tuple manipulation on tuple types.

## Features

- **Access**: Head, Tail, First, Last, At
- **Transform**: Map, Filter, Reverse, Flatten, Zip
- **Analysis**: Length, Includes, IndexOf
- **Manipulation**: Concat, Slice, Push, Pop, Shift, Unshift
- **Runtime Functions**: Matching runtime implementations
- **Type-Safe**: Full type inference on tuple types

## Installation

```bash
bun add @servicejs/hkt-tuple
```

## Usage

```typescript
import { HKTF } from '@servicejs/hkt-core';
import * as Tuple from '@servicejs/hkt-tuple';

// Head
type H = HKTF.Apply<Tuple.Head, { tuple: [1, 2, 3] }>;
// H: 1

// Tail
type T = HKTF.Apply<Tuple.Tail, { tuple: [1, 2, 3] }>;
// T: [2, 3]

// Length
type Len = HKTF.Apply<Tuple.Length, { tuple: [1, 2, 3, 4] }>;
// Len: 4

// Concat
type Combined = HKTF.Apply<Tuple.Concat, { a: [1, 2]; b: [3, 4] }>;
// Combined: [1, 2, 3, 4]

// Reverse
type Rev = HKTF.Apply<Tuple.Reverse, { tuple: [1, 2, 3] }>;
// Rev: [3, 2, 1]
```

## License

MIT
