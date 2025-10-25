# @servicejs/nonempty-array

Non-empty array type for ServiceJS - arrays guaranteed to have at least one element.

## Features

- **Type-Safe**: Guarantees at least one element at compile time
- **All Array Methods**: map, filter, reduce, etc.
- **Head/Tail Access**: Safe access to first element
- **HKTO Support**: Higher-Kinded Type Object implementation
- **Runtime Validation**: Check if array is non-empty

## Installation

```bash
bun add @servicejs/nonempty-array
```

## Usage

```typescript
import { NonEmptyArray, isNonEmpty } from '@servicejs/nonempty-array';

// Create non-empty array
const arr: NonEmptyArray<number> = [1, 2, 3];

// Head is always safe
const first = arr[0]; // number (not number | undefined)

// Runtime check
function process(arr: number[]): void {
  if (isNonEmpty(arr)) {
    // arr is NonEmptyArray<number> here
    const head = arr[0]; // Safe!
  }
}
```

## License

MIT
