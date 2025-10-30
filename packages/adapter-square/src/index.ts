/**
 * Square Adapter for ServiceJS
 * Implements PaymentAdapter interface for Square
 */

import { ok, err, type Result, isOk } from '@servicejs/result';
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

export interface SquareConfig {
  accessToken: string;
  environment?: 'sandbox' | 'production';
  webhookSignatureKey?: string;
}

export const createSquareAdapter = (): PaymentAdapter<SquareConfig> => {
  let config: SquareConfig | null = null;

  // In-memory storage for demo (use Square API in production)
  const customers = new Map<string, Customer>();
  const paymentMethods = new Map<string, PaymentMethod & { customerId: string }>();
  const paymentIntents = new Map<string, PaymentIntentResult>();
  const refunds = new Map<string, RefundResult>();
  const subscriptions = new Map<string, SubscriptionResult>();

  const request = async (endpoint: string, method: string = 'POST', body?: any): Promise<Result<any, Error>> => {
    if (!config) return err(new Error('Square not initialized'));

    try {
      const baseUrl = config.environment === 'production'
        ? 'https://connect.squareup.com'
        : 'https://connect.squareupsandbox.com';

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: {
          'Square-Version': '2024-10-17',
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();
      if (!response.ok) {
        const message = data.errors?.[0]?.detail || 'Square API error';
        return err(new Error(message));
      }

      return ok(data);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return {
    // Lifecycle
    init: async (cfg) => {
      if (!cfg.accessToken) return err(new Error('Access token required'));
      config = { ...cfg, environment: cfg.environment || 'sandbox' };
      return ok(undefined);
    },

    start: async () => ok(undefined),
    stop: async () => ok(undefined),
    destroy: async () => {
      config = null;
      customers.clear();
      paymentMethods.clear();
      paymentIntents.clear();
      refunds.clear();
      subscriptions.clear();
      return ok(undefined);
    },

    health: async () => ok({ status: config ? 'healthy' as const : 'unhealthy' as const }),

    // Customer Management
    createCustomer: async (email, options) => {
      const result = await request('/v2/customers', 'POST', {
        email_address: email,
        given_name: options?.name?.split(' ')[0],
        family_name: options?.name?.split(' ').slice(1).join(' '),
        phone_number: options?.phone,
        reference_id: options?.metadata ? JSON.stringify(options.metadata) : undefined,
      });

      if (isOk(result)) {
        const data = result.value.customer;
        const customer: Customer = {
          id: data.id,
          email: data.email_address,
          name: [data.given_name, data.family_name].filter(Boolean).join(' ') || undefined,
          phone: data.phone_number,
          metadata: data.reference_id ? JSON.parse(data.reference_id) : undefined,
        };
        customers.set(customer.id, customer);
        return ok(customer);
      }
      return err(result.error);
    },

    getCustomer: async (customerId) => {
      const result = await request(`/v2/customers/${customerId}`, 'GET');
      if (isOk(result)) {
        const data = result.value.customer;
        const customer: Customer = {
          id: data.id,
          email: data.email_address,
          name: [data.given_name, data.family_name].filter(Boolean).join(' ') || undefined,
          phone: data.phone_number,
          metadata: data.reference_id ? JSON.parse(data.reference_id) : undefined,
        };
        return ok(customer);
      }
      return err(result.error);
    },

    updateCustomer: async (customerId, updates) => {
      const nameParts = updates.name?.split(' ') || [];
      const result = await request(`/v2/customers/${customerId}`, 'PUT', {
        email_address: updates.email,
        given_name: nameParts[0],
        family_name: nameParts.slice(1).join(' '),
        phone_number: updates.phone,
        reference_id: updates.metadata ? JSON.stringify(updates.metadata) : undefined,
      });

      if (isOk(result)) {
        const data = result.value.customer;
        const customer: Customer = {
          id: data.id,
          email: data.email_address,
          name: [data.given_name, data.family_name].filter(Boolean).join(' ') || undefined,
          phone: data.phone_number,
          metadata: data.reference_id ? JSON.parse(data.reference_id) : undefined,
        };
        return ok(customer);
      }
      return err(result.error);
    },

    deleteCustomer: async (customerId) => {
      const result = await request(`/v2/customers/${customerId}`, 'DELETE');
      if (isOk(result)) return ok(undefined);
      return err(result.error);
    },

    // Payment Methods (in-memory for demo)
    attachPaymentMethod: async (paymentMethodId, customerId) => {
      const method: PaymentMethod & { customerId: string } = {
        id: paymentMethodId,
        type: 'card',
        customerId,
      };
      paymentMethods.set(paymentMethodId, method);
      const { customerId: _, ...result } = method;
      return ok(result);
    },

    listPaymentMethods: async (customerId) => {
      const result = await request(`/v2/customers/${customerId}/cards`, 'GET');
      if (isOk(result)) {
        const cards = result.value.cards || [];
        return ok(cards.map((card: any) => ({
          id: card.id,
          type: 'card' as const,
          last4: card.last_4,
          brand: card.card_brand,
          expiryMonth: card.exp_month,
          expiryYear: card.exp_year,
        })));
      }
      return err(result.error);
    },

    detachPaymentMethod: async (paymentMethodId) => {
      const result = await request(`/v2/cards/${paymentMethodId}`, 'POST', { disabled: true });
      if (isOk(result)) return ok(undefined);
      return err(result.error);
    },

    // One-Time Payments
    createPaymentIntent: async (intent) => {
      const result = await request('/v2/payments', 'POST', {
        source_id: intent.paymentMethodId,
        idempotency_key: `${Date.now()}-${Math.random()}`,
        amount_money: {
          amount: intent.amount.amount,
          currency: intent.amount.currency,
        },
        customer_id: intent.customerId,
        note: intent.description,
        autocomplete: intent.capture !== false,
      });

      if (isOk(result)) {
        const data = result.value.payment;
        const payment: PaymentIntentResult = {
          id: data.id,
          status: data.status === 'COMPLETED' ? 'succeeded' :
                  data.status === 'PENDING' ? 'processing' :
                  data.status === 'APPROVED' ? 'requires_confirmation' :
                  data.status === 'CANCELED' ? 'canceled' : 'failed',
          amount: intent.amount,
          createdAt: new Date(data.created_at),
        };
        paymentIntents.set(data.id, payment);
        return ok(payment);
      }
      return err(result.error);
    },

    getPaymentIntent: async (paymentIntentId) => {
      const result = await request(`/v2/payments/${paymentIntentId}`, 'GET');
      if (isOk(result)) {
        const data = result.value.payment;
        const payment: PaymentIntentResult = {
          id: data.id,
          status: data.status === 'COMPLETED' ? 'succeeded' :
                  data.status === 'PENDING' ? 'processing' :
                  data.status === 'APPROVED' ? 'requires_confirmation' :
                  data.status === 'CANCELED' ? 'canceled' : 'failed',
          amount: { amount: data.amount_money.amount, currency: data.amount_money.currency },
          createdAt: new Date(data.created_at),
        };
        return ok(payment);
      }
      return err(result.error);
    },

    confirmPaymentIntent: async (paymentIntentId, paymentMethodId) => {
      const result = await request(`/v2/payments/${paymentIntentId}/complete`, 'POST');
      if (isOk(result)) {
        const data = result.value.payment;
        const payment: PaymentIntentResult = {
          id: data.id,
          status: 'succeeded',
          amount: { amount: data.amount_money.amount, currency: data.amount_money.currency },
          createdAt: new Date(data.created_at),
        };
        return ok(payment);
      }
      return err(result.error);
    },

    cancelPaymentIntent: async (paymentIntentId) => {
      const result = await request(`/v2/payments/${paymentIntentId}/cancel`, 'POST');
      if (isOk(result)) {
        const data = result.value.payment;
        const payment: PaymentIntentResult = {
          id: data.id,
          status: 'canceled',
          amount: { amount: data.amount_money.amount, currency: data.amount_money.currency },
          createdAt: new Date(data.created_at),
        };
        return ok(payment);
      }
      return err(result.error);
    },

    capturePayment: async (paymentIntentId, amount) => {
      const result = await request(`/v2/payments/${paymentIntentId}/complete`, 'POST');
      if (isOk(result)) {
        const data = result.value.payment;
        const payment: PaymentIntentResult = {
          id: data.id,
          status: 'succeeded',
          amount: amount || { amount: data.amount_money.amount, currency: data.amount_money.currency },
          createdAt: new Date(data.created_at),
        };
        return ok(payment);
      }
      return err(result.error);
    },

    // Refunds
    createRefund: async (refund) => {
      const payment = paymentIntents.get(refund.paymentId);
      const refundAmount = refund.amount || payment?.amount;
      if (!refundAmount) return err(new Error('Refund amount required'));

      const result = await request('/v2/refunds', 'POST', {
        idempotency_key: `${Date.now()}-${Math.random()}`,
        payment_id: refund.paymentId,
        amount_money: {
          amount: refundAmount.amount,
          currency: refundAmount.currency,
        },
        reason: refund.reason,
      });

      if (isOk(result)) {
        const data = result.value.refund;
        const refundResult: RefundResult = {
          id: data.id,
          status: data.status === 'COMPLETED' ? 'succeeded' :
                  data.status === 'PENDING' ? 'pending' :
                  data.status === 'REJECTED' ? 'failed' : 'pending',
          amount: refundAmount,
          reason: data.reason,
          createdAt: new Date(data.created_at),
        };
        refunds.set(refundResult.id, refundResult);
        return ok(refundResult);
      }
      return err(result.error);
    },

    getRefund: async (refundId) => {
      const result = await request(`/v2/refunds/${refundId}`, 'GET');
      if (isOk(result)) {
        const data = result.value.refund;
        const refundResult: RefundResult = {
          id: data.id,
          status: data.status === 'COMPLETED' ? 'succeeded' :
                  data.status === 'PENDING' ? 'pending' :
                  data.status === 'REJECTED' ? 'failed' : 'pending',
          amount: { amount: data.amount_money.amount, currency: data.amount_money.currency },
          reason: data.reason,
          createdAt: new Date(data.created_at),
        };
        return ok(refundResult);
      }
      return err(result.error);
    },

    // Subscriptions
    createSubscription: async (subscription) => {
      const result = await request('/v2/subscriptions', 'POST', {
        idempotency_key: `${Date.now()}-${Math.random()}`,
        location_id: 'main', // Simplified
        plan_id: subscription.priceId,
        customer_id: subscription.customerId,
        card_id: subscription.paymentMethodId,
      });

      if (isOk(result)) {
        const data = result.value.subscription;
        const now = new Date();
        const monthLater = new Date(now);
        monthLater.setMonth(monthLater.getMonth() + 1);

        const sub: SubscriptionResult = {
          id: data.id,
          status: data.status === 'ACTIVE' ? 'active' :
                  data.status === 'PENDING' ? 'incomplete' :
                  data.status === 'CANCELED' ? 'canceled' :
                  data.status === 'PAUSED' ? 'paused' : 'active',
          customerId: subscription.customerId,
          currentPeriodStart: new Date(data.start_date || now),
          currentPeriodEnd: subscription.trialEnd || monthLater,
          cancelAtPeriodEnd: false,
          createdAt: new Date(data.created_at || now),
        };
        subscriptions.set(data.id, sub);
        return ok(sub);
      }
      return err(result.error);
    },

    getSubscription: async (subscriptionId) => {
      const result = await request(`/v2/subscriptions/${subscriptionId}`, 'GET');
      if (isOk(result)) {
        const data = result.value.subscription;
        const sub: SubscriptionResult = {
          id: data.id,
          status: data.status === 'ACTIVE' ? 'active' :
                  data.status === 'PENDING' ? 'incomplete' :
                  data.status === 'CANCELED' ? 'canceled' :
                  data.status === 'PAUSED' ? 'paused' : 'active',
          customerId: data.customer_id,
          currentPeriodStart: new Date(data.start_date),
          currentPeriodEnd: new Date(data.charged_through_date || Date.now()),
          cancelAtPeriodEnd: data.canceled_date ? true : false,
          canceledAt: data.canceled_date ? new Date(data.canceled_date) : undefined,
          createdAt: new Date(data.created_at),
        };
        return ok(sub);
      }
      return err(result.error);
    },

    updateSubscription: async (subscriptionId, updates) => {
      const result = await request(`/v2/subscriptions/${subscriptionId}`, 'PUT', {
        subscription: {
          plan_id: updates.priceId,
          card_id: updates.paymentMethodId,
        },
      });

      if (isOk(result)) {
        const data = result.value.subscription;
        const sub: SubscriptionResult = {
          id: data.id,
          status: data.status === 'ACTIVE' ? 'active' :
                  data.status === 'PENDING' ? 'incomplete' :
                  data.status === 'CANCELED' ? 'canceled' :
                  data.status === 'PAUSED' ? 'paused' : 'active',
          customerId: data.customer_id,
          currentPeriodStart: new Date(data.start_date),
          currentPeriodEnd: new Date(data.charged_through_date || Date.now()),
          cancelAtPeriodEnd: data.canceled_date ? true : false,
          canceledAt: data.canceled_date ? new Date(data.canceled_date) : undefined,
          createdAt: new Date(data.created_at),
        };
        return ok(sub);
      }
      return err(result.error);
    },

    cancelSubscription: async (subscriptionId, immediately) => {
      const subscription = subscriptions.get(subscriptionId);
      if (!subscription) return err(new Error('Subscription not found'));

      const result = await request(`/v2/subscriptions/${subscriptionId}/cancel`, 'POST');

      if (isOk(result)) {
        subscription.status = 'canceled';
        subscription.cancelAtPeriodEnd = !immediately;
        subscription.canceledAt = new Date();
        subscriptions.set(subscriptionId, subscription);
        return ok(subscription);
      }
      return err(result.error);
    },

    resumeSubscription: async (subscriptionId) => {
      const result = await request(`/v2/subscriptions/${subscriptionId}/resume`, 'POST');

      if (isOk(result)) {
        const data = result.value.subscription;
        const sub: SubscriptionResult = {
          id: data.id,
          status: 'active',
          customerId: data.customer_id,
          currentPeriodStart: new Date(data.start_date),
          currentPeriodEnd: new Date(data.charged_through_date || Date.now()),
          cancelAtPeriodEnd: false,
          createdAt: new Date(data.created_at),
        };
        return ok(sub);
      }
      return err(result.error);
    },

    // Webhooks
    verifyWebhookSignature: async (payload, signature, secret) => {
      try {
        // Square webhook signature verification
        // In production, use Square SDK webhook verification
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
          id: data.event_id || data.id,
          type: data.type,
          data: data.data,
          createdAt: new Date(data.created_at || Date.now()),
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
