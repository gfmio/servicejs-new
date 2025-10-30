# @servicejs/adapter-stripe

Stripe payment processing adapter for ServiceJS.

## Features

- 💳 **Payment Intents**: Create and manage payments
- 👥 **Customers**: Customer management
- 🔄 **Subscriptions**: Recurring payments
- ✅ **Type-Safe**: Full TypeScript support

## Installation

```bash
bun add @servicejs/adapter-stripe
```

## Quick Start

```typescript
import { createStripeAdapter } from '@servicejs/adapter-stripe';

const stripe = createStripeAdapter();

await stripe.init({
  apiKey: 'sk_test_...',
});

await stripe.createPaymentIntent({
  amount: 2000,
  currency: 'usd',
});
```

## License

MIT
