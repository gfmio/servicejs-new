/**
 * Square Adapter for ServiceJS
 */

import { ok, err, type Result } from '@servicejs/result';

export interface SquareConfig {
  accessToken: string;
  environment?: 'sandbox' | 'production';
}

export interface SquareAdapter {
  init(config: SquareConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>;

  createPayment(amount: number, currency: string, sourceId: string): Promise<Result<any, Error>>;
  createCustomer(email: string, givenName?: string, familyName?: string): Promise<Result<any, Error>>;
}

export const createSquareAdapter = (): SquareAdapter => {
  let config: SquareConfig | null = null;

  return {
    init: async (cfg) => {
      if (!cfg.accessToken) return err(new Error('Access token required'));
      config = { ...cfg, environment: cfg.environment || 'sandbox' };
      return ok(undefined);
    },

    start: async () => ok(undefined),
    stop: async () => ok(undefined),
    destroy: async () => { config = null; return ok(undefined); },

    health: async () => ok({ status: config ? 'healthy' as const : 'unhealthy' as const }),

    createPayment: async (amount, currency, sourceId) => {
      if (!config) return err(new Error('Square not initialized'));
      return ok({ id: `SQ-${Date.now()}`, amount, currency, sourceId });
    },

    createCustomer: async (email, givenName, familyName) => {
      if (!config) return err(new Error('Square not initialized'));
      return ok({ id: `CUST-${Date.now()}`, email, givenName, familyName });
    },
  };
};
