# @servicejs/adapter-payment

Common types and interfaces for payment adapters in ServiceJS.

## Overview

This package provides comprehensive type definitions that all payment provider adapters must implement. It covers the full payment lifecycle: customers, payment methods, one-time payments, refunds, subscriptions, and webhooks.

## Features

- 💳 **Payment Intents**: One-time and authorized payments
- 👥 **Customer Management**: Create and manage customers
- 🔄 **Subscriptions**: Recurring billing with trials
- 💰 **Refunds**: Full and partial refunds
- 🎫 **Payment Methods**: Card, bank account, wallet support
- 🪝 **Webhooks**: Event verification and parsing
- ✅ **Type-Safe**: Full TypeScript support

## Installation

```bash
bun add @servicejs/adapter-payment
```

## Usage

### Implementing a Payment Adapter

```typescript
import type {
  PaymentAdapter,
  Customer,
  PaymentIntent,
  PaymentIntentResult,
  Subscription,
  SubscriptionResult,
} from '@servicejs/adapter-payment';
import { ok, err, type Result } from '@servicejs/result';

interface MyProviderConfig {
  apiKey: string;
  webhookSecret?: string;
}

export const createMyPaymentAdapter = (): PaymentAdapter<MyProviderConfig> => {
  let config: MyProviderConfig | null = null;

  return {
    init: async (cfg) => {
      config = cfg;
      return ok(undefined);
    },

    createCustomer: async (email, options) => {
      // Implementation
      return ok({
        id: 'cus_123',
        email,
        ...options,
      });
    },

    createPaymentIntent: async (intent) => {
      // Implementation
      return ok({
        id: 'pi_123',
        status: 'succeeded',
        amount: intent.amount,
        createdAt: new Date(),
      });
    },

    createSubscription: async (subscription) => {
      // Implementation
      return ok({
        id: 'sub_123',
        status: 'active',
        customerId: subscription.customerId,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
      });
    },

    // ... implement all other methods
  };
};
```

### Using a Payment Adapter

```typescript
import { createStripePaymentAdapter } from '@servicejs/adapter-stripe';

const payment = createStripePaymentAdapter();

await payment.init({
  apiKey: 'sk_test_...',
  webhookSecret: 'whsec_...',
});

// Create customer
const customer = await payment.createCustomer('user@example.com', {
  name: 'John Doe',
  metadata: { userId: '123' },
});

// Create payment
const paymentIntent = await payment.createPaymentIntent({
  amount: { amount: 2000, currency: 'USD' },
  customerId: customer.value.id,
  description: 'Purchase',
});

// Create subscription
const subscription = await payment.createSubscription({
  customerId: customer.value.id,
  priceId: 'price_123',
});
```

## Available Payment Adapters

- **[@servicejs/adapter-stripe](../adapter-stripe)**: Stripe integration
- **[@servicejs/adapter-paypal](../adapter-paypal)**: PayPal integration
- **[@servicejs/adapter-square](../adapter-square)**: Square integration

## Types

### Core Types

#### Money
```typescript
interface Money {
  amount: number;      // Amount in smallest unit (cents)
  currency: string;    // ISO 4217 currency code
}
```

#### Customer
```typescript
interface Customer {
  id: string;
  email?: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}
```

#### PaymentMethod
```typescript
interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'wallet' | 'other';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
}
```

### Payment Operations

#### PaymentIntent
```typescript
interface PaymentIntent {
  amount: Money;
  customerId?: string;
  paymentMethodId?: string;
  description?: string;
  statementDescriptor?: string;
  metadata?: Record<string, string>;
  capture?: boolean;  // Immediate capture or authorize only
}
```

#### PaymentIntentResult
```typescript
interface PaymentIntentResult {
  id: string;
  status: 'requires_payment_method' | 'requires_confirmation' |
          'requires_action' | 'processing' | 'succeeded' |
          'canceled' | 'failed';
  amount: Money;
  clientSecret?: string;
  nextAction?: { type: string; [key: string]: any };
  createdAt: Date;
}
```

### Refunds

#### RefundRequest
```typescript
interface RefundRequest {
  paymentId: string;
  amount?: Money;  // Optional, defaults to full amount
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'other';
  metadata?: Record<string, string>;
}
```

#### RefundResult
```typescript
interface RefundResult {
  id: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  amount: Money;
  reason?: string;
  createdAt: Date;
}
```

### Subscriptions

#### Subscription
```typescript
interface Subscription {
  customerId: string;
  priceId: string;
  paymentMethodId?: string;
  trialEnd?: Date;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
  metadata?: Record<string, string>;
}
```

#### SubscriptionResult
```typescript
interface SubscriptionResult {
  id: string;
  status: 'incomplete' | 'incomplete_expired' | 'trialing' |
          'active' | 'past_due' | 'canceled' | 'unpaid' | 'paused';
  customerId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  createdAt: Date;
}
```

### PaymentAdapter Interface

```typescript
interface PaymentAdapter<TConfig = any> {
  // Lifecycle
  init(config: TConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>;

  // Customer Management
  createCustomer(email: string, options?: Partial<Omit<Customer, 'id' | 'email'>>): Promise<Result<Customer, Error>>;
  getCustomer(customerId: string): Promise<Result<Customer, Error>>;
  updateCustomer(customerId: string, updates: Partial<Omit<Customer, 'id'>>): Promise<Result<Customer, Error>>;
  deleteCustomer(customerId: string): Promise<Result<void, Error>>;

  // Payment Methods
  attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<Result<PaymentMethod, Error>>;
  listPaymentMethods(customerId: string): Promise<Result<PaymentMethod[], Error>>;
  detachPaymentMethod(paymentMethodId: string): Promise<Result<void, Error>>;

  // One-Time Payments
  createPaymentIntent(intent: PaymentIntent): Promise<Result<PaymentIntentResult, Error>>;
  getPaymentIntent(paymentIntentId: string): Promise<Result<PaymentIntentResult, Error>>;
  confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string): Promise<Result<PaymentIntentResult, Error>>;
  cancelPaymentIntent(paymentIntentId: string): Promise<Result<PaymentIntentResult, Error>>;
  capturePayment(paymentIntentId: string, amount?: Money): Promise<Result<PaymentIntentResult, Error>>;

  // Refunds
  createRefund(refund: RefundRequest): Promise<Result<RefundResult, Error>>;
  getRefund(refundId: string): Promise<Result<RefundResult, Error>>;

  // Subscriptions
  createSubscription(subscription: Subscription): Promise<Result<SubscriptionResult, Error>>;
  getSubscription(subscriptionId: string): Promise<Result<SubscriptionResult, Error>>;
  updateSubscription(subscriptionId: string, updates: Partial<Subscription>): Promise<Result<SubscriptionResult, Error>>;
  cancelSubscription(subscriptionId: string, immediately?: boolean): Promise<Result<SubscriptionResult, Error>>;
  resumeSubscription(subscriptionId: string): Promise<Result<SubscriptionResult, Error>>;

  // Webhooks
  verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<Result<boolean, Error>>;
  parseWebhookEvent(payload: string): Promise<Result<WebhookEvent, Error>>;
}
```

## Design Principles

1. **Provider Agnostic**: Types work with any payment provider (Stripe, PayPal, Square, etc.)
2. **Money Safety**: Always use Money type with amount in smallest currency unit
3. **Status Enums**: Comprehensive status enums matching common provider states
4. **Metadata Support**: Custom metadata on all major entities
5. **Result Pattern**: All operations return Result<T, Error> for type-safe error handling

## License

MIT
