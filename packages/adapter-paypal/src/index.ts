/**
 * PayPal Adapter for ServiceJS
 */

import { ok, err, type Result } from '@servicejs/result';

export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  mode?: 'sandbox' | 'live';
}

export interface PayPalAdapter {
  init(config: PayPalConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>;

  createOrder(amount: number, currency: string): Promise<Result<any, Error>>;
  captureOrder(orderId: string): Promise<Result<any, Error>>;
}

export const createPayPalAdapter = (): PayPalAdapter => {
  let config: PayPalConfig | null = null;

  return {
    init: async (cfg) => {
      if (!cfg.clientId || !cfg.clientSecret) return err(new Error('Client ID and secret required'));
      config = { ...cfg, mode: cfg.mode || 'sandbox' };
      return ok(undefined);
    },

    start: async () => ok(undefined),
    stop: async () => ok(undefined),
    destroy: async () => { config = null; return ok(undefined); },

    health: async () => ok({ status: config ? 'healthy' as const : 'unhealthy' as const }),

    createOrder: async (amount, currency) => {
      if (!config) return err(new Error('PayPal not initialized'));
      return ok({ id: `PP-${Date.now()}`, amount, currency });
    },

    captureOrder: async (orderId) => {
      if (!config) return err(new Error('PayPal not initialized'));
      return ok({ id: orderId, status: 'COMPLETED' });
    },
  };
};
