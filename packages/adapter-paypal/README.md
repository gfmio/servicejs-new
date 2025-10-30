# @servicejs/adapter-paypal

PayPal payment processing adapter for ServiceJS.

## Installation

```bash
bun add @servicejs/adapter-paypal
```

## Quick Start

```typescript
import { createPayPalAdapter } from '@servicejs/adapter-paypal';

const paypal = createPayPalAdapter();
await paypal.init({ clientId: '...', clientSecret: '...' });
await paypal.createOrder(1000, 'USD');
```

## License

MIT
