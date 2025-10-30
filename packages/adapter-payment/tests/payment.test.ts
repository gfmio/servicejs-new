import { describe, test, expect } from 'bun:test';
import type {
  Money,
  Customer,
  PaymentMethod,
  PaymentIntent,
  PaymentIntentResult,
  RefundRequest,
  RefundResult,
  Subscription,
  SubscriptionResult,
  SubscriptionPrice,
  WebhookEvent,
} from '../src/index.js';

describe('Payment Types', () => {
  test('Money type', () => {
    const money: Money = {
      amount: 2000,
      currency: 'USD',
    };

    expect(money.amount).toBe(2000);
    expect(money.currency).toBe('USD');
  });

  test('Customer type', () => {
    const customer: Customer = {
      id: 'cus_123',
      email: 'test@example.com',
      name: 'Test User',
      phone: '+1234567890',
      metadata: { tier: 'premium' },
    };

    expect(customer.id).toBe('cus_123');
    expect(customer.email).toBe('test@example.com');
    expect(customer.metadata?.tier).toBe('premium');
  });

  test('PaymentMethod type', () => {
    const paymentMethod: PaymentMethod = {
      id: 'pm_123',
      type: 'card',
      last4: '4242',
      brand: 'visa',
      expiryMonth: 12,
      expiryYear: 2025,
    };

    expect(paymentMethod.type).toBe('card');
    expect(paymentMethod.last4).toBe('4242');
    expect(paymentMethod.brand).toBe('visa');
  });

  test('PaymentIntent type', () => {
    const intent: PaymentIntent = {
      amount: { amount: 5000, currency: 'USD' },
      customerId: 'cus_123',
      description: 'Test payment',
      capture: true,
      metadata: { orderId: 'order_456' },
    };

    expect(intent.amount.amount).toBe(5000);
    expect(intent.customerId).toBe('cus_123');
    expect(intent.capture).toBe(true);
  });

  test('PaymentIntentResult type', () => {
    const result: PaymentIntentResult = {
      id: 'pi_123',
      status: 'succeeded',
      amount: { amount: 5000, currency: 'USD' },
      clientSecret: 'pi_123_secret',
      createdAt: new Date(),
    };

    expect(result.status).toBe('succeeded');
    expect(result.amount.amount).toBe(5000);
  });

  test('RefundRequest type', () => {
    const refund: RefundRequest = {
      paymentId: 'pi_123',
      amount: { amount: 2000, currency: 'USD' },
      reason: 'requested_by_customer',
    };

    expect(refund.paymentId).toBe('pi_123');
    expect(refund.reason).toBe('requested_by_customer');
  });

  test('RefundResult type', () => {
    const result: RefundResult = {
      id: 'ref_123',
      status: 'succeeded',
      amount: { amount: 2000, currency: 'USD' },
      createdAt: new Date(),
    };

    expect(result.status).toBe('succeeded');
    expect(result.amount.amount).toBe(2000);
  });

  test('SubscriptionPrice type', () => {
    const price: SubscriptionPrice = {
      id: 'price_123',
      interval: 'month',
      intervalCount: 1,
      amount: { amount: 1999, currency: 'USD' },
      trialDays: 14,
    };

    expect(price.interval).toBe('month');
    expect(price.trialDays).toBe(14);
  });

  test('Subscription type', () => {
    const subscription: Subscription = {
      customerId: 'cus_123',
      priceId: 'price_123',
      trialEnd: new Date('2025-12-31'),
      metadata: { plan: 'pro' },
    };

    expect(subscription.customerId).toBe('cus_123');
    expect(subscription.priceId).toBe('price_123');
  });

  test('SubscriptionResult type', () => {
    const result: SubscriptionResult = {
      id: 'sub_123',
      status: 'active',
      customerId: 'cus_123',
      currentPeriodStart: new Date('2025-01-01'),
      currentPeriodEnd: new Date('2025-02-01'),
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
    };

    expect(result.status).toBe('active');
    expect(result.cancelAtPeriodEnd).toBe(false);
  });

  test('WebhookEvent type', () => {
    const event: WebhookEvent = {
      id: 'evt_123',
      type: 'payment_intent.succeeded',
      data: { id: 'pi_123' },
      createdAt: new Date(),
    };

    expect(event.type).toBe('payment_intent.succeeded');
    expect(event.data.id).toBe('pi_123');
  });
});
