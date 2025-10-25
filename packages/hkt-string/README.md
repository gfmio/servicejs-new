# @servicejs/hkt-string

Type-level string operations for Higher-Kinded Types - compile-time string manipulation on literal types.

## Features

- **Transformations**: Uppercase, Lowercase, Capitalize, Uncapitalize
- **Analysis**: Length, StartsWith, EndsWith, Includes, Split, Join
- **Manipulation**: Concat, Trim, Replace, Slice
- **Runtime Functions**: Matching runtime implementations
- **Type-Safe**: Full type inference on string literals

## Installation

```bash
bun add @servicejs/hkt-string
```

## Usage

```typescript
import { HKTF } from '@servicejs/hkt-core';
import * as Str from '@servicejs/hkt-string';

// Uppercase
type Upper = HKTF.Apply<Str.Uppercase, { value: 'hello' }>;
// Upper: 'HELLO'

// Lowercase
type Lower = HKTF.Apply<Str.Lowercase, { value: 'HELLO' }>;
// Lower: 'hello'

// Capitalize
type Cap = HKTF.Apply<Str.Capitalize, { value: 'hello' }>;
// Cap: 'Hello'

// Concat
type Combined = HKTF.Apply<Str.Concat, { a: 'Hello'; b: ' World' }>;
// Combined: 'Hello World'

// Length
type Len = HKTF.Apply<Str.Length, { value: 'Hello' }>;
// Len: 5

// StartsWith
type Starts = HKTF.Apply<Str.StartsWith, { value: 'Hello'; prefix: 'He' }>;
// Starts: true
```

## License

MIT
