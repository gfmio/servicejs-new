/**
 * Kysely Adapter
 *
 * Type-safe SQL query builder
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import type { Kysely, Transaction, Compilable } from 'kysely';

export interface KyselyAdapterConfig<DB> {
  // Kysely instance (must be provided by user)
  kysely: Kysely<DB>;

  // Optional: Enable query logging
  enableLogging?: boolean;
}

export interface KyselyAdapter<DB> {
  init(config: KyselyAdapterConfig<DB>): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  // Get the underlying Kysely instance
  getKysely(): Result<Kysely<DB>, Error>;

  // Transaction support
  transaction<T>(
    fn: (trx: Transaction<DB>) => Promise<T>
  ): Promise<Result<T, Error>>;

  // Execute a query
  execute<T>(query: Compilable<T>): Promise<Result<T, Error>>;
}

export const createKyselyAdapter = <DB>(): KyselyAdapter<DB> => {
  let kysely: Kysely<DB> | null = null;
  let enableLogging = false;

  return {
    init: async (config: KyselyAdapterConfig<DB>): Promise<Result<void, Error>> => {
      try {
        kysely = config.kysely;
        enableLogging = config.enableLogging || false;

        if (enableLogging) {
          console.log('[Kysely] Adapter initialized');
        }

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!kysely) {
        return err(new Error('Kysely not initialized'));
      }

      if (enableLogging) {
        console.log('[Kysely] Adapter started');
      }

      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      if (kysely) {
        try {
          await kysely.destroy();

          if (enableLogging) {
            console.log('[Kysely] Connection destroyed');
          }
        } catch (error) {
          // Ignore errors during stop
        }
      }

      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      if (kysely) {
        try {
          await kysely.destroy();
        } catch (error) {
          // Ignore errors during destroy
        }
        kysely = null;
      }
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!kysely) {
        return ok({ status: 'unhealthy', error: new Error('Kysely not initialized') });
      }

      try {
        // Test database connection with a simple query
        await kysely.selectFrom('sqlite_master' as any).select('type' as any).limit(1).execute();
        return ok({ status: 'healthy' });
      } catch (error) {
        return ok({
          status: 'unhealthy',
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    },

    getKysely: (): Result<Kysely<DB>, Error> => {
      if (!kysely) {
        return err(new Error('Kysely not initialized'));
      }
      return ok(kysely);
    },

    transaction: async <T>(
      fn: (trx: Transaction<DB>) => Promise<T>
    ): Promise<Result<T, Error>> => {
      if (!kysely) {
        return err(new Error('Kysely not initialized'));
      }

      try {
        const result = await kysely.transaction().execute(fn);
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    execute: async <T>(query: Compilable<T>): Promise<Result<T, Error>> => {
      if (!kysely) {
        return err(new Error('Kysely not initialized'));
      }

      try {
        const result = await query.execute();
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
