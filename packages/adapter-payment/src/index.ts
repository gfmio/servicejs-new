/**
 * Payment Types for ServiceJS
 *
 * Provides common types and interfaces for payment adapters.
 * This package defines the contract that all payment providers must implement.
 */

import type { Result } from '@servicejs/result';

/**
 * Money amount with currency
 */
export interface Money {
  /** Amount in smallest currency unit (e.g., cents for USD) */
  amount: number;
  /** ISO 4217 currency code */
  currency: string;
}

/**
 * Customer information
 */
export interface Customer {
  /** Unique customer ID from the provider */
  id: string;
  /** Customer email */
  email?: string;
  /** Customer name */
  name?: string;
  /** Customer phone */
  phone?: string;
  /** Custom metadata */
  metadata?: Record<string, string>;
}

/**
 * Payment method information
 */
export interface PaymentMethod {
  /** Unique payment method ID */
  id: string;
  /** Type of payment method */
  type: 'card' | 'bank_account' | 'wallet' | 'other';
  /** Last 4 digits (for cards/accounts) */
  last4?: string;
  /** Card brand (for cards) */
  brand?: string;
  /** Expiration month (for cards) */
  expiryMonth?: number;
  /** Expiration year (for cards) */
  expiryYear?: number;
}

/**
 * Payment intent for one-time payments
 */
export interface PaymentIntent {
  /** Amount to charge */
  amount: Money;
  /** Customer ID (optional) */
  customerId?: string;
  /** Payment method ID (optional, can be provided later) */
  paymentMethodId?: string;
  /** Description */
  description?: string;
  /** Statement descriptor */
  statementDescriptor?: string;
  /** Custom metadata */
  metadata?: Record<string, string>;
  /** Capture immediately or authorize only */
  capture?: boolean;
}

/**
 * Payment intent result
 */
export interface PaymentIntentResult {
  /** Unique payment intent ID */
  id: string;
  /** Payment status */
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' |
          'processing' | 'succeeded' | 'canceled' | 'failed';
  /** Amount */
  amount: Money;
  /** Client secret for client-side confirmation */
  clientSecret?: string;
  /** Next action required */
  nextAction?: {
    type: string;
    [key: string]: any;
  };
  /** Created timestamp */
  createdAt: Date;
}

/**
 * Refund request
 */
export interface RefundRequest {
  /** Payment intent or charge ID to refund */
  paymentId: string;
  /** Amount to refund (optional, defaults to full amount) */
  amount?: Money;
  /** Reason for refund */
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'other';
  /** Custom metadata */
  metadata?: Record<string, string>;
}

/**
 * Refund result
 */
export interface RefundResult {
  /** Unique refund ID */
  id: string;
  /** Refund status */
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  /** Refunded amount */
  amount: Money;
  /** Reason */
  reason?: string;
  /** Created timestamp */
  createdAt: Date;
}

/**
 * Subscription plan/price
 */
export interface SubscriptionPrice {
  /** Unique price ID */
  id: string;
  /** Recurring interval */
  interval: 'day' | 'week' | 'month' | 'year';
  /** Interval count (e.g., 2 for "every 2 months") */
  intervalCount?: number;
  /** Price amount */
  amount: Money;
  /** Trial period in days */
  trialDays?: number;
}

/**
 * Subscription
 */
export interface Subscription {
  /** Customer ID */
  customerId: string;
  /** Price/Plan ID */
  priceId: string;
  /** Payment method ID (optional) */
  paymentMethodId?: string;
  /** Trial period end date (optional) */
  trialEnd?: Date;
  /** Proration behavior */
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
  /** Custom metadata */
  metadata?: Record<string, string>;
}

/**
 * Subscription result
 */
export interface SubscriptionResult {
  /** Unique subscription ID */
  id: string;
  /** Subscription status */
  status: 'incomplete' | 'incomplete_expired' | 'trialing' | 'active' |
          'past_due' | 'canceled' | 'unpaid' | 'paused';
  /** Customer ID */
  customerId: string;
  /** Current period start */
  currentPeriodStart: Date;
  /** Current period end */
  currentPeriodEnd: Date;
  /** Cancel at period end */
  cancelAtPeriodEnd: boolean;
  /** Canceled at (if canceled) */
  canceledAt?: Date;
  /** Created timestamp */
  createdAt: Date;
}

