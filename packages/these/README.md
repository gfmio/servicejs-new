# @servicejs/these

These type for ServiceJS - represents a value that can be This, That, or Both.

## Features

- **Three States**: This(left), That(right), or Both(left, right)
- **HKTO Support**: Higher-Kinded Type Object implementation
- **Type-Safe**: Full TypeScript support with discriminated unions
- **Combinators**: map, mapBoth, fold, merge
- **Use Case**: Validation with warnings, partial failures

## Installation

```bash
bun add @servicejs/these
```

## Usage

```typescript
import { These, This, That, Both } from '@servicejs/these';

// Create These values
const left = This('error');
const right = That(42);
const both = Both('warning', 42);

// Pattern match
function handle(value: These<string, number>): number {
  switch (value._tag) {
    case 'This':
      console.error(value.left);
      return 0;
    case 'That':
      return value.right;
    case 'Both':
      console.warn(value.left);
      return value.right;
  }
}
```

## License

MIT
