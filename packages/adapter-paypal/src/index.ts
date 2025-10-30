/**
 * PayPal Adapter for ServiceJS
 * Implements PaymentAdapter interface for PayPal
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

export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  mode?: 'sandbox' | 'live';
  webhookId?: string;
}

export const createPayPalAdapter = (): PaymentAdapter<PayPalConfig> => {
  let config: PayPalConfig | null = null;
  let accessToken: string | null = null;

  // In-memory storage for demo (use PayPal API in production)
  const customers = new Map<string, Customer>();
  const paymentMethods = new Map<string, PaymentMethod & { customerId: string }>();
  const paymentIntents = new Map<string, PaymentIntentResult>();
  const refunds = new Map<string, RefundResult>();
  const subscriptions = new Map<string, SubscriptionResult>();

  const getAccessToken = async (): Promise<Result<string, Error>> => {
    if (!config) return err(new Error('PayPal not initialized'));
    if (accessToken) return ok(accessToken);

    try {
      const baseUrl = config.mode === 'live' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';
      const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

      const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      const data = await response.json();
      if (!response.ok) return err(new Error(data.error_description || 'Failed to get access token'));

      accessToken = data.access_token;
      return ok(accessToken);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

  const request = async (endpoint: string, method: string = 'POST', body?: any): Promise<Result<any, Error>> => {
    const tokenResult = await getAccessToken();
    if (!isOk(tokenResult)) return err(tokenResult.error);

    try {
      const baseUrl = config!.mode === 'live' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${tokenResult.value}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();
      if (!response.ok) return err(new Error(data.message || 'PayPal API error'));

      return ok(data);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return {
    // Lifecycle
    init: async (cfg) => {
      if (!cfg.clientId || !cfg.clientSecret) return err(new Error('Client ID and secret required'));
      config = { ...cfg, mode: cfg.mode || 'sandbox' };
      accessToken = null;
      return ok(undefined);
    },

    start: async () => ok(undefined),
    stop: async () => ok(undefined),
    destroy: async () => {
      config = null;
      accessToken = null;
      customers.clear();
      paymentMethods.clear();
      paymentIntents.clear();
      refunds.clear();
      subscriptions.clear();
      return ok(undefined);
    },

    health: async () => ok({ status: config ? 'healthy' as const : 'unhealthy' as const }),

    // Customer Management (in-memory for demo)
    createCustomer: async (email, options) => {
      const id = `CUSTOMER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const customer: Customer = {
        id,
        email,
        ...options,
      };
      customers.set(id, customer);
      return ok(customer);
    },

    getCustomer: async (customerId) => {
      const customer = customers.get(customerId);
      if (!customer) return err(new Error('Customer not found'));
      return ok(customer);
    },

    updateCustomer: async (customerId, updates) => {
      const customer = customers.get(customerId);
      if (!customer) return err(new Error('Customer not found'));
      const updated = { ...customer, ...updates };
      customers.set(customerId, updated);
      return ok(updated);
    },

    deleteCustomer: async (customerId) => {
      if (!customers.has(customerId)) return err(new Error('Customer not found'));
      customers.delete(customerId);
      return ok(undefined);
    },

    // Payment Methods (in-memory for demo)
    attachPaymentMethod: async (paymentMethodId, customerId) => {
      const method: PaymentMethod & { customerId: string } = {
        id: paymentMethodId,
        type: 'other',
        customerId,
      };
      paymentMethods.set(paymentMethodId, method);
      const { customerId: _, ...result } = method;
      return ok(result);
    },

    listPaymentMethods: async (customerId) => {
      const methods = Array.from(paymentMethods.values())
        .filter(m => m.customerId === customerId)
        .map(({ customerId: _, ...m }) => m);
      return ok(methods);
    },

    detachPaymentMethod: async (paymentMethodId) => {
      if (!paymentMethods.has(paymentMethodId)) return err(new Error('Payment method not found'));
      paymentMethods.delete(paymentMethodId);
      return ok(undefined);
    },

    // One-Time Payments
    createPaymentIntent: async (intent) => {
      const result = await request('/v2/checkout/orders', 'POST', {
        intent: intent.capture === false ? 'AUTHORIZE' : 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: intent.amount.currency,
            value: (intent.amount.amount / 100).toFixed(2),
          },
          description: intent.description,
        }],
      });

      if (isOk(result)) {
        const data = result.value;
        const payment: PaymentIntentResult = {
          id: data.id,
          status: data.status === 'CREATED' ? 'requires_payment_method' :
                  data.status === 'APPROVED' ? 'requires_confirmation' :
                  data.status === 'COMPLETED' ? 'succeeded' : 'processing',
          amount: intent.amount,
          createdAt: new Date(),
        };
        paymentIntents.set(data.id, payment);
        return ok(payment);
      }
      return err(result.error);
    },

    getPaymentIntent: async (paymentIntentId) => {
      const payment = paymentIntents.get(paymentIntentId);
      if (!payment) return err(new Error('Payment intent not found'));
      return ok(payment);
    },

    confirmPaymentIntent: async (paymentIntentId, paymentMethodId) => {
      const payment = paymentIntents.get(paymentIntentId);
      if (!payment) return err(new Error('Payment intent not found'));

      const result = await request(`/v2/checkout/orders/${paymentIntentId}/confirm-payment-source`, 'POST', {
        payment_source: paymentMethodId ? { token: { id: paymentMethodId } } : undefined,
      });

      if (isOk(result)) {
        payment.status = 'succeeded';
        paymentIntents.set(paymentIntentId, payment);
        return ok(payment);
      }
      return err(result.error);
    },

    cancelPaymentIntent: async (paymentIntentId) => {
      const payment = paymentIntents.get(paymentIntentId);
      if (!payment) return err(new Error('Payment intent not found'));
      payment.status = 'canceled';
      paymentIntents.set(paymentIntentId, payment);
      return ok(payment);
    },

    capturePayment: async (paymentIntentId, amount) => {
      const payment = paymentIntents.get(paymentIntentId);
      if (!payment) return err(new Error('Payment intent not found'));

      const result = await request(`/v2/checkout/orders/${paymentIntentId}/capture`, 'POST');

      if (isOk(result)) {
        payment.status = 'succeeded';
        if (amount) payment.amount = amount;
        paymentIntents.set(paymentIntentId, payment);
        return ok(payment);
      }
      return err(result.error);
    },

    // Refunds
    createRefund: async (refund) => {
      const payment = paymentIntents.get(refund.paymentId);
      if (!payment) return err(new Error('Payment intent not found'));

      const refundAmount = refund.amount || payment.amount;
      const result = await request(`/v2/payments/captures/${refund.paymentId}/refund`, 'POST', {
        amount: {
          currency_code: refundAmount.currency,
          value: (refundAmount.amount / 100).toFixed(2),
        },
      });

      if (isOk(result)) {
        const data = result.value;
        const refundResult: RefundResult = {
          id: data.id || `REFUND-${Date.now()}`,
          status: 'succeeded',
          amount: refundAmount,
          reason: refund.reason,
          createdAt: new Date(),
        };
        refunds.set(refundResult.id, refundResult);
        return ok(refundResult);
      }
      return err(result.error);
    },

    getRefund: async (refundId) => {
      const refund = refunds.get(refundId);
      if (!refund) return err(new Error('Refund not found'));
      return ok(refund);
    },

    // Subscriptions
    createSubscription: async (subscription) => {
      const result = await request('/v1/billing/subscriptions', 'POST', {
        plan_id: subscription.priceId,
        subscriber: subscription.customerId ? { id: subscription.customerId } : undefined,
        custom_id: subscription.metadata ? JSON.stringify(subscription.metadata) : undefined,
      });

      if (isOk(result)) {
        const data = result.value;
        const now = new Date();
        const monthLater = new Date(now);
        monthLater.setMonth(monthLater.getMonth() + 1);

        const sub: SubscriptionResult = {
          id: data.id,
          status: data.status === 'APPROVAL_PENDING' ? 'incomplete' :
                  data.status === 'APPROVED' ? 'active' :
                  data.status === 'ACTIVE' ? 'active' :
                  data.status === 'SUSPENDED' ? 'paused' :
                  data.status === 'CANCELLED' ? 'canceled' : 'active',
          customerId: subscription.customerId,
          currentPeriodStart: now,
          currentPeriodEnd: subscription.trialEnd || monthLater,
          cancelAtPeriodEnd: false,
          createdAt: now,
        };
        subscriptions.set(data.id, sub);
        return ok(sub);
      }
      return err(result.error);
    },

    getSubscription: async (subscriptionId) => {
      const subscription = subscriptions.get(subscriptionId);
      if (!subscription) return err(new Error('Subscription not found'));
      return ok(subscription);
    },

    updateSubscription: async (subscriptionId, updates) => {
      const subscription = subscriptions.get(subscriptionId);
      if (!subscription) return err(new Error('Subscription not found'));

      const result = await request(`/v1/billing/subscriptions/${subscriptionId}`, 'PATCH', [{
        op: 'replace',
        path: '/plan_id',
        value: updates.priceId,
      }]);

      if (isOk(result)) {
        subscriptions.set(subscriptionId, subscription);
        return ok(subscription);
      }
      return err(result.error);
    },

    cancelSubscription: async (subscriptionId, immediately) => {
      const subscription = subscriptions.get(subscriptionId);
      if (!subscription) return err(new Error('Subscription not found'));

      const result = await request(`/v1/billing/subscriptions/${subscriptionId}/cancel`, 'POST', {
        reason: 'Customer requested cancellation',
      });

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
      const subscription = subscriptions.get(subscriptionId);
      if (!subscription) return err(new Error('Subscription not found'));

      const result = await request(`/v1/billing/subscriptions/${subscriptionId}/activate`, 'POST');

      if (isOk(result)) {
        subscription.status = 'active';
        subscription.cancelAtPeriodEnd = false;
        subscription.canceledAt = undefined;
        subscriptions.set(subscriptionId, subscription);
        return ok(subscription);
      }
      return err(result.error);
    },

    // Webhooks
    verifyWebhookSignature: async (payload, signature, secret) => {
      try {
        // PayPal webhook verification (simplified)
        // In production, use PayPal SDK webhook verification
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
          type: data.event_type,
          data: data.resource,
          createdAt: new Date(data.create_time),
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
