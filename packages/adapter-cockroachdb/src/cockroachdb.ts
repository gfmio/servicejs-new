/**
 * CockroachDB Database Adapter
 *
 * Distributed SQL database with PostgreSQL compatibility
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import pg from 'pg';

const { Pool } = pg;

export interface CockroachDBConfig {
  host?: string;
  port?: number;
  user: string;
  password?: string;
  database: string;
  ssl?: boolean | { rejectUnauthorized?: boolean };
  pool?: {
    max?: number;
    min?: number;
    idleTimeoutMillis?: number;
  };
}

export interface DatabaseQuery {
  text: string;
  params?: unknown[];
}

export interface DatabaseResult<TRow = unknown> {
  rows: TRow[];
  rowCount: number;
  command?: string;
}

export interface DatabaseTransaction {
  id: string;
  query<TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>>;
  commit(): Promise<Result<void, Error>>;
  rollback(): Promise<Result<void, Error>>;
}

export interface DatabaseAdapter {
  init(config: CockroachDBConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;
  query<TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>>;
  begin(): Promise<Result<DatabaseTransaction, Error>>;
}

export const createCockroachDBAdapter = (): DatabaseAdapter => {
  let pool: InstanceType<typeof Pool> | null = null;
  let transactionCounter = 0;

  return {
    init: async (config: CockroachDBConfig): Promise<Result<void, Error>> => {
      try {
        pool = new Pool({
          host: config.host || 'localhost',
          port: config.port || 26257,
          user: config.user,
          password: config.password,
          database: config.database,
          ssl: config.ssl,
          max: config.pool?.max || 10,
          min: config.pool?.min || 0,
          idleTimeoutMillis: config.pool?.idleTimeoutMillis || 30000,
        });

        const client = await pool.connect();
        client.release();

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!pool) {
        return err(new Error('Database not initialized'));
      }
      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      if (pool) {
        await pool.end();
        pool = null;
      }
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!pool) {
        return ok({ status: 'unhealthy', error: new Error('Database not initialized') });
      }

      try {
        await pool.query('SELECT 1');
        return ok({ status: 'healthy' });
      } catch (error) {
        return ok({
          status: 'unhealthy',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },

    query: async <TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>> => {
      if (!pool) {
        return err(new Error('Database not initialized'));
      }

      try {
        const result = await pool.query(query.text, query.params || []);
        return ok({
          rows: result.rows as TRow[],
          rowCount: result.rowCount || 0,
          command: result.command,
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    begin: async (): Promise<Result<DatabaseTransaction, Error>> => {
      if (!pool) {
        return err(new Error('Database not initialized'));
      }

      try {
        const client = await pool.connect();
        const txId = `tx-${++transactionCounter}`;
        let committed = false;
        let rolledBack = false;

        await client.query('BEGIN');

        const transaction: DatabaseTransaction = {
          id: txId,

          query: async <TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>> => {
            if (committed || rolledBack) {
              return err(new Error('Transaction already completed'));
            }

            try {
              const result = await client.query(query.text, query.params || []);
              return ok({
                rows: result.rows as TRow[],
                rowCount: result.rowCount || 0,
                command: result.command,
              });
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
              await client.query('COMMIT');
              client.release();
              committed = true;
              return ok(undefined);
            } catch (error) {
              client.release();
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
              await client.query('ROLLBACK');
              client.release();
              rolledBack = true;
              return ok(undefined);
            } catch (error) {
              client.release();
              return err(error instanceof Error ? error : new Error(String(error)));
            }
          },
        };

        return ok(transaction);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
