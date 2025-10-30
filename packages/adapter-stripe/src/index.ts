/**
 * Stripe Adapter for ServiceJS
 * Payment processing with Stripe API
 */

import { ok, err, type Result } from '@servicejs/result';
import type {
  PaymentAdapter,
  Customer,
  PaymentMethod,
  PaymentIntent,
  PaymentIntentResult,
  RefundRequest,
  RefundResult,
  Subscription,
  SubscriptionResult,
  WebhookEvent,
  Money,
} from '@servicejs/adapter-payment';

export interface StripeAdapterConfig {
  apiKey: string;
  apiVersion?: string;
  webhookSecret?: string;
}

export const createStripeAdapter = (): PaymentAdapter<StripeAdapterConfig> => {
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
    // Lifecycle
    init: async (cfg) => {
      if (!cfg.apiKey) return err(new Error('API key required'));
      config = cfg;
      return ok(undefined);
    },

    start: async () => ok(undefined),
    stop: async () => ok(undefined),
    destroy: async () => { config = null; return ok(undefined); },

    health: async () => ok({ status: config ? 'healthy' as const : 'unhealthy' as const }),

    // Customer Management
    createCustomer: async (email, options) => {
      const result = await request('customers', 'POST', { email, ...options });
      if (result.ok) {
        const data = result.value;
        return ok({
          id: data.id,
          email: data.email,
          name: data.name,
          phone: data.phone,
          metadata: data.metadata,
        });
      }
      return err(result.error);
    },

    getCustomer: async (customerId) => {
      const result = await request(`customers/${customerId}`, 'GET');
      if (result.ok) {
        const data = result.value;
        return ok({
          id: data.id,
          email: data.email,
          name: data.name,
          phone: data.phone,
          metadata: data.metadata,
        });
      }
      return err(result.error);
    },

    updateCustomer: async (customerId, updates) => {
      const result = await request(`customers/${customerId}`, 'POST', updates);
      if (result.ok) {
        const data = result.value;
        return ok({
          id: data.id,
          email: data.email,
          name: data.name,
          phone: data.phone,
          metadata: data.metadata,
        });
      }
      return err(result.error);
    },

    deleteCustomer: async (customerId) => {
      const result = await request(`customers/${customerId}`, 'DELETE');
      if (result.ok) return ok(undefined);
      return err(result.error);
    },

    // Payment Methods
    attachPaymentMethod: async (paymentMethodId, customerId) => {
      const result = await request(`payment_methods/${paymentMethodId}/attach`, 'POST', { customer: customerId });
      if (result.ok) {
        const data = result.value;
        return ok({
          id: data.id,
          type: data.type === 'card' ? 'card' : data.type === 'us_bank_account' ? 'bank_account' : 'other',
          last4: data.card?.last4 || data.us_bank_account?.last4,
          brand: data.card?.brand,
          expiryMonth: data.card?.exp_month,
          expiryYear: data.card?.exp_year,
        });
      }
      return err(result.error);
    },

    listPaymentMethods: async (customerId) => {
      const result = await request(`payment_methods?customer=${customerId}`, 'GET');
      if (result.ok) {
        const data = result.value.data || [];
        return ok(data.map((pm: any) => ({
          id: pm.id,
          type: pm.type === 'card' ? 'card' as const : pm.type === 'us_bank_account' ? 'bank_account' as const : 'other' as const,
          last4: pm.card?.last4 || pm.us_bank_account?.last4,
          brand: pm.card?.brand,
          expiryMonth: pm.card?.exp_month,
          expiryYear: pm.card?.exp_year,
        })));
      }
      return err(result.error);
    },

    detachPaymentMethod: async (paymentMethodId) => {
      const result = await request(`payment_methods/${paymentMethodId}/detach`, 'POST');
      if (result.ok) return ok(undefined);
      return err(result.error);
    },

    // One-Time Payments
    createPaymentIntent: async (intent) => {
      const body: any = {
        amount: intent.amount.amount,
        currency: intent.amount.currency,
        description: intent.description,
        statement_descriptor: intent.statementDescriptor,
        metadata: intent.metadata,
        capture_method: intent.capture === false ? 'manual' : 'automatic',
      };
      if (intent.customerId) body.customer = intent.customerId;
      if (intent.paymentMethodId) body.payment_method = intent.paymentMethodId;

      const result = await request('payment_intents', 'POST', body);
      if (result.ok) {
        const data = result.value;
        return ok({
          id: data.id,
          status: data.status,
          amount: { amount: data.amount, currency: data.currency },
          clientSecret: data.client_secret,
          nextAction: data.next_action,
          createdAt: new Date(data.created * 1000),
        });
      }
      return err(result.error);
    },

    getPaymentIntent: async (paymentIntentId) => {
      const result = await request(`payment_intents/${paymentIntentId}`, 'GET');
      if (result.ok) {
        const data = result.value;
        return ok({
          id: data.id,
          status: data.status,
          amount: { amount: data.amount, currency: data.currency },
          clientSecret: data.client_secret,
          nextAction: data.next_action,
          createdAt: new Date(data.created * 1000),
        });
      }
      return err(result.error);
    },

    confirmPaymentIntent: async (paymentIntentId, paymentMethodId) => {
      const body: any = {};
      if (paymentMethodId) body.payment_method = paymentMethodId;

      const result = await request(`payment_intents/${paymentIntentId}/confirm`, 'POST', body);
      if (result.ok) {
        const data = result.value;
        return ok({
          id: data.id,
          status: data.status,
          amount: { amount: data.amount, currency: data.currency },
          clientSecret: data.client_secret,
          nextAction: data.next_action,
          createdAt: new Date(data.created * 1000),
        });
      }
      return err(result.error);
    },

    cancelPaymentIntent: async (paymentIntentId) => {
      const result = await request(`payment_intents/${paymentIntentId}/cancel`, 'POST');
      if (result.ok) {
        const data = result.value;
        return ok({
          id: data.id,
          status: data.status,
          amount: { amount: data.amount, currency: data.currency },
          clientSecret: data.client_secret,
          nextAction: data.next_action,
          createdAt: new Date(data.created * 1000),
        });
      }
      return err(result.error);
    },

    capturePayment: async (paymentIntentId, amount) => {
      const body: any = {};
      if (amount) body.amount_to_capture = amount.amount;

      const result = await request(`payment_intents/${paymentIntentId}/capture`, 'POST', body);
      if (result.ok) {
        const data = result.value;
        return ok({
          id: data.id,
          status: data.status,
          amount: { amount: data.amount, currency: data.currency },
          clientSecret: data.client_secret,
          nextAction: data.next_action,
          createdAt: new Date(data.created * 1000),
        });
      }
      return err(result.error);
    },

    // Refunds
    createRefund: async (refund) => {
      const body: any = {
        payment_intent: refund.paymentId,
        reason: refund.reason,
        metadata: refund.metadata,
      };
      if (refund.amount) body.amount = refund.amount.amount;

      const result = await request('refunds', 'POST', body);
      if (result.ok) {
        const data = result.value;
        return ok({
          id: data.id,
          status: data.status,
          amount: { amount: data.amount, currency: data.currency },
          reason: data.reason,
          createdAt: new Date(data.created * 1000),
        });
      }
      return err(result.error);
    },

    getRefund: async (refundId) => {
      const result = await request(`refunds/${refundId}`, 'GET');
      if (result.ok) {
        const data = result.value;
        return ok({
          id: data.id,
          status: data.status,
          amount: { amount: data.amount, currency: data.currency },
          reason: data.reason,
          createdAt: new Date(data.created * 1000),
        });
      }
      return err(result.error);
    },

    // Subscriptions
    createSubscription: async (subscription) => {
      const body: any = {
        customer: subscription.customerId,
        items: [{ price: subscription.priceId }],
        metadata: subscription.metadata,
        proration_behavior: subscription.prorationBehavior,
      };
      if (subscription.paymentMethodId) body.default_payment_method = subscription.paymentMethodId;
      if (subscription.trialEnd) body.trial_end = Math.floor(subscription.trialEnd.getTime() / 1000);

      const result = await request('subscriptions', 'POST', body);
      if (result.ok) {
        const data = result.value;
        return ok({
          id: data.id,
          status: data.status,
          customerId: data.customer,
          currentPeriodStart: new Date(data.current_period_start * 1000),
          currentPeriodEnd: new Date(data.current_period_end * 1000),
          cancelAtPeriodEnd: data.cancel_at_period_end,
          canceledAt: data.canceled_at ? new Date(data.canceled_at * 1000) : undefined,
          createdAt: new Date(data.created * 1000),
        });
      }
      return err(result.error);
    },

    getSubscription: async (subscriptionId) => {
      const result = await request(`subscriptions/${subscriptionId}`, 'GET');
      if (result.ok) {
        const data = result.value;
        return ok({
          id: data.id,
          status: data.status,
          customerId: data.customer,
          currentPeriodStart: new Date(data.current_period_start * 1000),
          currentPeriodEnd: new Date(data.current_period_end * 1000),
          cancelAtPeriodEnd: data.cancel_at_period_end,
          canceledAt: data.canceled_at ? new Date(data.canceled_at * 1000) : undefined,
          createdAt: new Date(data.created * 1000),
        });
      }
      return err(result.error);
    },

    updateSubscription: async (subscriptionId, updates) => {
      const body: any = { metadata: updates.metadata };
      if (updates.paymentMethodId) body.default_payment_method = updates.paymentMethodId;
      if (updates.priceId) body.items = [{ price: updates.priceId }];
      if (updates.prorationBehavior) body.proration_behavior = updates.prorationBehavior;
      if (updates.trialEnd) body.trial_end = Math.floor(updates.trialEnd.getTime() / 1000);

      const result = await request(`subscriptions/${subscriptionId}`, 'POST', body);
      if (result.ok) {
        const data = result.value;
        return ok({
          id: data.id,
          status: data.status,
          customerId: data.customer,
          currentPeriodStart: new Date(data.current_period_start * 1000),
          currentPeriodEnd: new Date(data.current_period_end * 1000),
          cancelAtPeriodEnd: data.cancel_at_period_end,
          canceledAt: data.canceled_at ? new Date(data.canceled_at * 1000) : undefined,
          createdAt: new Date(data.created * 1000),
        });
      }
      return err(result.error);
    },

    cancelSubscription: async (subscriptionId, immediately) => {
      const body: any = immediately ? { prorate: true } : { cancel_at_period_end: true };
      const endpoint = immediately ? `subscriptions/${subscriptionId}` : `subscriptions/${subscriptionId}`;
      const method = immediately ? 'DELETE' : 'POST';

      const result = await request(endpoint, method, immediately ? undefined : body);
      if (result.ok) {
        const data = result.value;
        return ok({
          id: data.id,
          status: data.status,
          customerId: data.customer,
          currentPeriodStart: new Date(data.current_period_start * 1000),
          currentPeriodEnd: new Date(data.current_period_end * 1000),
          cancelAtPeriodEnd: data.cancel_at_period_end,
          canceledAt: data.canceled_at ? new Date(data.canceled_at * 1000) : undefined,
          createdAt: new Date(data.created * 1000),
        });
      }
      return err(result.error);
    },

    resumeSubscription: async (subscriptionId) => {
      const result = await request(`subscriptions/${subscriptionId}`, 'POST', { cancel_at_period_end: false });
      if (result.ok) {
        const data = result.value;
        return ok({
          id: data.id,
          status: data.status,
          customerId: data.customer,
          currentPeriodStart: new Date(data.current_period_start * 1000),
          currentPeriodEnd: new Date(data.current_period_end * 1000),
          cancelAtPeriodEnd: data.cancel_at_period_end,
          canceledAt: data.canceled_at ? new Date(data.canceled_at * 1000) : undefined,
          createdAt: new Date(data.created * 1000),
        });
      }
      return err(result.error);
    },

    // Webhooks
    verifyWebhookSignature: async (payload, signature, secret) => {
      try {
        // Stripe webhook signature verification
        // In production, use Stripe SDK: stripe.webhooks.constructEvent(payload, signature, secret)
        // For now, simple validation
        if (!signature || !secret) return ok(false);
        return ok(true);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    parseWebhookEvent: async (payload) => {
      try {
        const data = JSON.parse(payload);
        return ok({
          id: data.id,
          type: data.type,
          data: data.data.object,
          createdAt: new Date(data.created * 1000),
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
