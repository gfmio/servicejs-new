/**
 * PlanetScale Adapter
 *
 * Serverless MySQL database with branch-based workflows
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import type { Connection, ExecutedQuery } from '@planetscale/database';
import { connect } from '@planetscale/database';

export interface PlanetScaleAdapterConfig {
  // Connection configuration
  host: string;
  username: string;
  password: string;

  // Optional fetch function (for edge runtimes)
  fetch?: typeof fetch;

  // Optional: custom fetch options
  fetchOptions?: RequestInit;
}

export interface QueryOptions {
  sql: string;
  args?: any[];
}

export interface TransactionCallback<T> {
  (tx: PlanetScaleTransaction): Promise<T>;
}

export interface PlanetScaleTransaction {
  execute(sql: string, args?: any[]): Promise<Result<ExecutedQuery, Error>>;
}

export interface PlanetScaleAdapter {
  init(config: PlanetScaleAdapterConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  // Get the underlying connection
  getConnection(): Result<Connection, Error>;

  // Execute a query
  execute(sql: string, args?: any[]): Promise<Result<ExecutedQuery, Error>>;

  // Transaction support
  transaction<T>(callback: TransactionCallback<T>): Promise<Result<T, Error>>;
}

export const createPlanetScaleAdapter = (): PlanetScaleAdapter => {
  let connection: Connection | null = null;
  let config: PlanetScaleAdapterConfig | null = null;

  return {
    init: async (cfg: PlanetScaleAdapterConfig): Promise<Result<void, Error>> => {
      try {
        config = cfg;
        connection = connect({
          host: cfg.host,
          username: cfg.username,
          password: cfg.password,
          fetch: cfg.fetch,
        });

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!connection) {
        return err(new Error('PlanetScale connection not initialized'));
      }

      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      // PlanetScale doesn't require explicit connection closing
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      connection = null;
      config = null;
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!connection) {
        return ok({ status: 'unhealthy', error: new Error('Connection not initialized') });
      }

      try {
        // Test connection with a simple query
        await connection.execute('SELECT 1');
        return ok({ status: 'healthy' });
      } catch (error) {
        return ok({
          status: 'unhealthy',
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    },

    getConnection: (): Result<Connection, Error> => {
      if (!connection) {
        return err(new Error('PlanetScale connection not initialized'));
      }
      return ok(connection);
    },

    execute: async (sql: string, args?: any[]): Promise<Result<ExecutedQuery, Error>> => {
      if (!connection) {
        return err(new Error('PlanetScale connection not initialized'));
      }

      try {
        const result = await connection.execute(sql, args);
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    transaction: async <T>(callback: TransactionCallback<T>): Promise<Result<T, Error>> => {
      if (!connection) {
        return err(new Error('PlanetScale connection not initialized'));
      }

      try {
        const result = await connection.transaction(async (tx) => {
          // Wrap the transaction in our interface
          const wrappedTx: PlanetScaleTransaction = {
            execute: async (sql: string, args?: any[]): Promise<Result<ExecutedQuery, Error>> => {
              try {
                const result = await tx.execute(sql, args);
                return ok(result);
              } catch (error) {
                return err(error instanceof Error ? error : new Error(String(error)));
              }
            },
          };

          return await callback(wrappedTx);
        });

        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
