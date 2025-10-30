# @servicejs/adapter-square

Square payment processing adapter for ServiceJS.

## Installation

```bash
bun add @servicejs/adapter-square
```

## Quick Start

```typescript
import { createSquareAdapter} from '@servicejs/adapter-square';

const square = createSquareAdapter();
await square.init({ accessToken: '...' });
await square.createPayment(1000, 'USD', 'source-id');
```

## License

MIT
