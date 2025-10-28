/**
 * TimescaleDB Time-Series Database Adapter
 * PostgreSQL extension for time-series data
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import pg from 'pg';

const { Pool } = pg;

export interface TimescaleDBConfig {
  host?: string;
  port?: number;
  user: string;
  password?: string;
  database: string;
  ssl?: boolean;
}

export interface DatabaseQuery {
  text: string;
  params?: unknown[];
}

export interface DatabaseResult<TRow = unknown> {
  rows: TRow[];
  rowCount: number;
}

export interface DatabaseAdapter {
  init(config: TimescaleDBConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;
  query<TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>>;
}

export const createTimescaleDBAdapter = (): DatabaseAdapter => {
  let pool: InstanceType<typeof Pool> | null = null;

  return {
    init: async (config: TimescaleDBConfig): Promise<Result<void, Error>> => {
      try {
        pool = new Pool({
          host: config.host || 'localhost',
          port: config.port || 5432,
          user: config.user,
          password: config.password,
          database: config.database,
          ssl: config.ssl ? { rejectUnauthorized: false } : false,
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
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
