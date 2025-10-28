/**
 * PostgreSQL Adapter for ServiceJS
 *
 * Provides PostgreSQL database connectivity using node-postgres (pg).
 */

import { Pool, type PoolClient, type QueryResult, type PoolConfig, type QueryResultRow } from 'pg';
import { ok, err, isOk, type Result } from '@servicejs/result';
import {
  createDatabaseAdapter,
  type DatabaseAdapter,
  type DatabaseQuery,
  type DatabaseResult,
  type DatabaseTransaction,
} from '@servicejs/integration-database';

export interface PostgresConfig {
  /**
   * PostgreSQL connection string or config object
   */
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;

  /**
   * Full connection string (overrides individual params)
   */
  connectionString?: string;

  /**
   * SSL/TLS options
   */
  ssl?: boolean | {
    rejectUnauthorized?: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };

  /**
   * Connection pool settings
   */
  pool?: {
    min?: number;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
  };

  /**
   * Query timeout in milliseconds
   */
  statementTimeout?: number;
}

/**
 * Create a PostgreSQL adapter
 *
 * Uses node-postgres (pg) for robust PostgreSQL connectivity.
 *
 * @example
 * ```typescript
 * const db = createPostgresAdapter();
 *
 * await db.init({
 *   host: 'localhost',
 *   port: 5432,
 *   database: 'mydb',
 *   user: 'postgres',
 *   password: 'secret',
 * });
 * await db.start();
 *
 * const result = await db.query({
 *   text: 'SELECT * FROM users WHERE id = $1',
 *   params: [1],
 * });
 *
 * if (isOk(result)) {
 *   console.log(result.value.rows);
 * }
 *
 * await db.stop();
 * await db.destroy();
 * ```
 */
export const createPostgresAdapter = (): DatabaseAdapter => {
  let pool: Pool | null = null;
  let config: PostgresConfig | null = null;

  const adapter = createDatabaseAdapter(
    {
      name: 'postgres',
      version: '1.0.0',
      type: 'database',
      platforms: ['node', 'bun'],
      description: 'PostgreSQL database adapter using node-postgres',
    },
    {
      onInit: async (cfg) => {
        config = cfg as unknown as PostgresConfig;

        // Validate required fields
        if (!config.connectionString && !config.host) {
          return err(new Error('Either connectionString or host must be provided'));
        }

        if (!config.connectionString && !config.database) {
          return err(new Error('database is required when not using connectionString'));
        }

        return ok(undefined);
      },

      onStart: async () => {
        if (!config) {
          return err(new Error('Adapter not initialized'));
        }

        try {
          // Build pool config
          const poolConfig: PoolConfig = {};

          if (config.connectionString) {
            poolConfig.connectionString = config.connectionString;
          } else {
            poolConfig.host = config.host;
            poolConfig.port = config.port || 5432;
            poolConfig.database = config.database;
            poolConfig.user = config.user;
            poolConfig.password = config.password;
          }

          if (config.ssl !== undefined) {
            poolConfig.ssl = config.ssl;
          }

          if (config.pool) {
            if (config.pool.min !== undefined) {
              poolConfig.min = config.pool.min;
            }
            if (config.pool.max !== undefined) {
              poolConfig.max = config.pool.max;
            }
            if (config.pool.idleTimeoutMillis !== undefined) {
              poolConfig.idleTimeoutMillis = config.pool.idleTimeoutMillis;
            }
            if (config.pool.connectionTimeoutMillis !== undefined) {
              poolConfig.connectionTimeoutMillis = config.pool.connectionTimeoutMillis;
            }
          }

          if (config.statementTimeout !== undefined) {
            poolConfig.statement_timeout = config.statementTimeout;
          }

          // Create pool
          pool = new Pool(poolConfig);

          // Test connection
          const client = await pool.connect();
          client.release();

          return ok(undefined);
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
      },

      onStop: async () => {
        if (!pool) {
          return ok(undefined);
        }

        try {
          await pool.end();
          return ok(undefined);
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
      },

      onDestroy: async () => {
        pool = null;
        config = null;
        return ok(undefined);
      },

      onHealth: async () => {
        if (!pool) {
          return ok({ status: 'unhealthy', error: new Error('Pool not initialized') });
        }

        try {
          const client = await pool.connect();
          await client.query('SELECT 1');
          client.release();
          return ok({ status: 'healthy' });
        } catch (error) {
          return ok({
            status: 'unhealthy',
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      },
    }
  );

  // Implement query method
  adapter.query = async <TRow = unknown>(
    query: DatabaseQuery
  ): Promise<Result<DatabaseResult<TRow>, Error>> => {
    if (!pool) {
      return err(new Error('Database not connected'));
    }

    try {
      const result: QueryResult<QueryResultRow> = await pool.query(query.text, query.params);

      return ok({
        rows: result.rows as TRow[],
        rowCount: result.rowCount ?? 0,
        metadata: {
          command: result.command,
          oid: result.oid,
          fields: result.fields,
        },
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

  // Implement begin method
  adapter.begin = async (): Promise<Result<DatabaseTransaction, Error>> => {
    if (!pool) {
      return err(new Error('Database not connected'));
    }

    try {
      const client: PoolClient = await pool.connect();

      // Begin transaction
      await client.query('BEGIN');

      const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      let isActive = true;

      const transaction: DatabaseTransaction = {
        id: txId,

        query: async <TRow = unknown>(
          query: DatabaseQuery
        ): Promise<Result<DatabaseResult<TRow>, Error>> => {
          if (!isActive) {
            return err(new Error('Transaction is no longer active'));
          }

          try {
            const result: QueryResult<QueryResultRow> = await client.query(query.text, query.params);

            return ok({
              rows: result.rows as TRow[],
              rowCount: result.rowCount ?? 0,
              metadata: {
                command: result.command,
                oid: result.oid,
                fields: result.fields,
              },
            });
          } catch (error) {
            return err(error instanceof Error ? error : new Error(String(error)));
          }
        },

        commit: async (): Promise<Result<void, Error>> => {
          if (!isActive) {
            return err(new Error('Transaction already committed or rolled back'));
          }

          try {
            await client.query('COMMIT');
            isActive = false;
            client.release();
            return ok(undefined);
          } catch (error) {
            return err(error instanceof Error ? error : new Error(String(error)));
          }
        },

        rollback: async (): Promise<Result<void, Error>> => {
          if (!isActive) {
            return err(new Error('Transaction already committed or rolled back'));
          }

          try {
            await client.query('ROLLBACK');
            isActive = false;
            client.release();
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
  };

  // Implement transaction method
  adapter.transaction = async <T>(
    fn: (tx: DatabaseTransaction) => Promise<Result<T, Error>>
  ): Promise<Result<T, Error>> => {
    const txResult = await adapter.begin();
    if (!isOk(txResult)) {
      return err(new Error('Failed to begin transaction'));
    }

    const tx = txResult.value;

    try {
      const result = await fn(tx);

      if (!isOk(result)) {
        await tx.rollback();
        return result;
      }

      const commitResult = await tx.commit();
      if (!isOk(commitResult)) {
        return err(new Error('Failed to commit transaction'));
      }

      return result;
    } catch (error) {
      await tx.rollback();
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return adapter;
};
