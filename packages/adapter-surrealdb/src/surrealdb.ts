/**
 * SurrealDB Database Adapter
 *
 * Multi-model database supporting documents, graphs, and key-value operations
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import { Surreal } from 'surrealdb';

export interface SurrealDBConfig {
  /**
   * Connection URL
   * @example 'http://127.0.0.1:8000/rpc'
   */
  url: string;

  /**
   * Database namespace
   */
  namespace: string;

  /**
   * Database name
   */
  database: string;

  /**
   * Authentication credentials
   */
  auth?: {
    username: string;
    password: string;
  } | {
    token: string;
  };
}

export interface DatabaseQuery {
  text: string;
  params?: Record<string, unknown>;
}

export interface DatabaseResult<TRow = unknown> {
  rows: TRow[];
  rowCount: number;
}

export interface DatabaseTransaction {
  id: string;
  query<TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>>;
  commit(): Promise<Result<void, Error>>;
  rollback(): Promise<Result<void, Error>>;
}

export interface DatabaseAdapter {
  init(config: SurrealDBConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  query<TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>>;
  begin(): Promise<Result<DatabaseTransaction, Error>>;

  // SurrealDB-specific operations
  create<T = unknown>(thing: string, data?: T): Promise<Result<T, Error>>;
  select<T = unknown>(thing: string): Promise<Result<T[], Error>>;
  update<T = unknown>(thing: string, data: Partial<T>): Promise<Result<T, Error>>;
  merge<T = unknown>(thing: string, data: Partial<T>): Promise<Result<T, Error>>;
  delete(thing: string): Promise<Result<void, Error>>;
  relate<T = unknown>(from: string, relation: string, to: string, data?: T): Promise<Result<T, Error>>;
}

/**
 * Create a SurrealDB database adapter
 *
 * @example
 * ```typescript
 * const db = createSurrealDBAdapter();
 *
 * await db.init({
 *   url: 'http://127.0.0.1:8000/rpc',
 *   namespace: 'test',
 *   database: 'test',
 *   auth: { username: 'root', password: 'root' }
 * });
 * await db.start();
 *
 * // Create a record
 * await db.create('person', { name: 'Alice', age: 30 });
 *
 * // Query records
 * const result = await db.select('person');
 *
 * // Create relationships (graph)
 * await db.relate('person:alice', 'knows', 'person:bob');
 *
 * await db.stop();
 * await db.destroy();
 * ```
 */
export const createSurrealDBAdapter = (): DatabaseAdapter => {
  let client: Surreal | null = null;
  let transactionCounter = 0;

  return {
    init: async (config: SurrealDBConfig): Promise<Result<void, Error>> => {
      try {
        client = new Surreal();

        // Connect to SurrealDB
        await client.connect(config.url);

        // Authenticate
        if (config.auth) {
          if ('token' in config.auth) {
            await client.authenticate(config.auth.token);
          } else {
            await client.signin({
              username: config.auth.username,
              password: config.auth.password,
            });
          }
        }

        // Select namespace and database
        await client.use({
          namespace: config.namespace,
          database: config.database,
        });

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Database not initialized'));
      }
      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      // SurrealDB doesn't require explicit stop
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      if (client) {
        await client.close();
        client = null;
      }
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!client) {
        return ok({ status: 'unhealthy', error: new Error('Database not initialized') });
      }

      try {
        // Try a simple query to check health
        await client.query('SELECT 1');
        return ok({ status: 'healthy' });
      } catch (error) {
        return ok({
          status: 'unhealthy',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },

    query: async <TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>> => {
      if (!client) {
        return err(new Error('Database not initialized'));
      }

      try {
        let result;
        if (query.params) {
          result = await client.query<TRow[]>(query.text, query.params);
        } else {
          result = await client.query<TRow[]>(query.text);
        }

        // SurrealDB returns an array of results for each statement
        const firstResult = result[0];
        const rows = Array.isArray(firstResult) ? firstResult : [];
        const rowCount = rows.length;

        return ok({ rows, rowCount });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    begin: async (): Promise<Result<DatabaseTransaction, Error>> => {
      if (!client) {
        return err(new Error('Database not initialized'));
      }

      try {
        const txId = `tx-${++transactionCounter}`;
        const statements: Array<{ text: string; params?: Record<string, unknown> }> = [];
        let committed = false;
        let rolledBack = false;

        // Start transaction
        await client.query('BEGIN TRANSACTION');

        const transaction: DatabaseTransaction = {
          id: txId,

          query: async <TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>> => {
            if (committed || rolledBack) {
              return err(new Error('Transaction already completed'));
            }

            statements.push(query);

            try {
              let result;
              if (query.params) {
                result = await client!.query<TRow[]>(query.text, query.params);
              } else {
                result = await client!.query<TRow[]>(query.text);
              }
              const firstResult = result[0];
              const rows = Array.isArray(firstResult) ? firstResult : [];
              const rowCount = rows.length;

              return ok({ rows, rowCount });
            } catch (error) {
              return err(error instanceof Error ? error : new Error(String(error)));
            }
          },

          commit: async (): Promise<Result<void, Error>> => {
            if (committed) {
              return err(new Error('Transaction already committed'));
            }
            if (rolledBack) {
              return err(new Error('Transaction already rolled back'));
            }

            try {
              await client!.query('COMMIT TRANSACTION');
              committed = true;
              return ok(undefined);
            } catch (error) {
              return err(error instanceof Error ? error : new Error(String(error)));
            }
          },

          rollback: async (): Promise<Result<void, Error>> => {
            if (committed) {
              return err(new Error('Transaction already committed'));
            }
            if (rolledBack) {
              return err(new Error('Transaction already rolled back'));
            }

            try {
              await client!.query('CANCEL TRANSACTION');
              rolledBack = true;
              return ok(undefined);
            } catch (error) {
              return err(error instanceof Error ? error : new Error(String(error)));
            }
          },
        };

        return ok(transaction);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    // SurrealDB-specific methods

    create: async <T = unknown>(thing: string, data?: T): Promise<Result<T, Error>> => {
      if (!client) {
        return err(new Error('Database not initialized'));
      }

      try {
        let result;
        if (data !== undefined) {
          result = await client.create(thing, data as Record<string, unknown>);
        } else {
          result = await client.create(thing);
        }
        return ok(result as T);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    select: async <T = unknown>(thing: string): Promise<Result<T[], Error>> => {
      if (!client) {
        return err(new Error('Database not initialized'));
      }

      try {
        const result = await client.select(thing);
        const typedResult = (Array.isArray(result) ? result : [result]) as T[];
        return ok(typedResult);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    update: async <T = unknown>(thing: string, data: Partial<T>): Promise<Result<T, Error>> => {
      if (!client) {
        return err(new Error('Database not initialized'));
      }

      try {
        const result = await client.update(thing, data as Record<string, unknown>);
        return ok(result as T);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    merge: async <T = unknown>(thing: string, data: Partial<T>): Promise<Result<T, Error>> => {
      if (!client) {
        return err(new Error('Database not initialized'));
      }

      try {
        const result = await client.merge(thing, data as Record<string, unknown>);
        return ok(result as T);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    delete: async (thing: string): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Database not initialized'));
      }

      try {
        await client.delete(thing);
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    relate: async <T = unknown>(from: string, relation: string, to: string, data?: T): Promise<Result<T, Error>> => {
      if (!client) {
        return err(new Error('Database not initialized'));
      }

      try {
        const result = await client.query<T[]>(
          `RELATE ${from}->${relation}->${to} CONTENT $data`,
          { data: data || {} }
        );

        const firstResult = result[0];
        return ok((Array.isArray(firstResult) ? firstResult[0] : firstResult) as T);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
