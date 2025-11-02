/**
 * tRPC Client Adapter for ServiceJS
 *
 * Provides type-safe RPC with query, mutation, and subscription support.
 */

import { ok, err, type Result } from '@servicejs/result';

/**
 * tRPC configuration
 */
export interface TRPCConfig {
  url: string;
  headers?: Record<string, string>;
  fetchOptions?: RequestInit;
}

/**
 * tRPC procedure type
 */
export type ProcedureType = 'query' | 'mutation' | 'subscription';

/**
 * tRPC request
 */
interface TRPCRequest {
  id: number;
  jsonrpc: '2.0';
  method: ProcedureType;
  params: {
    path: string;
    input?: any;
  };
}

/**
 * tRPC response
 */
interface TRPCResponse<T = any> {
  id: number;
  jsonrpc: '2.0';
  result?: {
    data: T;
  };
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * Subscription callback
 */
export type SubscriptionCallback<T = any> = (data: T) => void;

/**
 * tRPC adapter interface
 */
export interface TRPCAdapter {
  init(config: TRPCConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<boolean, Error>>;

  query<T = any>(path: string, input?: any): Promise<Result<T, Error>>;
  mutate<T = any>(path: string, input?: any): Promise<Result<T, Error>>;
  subscribe<T = any>(path: string, input: any, callback: SubscriptionCallback<T>): Promise<Result<() => void, Error>>;
}

/**
 * Creates a tRPC client adapter
 *
 * @example
 * ```typescript
 * const adapter = createTRPCAdapter();
 * await adapter.init({
 *   url: 'http://localhost:3000/trpc',
 * });
 *
 * const result = await adapter.query('user.getById', { id: '123' });
 * ```
 */
export function createTRPCAdapter(): TRPCAdapter {
  let config: TRPCConfig | null = null;
  let requestId = 0;
  const subscriptions = new Map<string, Set<SubscriptionCallback>>();

  async function executeProcedure<T>(
    type: ProcedureType,
    path: string,
    input?: any
  ): Promise<Result<T, Error>> {
    if (!config) {
      return err(new Error('Adapter not initialized'));
    }

    try {
      const request: TRPCRequest = {
        id: ++requestId,
        jsonrpc: '2.0',
        method: type,
        params: {
          path,
          input,
        },
      };

      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: JSON.stringify(request),
        ...config.fetchOptions,
      });

      if (!response.ok) {
        return err(new Error(`HTTP error: ${response.status} ${response.statusText}`));
      }

      const result: TRPCResponse<T> = await response.json();

      if (result.error) {
        return err(new Error(`tRPC error [${result.error.code}]: ${result.error.message}`));
      }

      if (!result.result) {
        return err(new Error('No result returned from tRPC procedure'));
      }

      return ok(result.result.data);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('tRPC request failed'));
    }
  }

  return {
    async init(cfg: TRPCConfig): Promise<Result<void, Error>> {
      try {
        if (!cfg.url) {
          return err(new Error('tRPC URL required'));
        }
        config = cfg;
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error('Failed to initialize'));
      }
    },

    async start(): Promise<Result<void, Error>> {
      if (!config) {
        return err(new Error('Adapter not initialized'));
      }
      return ok(undefined);
    },

    async stop(): Promise<Result<void, Error>> {
      subscriptions.clear();
      return ok(undefined);
    },

    async destroy(): Promise<Result<void, Error>> {
      config = null;
      subscriptions.clear();
      return ok(undefined);
    },

    async health(): Promise<Result<boolean, Error>> {
      return ok(config !== null);
    },

    async query<T = any>(path: string, input?: any): Promise<Result<T, Error>> {
      return executeProcedure<T>('query', path, input);
    },

    async mutate<T = any>(path: string, input?: any): Promise<Result<T, Error>> {
      return executeProcedure<T>('mutation', path, input);
    },

    async subscribe<T = any>(
      path: string,
      input: any,
      callback: SubscriptionCallback<T>
    ): Promise<Result<() => void, Error>> {
      if (!config) {
        return err(new Error('Adapter not initialized'));
      }

      try {
        // Mock subscription - in production, this would use WebSocket
        const subscriptionId = `${path}:${JSON.stringify(input)}`;

        if (!subscriptions.has(subscriptionId)) {
          subscriptions.set(subscriptionId, new Set());
        }

        subscriptions.get(subscriptionId)!.add(callback);

        // Return unsubscribe function
        const unsubscribe = () => {
          const callbacks = subscriptions.get(subscriptionId);
          if (callbacks) {
            callbacks.delete(callback);
            if (callbacks.size === 0) {
              subscriptions.delete(subscriptionId);
            }
          }
        };

        return ok(unsubscribe);
      } catch (error) {
        return err(error instanceof Error ? error : new Error('Subscription failed'));
      }
    },
  };
}