/**
 * Webhook event
 */
export interface WebhookEvent {
  /** Event ID */
  id: string;
  /** Event type */
  type: string;
  /** Event data */
  data: any;
  /** Created timestamp */
  createdAt: Date;
}

/**
 * Generic payment adapter interface
 */
export interface PaymentAdapter<TConfig = any> {
  /**
   * Initialize the adapter with provider-specific configuration
   */
  init(config: TConfig): Promise<Result<void, Error>>;

  /**
   * Start the adapter (lifecycle method)
   */
  start(): Promise<Result<void, Error>>;

  /**
   * Stop the adapter (lifecycle method)
   */
  stop(): Promise<Result<void, Error>>;

  /**
   * Destroy the adapter and cleanup resources
   */
  destroy(): Promise<Result<void, Error>>;

  /**
   * Check adapter health
   */
  health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>;

  // Customer Management

  /**
   * Create a customer
   */
  createCustomer(email: string, options?: Partial<Omit<Customer, 'id' | 'email'>>): Promise<Result<Customer, Error>>;

  /**
   * Get customer by ID
   */
  getCustomer(customerId: string): Promise<Result<Customer, Error>>;

  /**
   * Update customer
   */
  updateCustomer(customerId: string, updates: Partial<Omit<Customer, 'id'>>): Promise<Result<Customer, Error>>;

  /**
   * Delete customer
   */
  deleteCustomer(customerId: string): Promise<Result<void, Error>>;

  // Payment Methods

  /**
   * Attach payment method to customer
   */
  attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<Result<PaymentMethod, Error>>;

  /**
   * List customer payment methods
   */
  listPaymentMethods(customerId: string): Promise<Result<PaymentMethod[], Error>>;

  /**
   * Detach payment method from customer
   */
  detachPaymentMethod(paymentMethodId: string): Promise<Result<void, Error>>;

  // One-Time Payments

  /**
   * Create a payment intent
   */
  createPaymentIntent(intent: PaymentIntent): Promise<Result<PaymentIntentResult, Error>>;

  /**
   * Get payment intent by ID
   */
  getPaymentIntent(paymentIntentId: string): Promise<Result<PaymentIntentResult, Error>>;

  /**
   * Confirm payment intent
   */
  confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string): Promise<Result<PaymentIntentResult, Error>>;

  /**
   * Cancel payment intent
   */
  cancelPaymentIntent(paymentIntentId: string): Promise<Result<PaymentIntentResult, Error>>;

  /**
   * Capture authorized payment
   */
  capturePayment(paymentIntentId: string, amount?: Money): Promise<Result<PaymentIntentResult, Error>>;

  // Refunds

  /**
   * Create a refund
   */
  createRefund(refund: RefundRequest): Promise<Result<RefundResult, Error>>;

  /**
   * Get refund by ID
   */
  getRefund(refundId: string): Promise<Result<RefundResult, Error>>;

  // Subscriptions

  /**
   * Create a subscription
   */
  createSubscription(subscription: Subscription): Promise<Result<SubscriptionResult, Error>>;

  /**
   * Get subscription by ID
   */
  getSubscription(subscriptionId: string): Promise<Result<SubscriptionResult, Error>>;

  /**
   * Update subscription
   */
  updateSubscription(subscriptionId: string, updates: Partial<Subscription>): Promise<Result<SubscriptionResult, Error>>;

  /**
   * Cancel subscription
   */
  cancelSubscription(subscriptionId: string, immediately?: boolean): Promise<Result<SubscriptionResult, Error>>;

  /**
   * Resume subscription
   */
  resumeSubscription(subscriptionId: string): Promise<Result<SubscriptionResult, Error>>;

  // Webhooks

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<Result<boolean, Error>>;

  /**
   * Parse webhook event
   */
  parseWebhookEvent(payload: string): Promise<Result<WebhookEvent, Error>>;
}
