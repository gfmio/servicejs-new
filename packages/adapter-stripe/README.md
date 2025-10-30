# @servicejs/adapter-stripe

Stripe payment processing adapter for ServiceJS. Implements the [`PaymentAdapter`](../adapter-payment) interface for Stripe.

## Features

- 💳 **Payment Intents**: Create, confirm, capture, and cancel payments
- 👥 **Customers**: Full customer lifecycle management
- 💰 **Refunds**: Create and track refunds
- 🔄 **Subscriptions**: Recurring billing with trials
- 🎫 **Payment Methods**: Attach, list, and detach payment methods
- 🪝 **Webhooks**: Signature verification and event parsing
- ✅ **Type-Safe**: Full TypeScript support

## Installation

```bash
bun add @servicejs/adapter-stripe @servicejs/adapter-payment
```

## Quick Start

```typescript
import { createStripeAdapter } from '@servicejs/adapter-stripe';

const stripe = createStripeAdapter();

// Initialize with API key
await stripe.init({
  apiKey: 'sk_test_...',
  apiVersion: '2023-10-16',
  webhookSecret: 'whsec_...',
});

// Create a customer
const customer = await stripe.createCustomer('user@example.com', {
  name: 'John Doe',
  metadata: { userId: '123' },
});

// Create a payment intent
const payment = await stripe.createPaymentIntent({
  amount: { amount: 2000, currency: 'USD' }, // $20.00
  customerId: customer.value.id,
  description: 'Purchase',
});

// Create a subscription
const subscription = await stripe.createSubscription({
  customerId: customer.value.id,
  priceId: 'price_...',
  trialEnd: new Date('2025-12-31'),
});
```

## API Reference

This adapter implements the full [`PaymentAdapter<StripeAdapterConfig>`](../adapter-payment#paymentadapter-interface) interface.

### Configuration

```typescript
interface StripeAdapterConfig {
  apiKey: string;          // Stripe API key (sk_test_... or sk_live_...)
  apiVersion?: string;     // Stripe API version (default: '2023-10-16')
  webhookSecret?: string;  // Webhook signing secret (whsec_...)
}
```

## License

MIT
