/**
 * ClickHouse Analytics Database Adapter
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import { createClient, type ClickHouseClient } from '@clickhouse/client';

export interface ClickHouseConfig {
  url: string;
  username?: string;
  password?: string;
  database?: string;
}

export interface DatabaseQuery {
  query: string;
  params?: Record<string, unknown>;
}

export interface DatabaseResult<TRow = unknown> {
  rows: TRow[];
  rowCount: number;
}

export interface DatabaseAdapter {
  init(config: ClickHouseConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;
  query<TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>>;
  insert(table: string, values: Record<string, unknown>[]): Promise<Result<void, Error>>;
}

export const createClickHouseAdapter = (): DatabaseAdapter => {
  let client: ClickHouseClient | null = null;

  return {
    init: async (config: ClickHouseConfig): Promise<Result<void, Error>> => {
      try {
        client = createClient({
          url: config.url,
          username: config.username,
          password: config.password,
          database: config.database,
        });
        await client.ping();
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
        await client.ping();
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
        const result = await client.query({
          query: query.query,
          query_params: query.params,
          format: 'JSONEachRow',
        });
        const rows = await result.json<TRow[]>();
        return ok({ rows, rowCount: rows.length });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    insert: async (table: string, values: Record<string, unknown>[]): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Database not initialized'));
      }

      try {
        await client.insert({
          table,
          values,
          format: 'JSONEachRow',
        });
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
