/**
 * FaunaDB Adapter
 *
 * Document-relational database with strong consistency and ACID transactions
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import type { Client, QuerySuccess, QueryFailure } from 'fauna';
import { fql } from 'fauna';

export interface FaunaAdapterConfig {
  // Fauna secret key
  secret: string;

  // Optional: endpoint URL (for local dev or custom regions)
  endpoint?: string;

  // Optional: query timeout in milliseconds
  queryTimeout?: number;
}

export interface QueryOptions {
  query: any; // FQL query
}

export interface FaunaAdapter {
  init(config: FaunaAdapterConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  // Get the underlying Fauna client
  getClient(): Result<Client, Error>;

  // Execute a query
  query<T = any>(query: any): Promise<Result<T, Error>>;
}

export const createFaunaAdapter = (): FaunaAdapter => {
  let client: Client | null = null;
  let config: FaunaAdapterConfig | null = null;

  return {
    init: async (cfg: FaunaAdapterConfig): Promise<Result<void, Error>> => {
      try {
        config = cfg;

        // Dynamically import Fauna client
        const { Client: FaunaClient } = await import('fauna');

        client = new FaunaClient({
          secret: cfg.secret,
          endpoint: cfg.endpoint,
          query_timeout_ms: cfg.queryTimeout,
        });

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Fauna client not initialized'));
      }

      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      if (client) {
        try {
          client.close();
        } catch (error) {
          // Ignore errors during stop
        }
      }
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      if (client) {
        try {
          client.close();
        } catch (error) {
          // Ignore errors
        }
        client = null;
        config = null;
      }
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!client) {
        return ok({ status: 'unhealthy', error: new Error('Client not initialized') });
      }

      try {
        // Test connection with a simple query
        await client.query(fql`1 + 1`);
        return ok({ status: 'healthy' });
      } catch (error) {
        return ok({
          status: 'unhealthy',
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    },

    getClient: (): Result<Client, Error> => {
      if (!client) {
        return err(new Error('Fauna client not initialized'));
      }
      return ok(client);
    },

    query: async <T = any>(query: any): Promise<Result<T, Error>> => {
      if (!client) {
        return err(new Error('Fauna client not initialized'));
      }

      try {
        const result = await client.query<T>(query);

        if ('data' in result) {
          return ok(result.data);
        }

        return err(new Error('Query failed'));
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
