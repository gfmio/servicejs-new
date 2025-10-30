/**
 * Stripe Adapter for ServiceJS
 * Payment processing with Stripe API
 */

import { ok, err, type Result } from '@servicejs/result';

export interface StripeAdapterConfig {
  apiKey: string;
  apiVersion?: string;
  webhookSecret?: string;
}

export interface PaymentIntent {
  amount: number;
  currency: string;
  customer?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface Subscription {
  customer: string;
  priceId: string;
  metadata?: Record<string, string>;
}

export interface StripeAdapter {
  init(config: StripeAdapterConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>;

  createPaymentIntent(intent: PaymentIntent): Promise<Result<any, Error>>;
  createCustomer(email: string, metadata?: Record<string, string>): Promise<Result<any, Error>>;
  createSubscription(subscription: Subscription): Promise<Result<any, Error>>;
  cancelSubscription(subscriptionId: string): Promise<Result<any, Error>>;
}

export const createStripeAdapter = (): StripeAdapter => {
  let config: StripeAdapterConfig | null = null;

  const request = async (endpoint: string, method: string = 'POST', body?: any): Promise<Result<any, Error>> => {
    if (!config) return err(new Error('Stripe not initialized'));

    try {
      const response = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Stripe-Version': config.apiVersion || '2023-10-16',
        },
        body: body ? new URLSearchParams(body).toString() : undefined,
      });

      const data = await response.json();
      if (!response.ok) return err(new Error(data.error?.message || 'Stripe API error'));

      return ok(data);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return {
    init: async (cfg) => {
      if (!cfg.apiKey) return err(new Error('API key required'));
      config = cfg;
      return ok(undefined);
    },

    start: async () => ok(undefined),
    stop: async () => ok(undefined),
    destroy: async () => { config = null; return ok(undefined); },

    health: async () => ok({ status: config ? 'healthy' as const : 'unhealthy' as const }),

    createPaymentIntent: async (intent) =>
      request('payment_intents', 'POST', intent),

    createCustomer: async (email, metadata) =>
      request('customers', 'POST', { email, ...metadata }),

    createSubscription: async (subscription) =>
      request('subscriptions', 'POST', subscription),

    cancelSubscription: async (subscriptionId) =>
      request(`subscriptions/${subscriptionId}`, 'DELETE'),
  };
};
