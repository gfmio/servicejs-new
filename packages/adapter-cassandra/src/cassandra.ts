/**
 * Apache Cassandra Database Adapter
 *
 * Wide-column store optimized for high write throughput and horizontal scalability
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import cassandra from 'cassandra-driver';

const { Client } = cassandra;

export interface CassandraConfig {
  contactPoints: string[];
  localDataCenter: string;
  keyspace?: string;
  credentials?: {
    username: string;
    password: string;
  };
}

export interface DatabaseQuery {
  query: string;
  params?: unknown[];
}

export interface DatabaseResult<TRow = unknown> {
  rows: TRow[];
  rowCount: number;
}

export interface DatabaseAdapter {
  init(config: CassandraConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;
  query<TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>>;
  execute(query: DatabaseQuery): Promise<Result<DatabaseResult, Error>>;
}

export const createCassandraAdapter = (): DatabaseAdapter => {
  let client: InstanceType<typeof Client> | null = null;

  return {
    init: async (config: CassandraConfig): Promise<Result<void, Error>> => {
      try {
        const authProvider = config.credentials
          ? new cassandra.auth.PlainTextAuthProvider(config.credentials.username, config.credentials.password)
          : undefined;

        const clientConfig: any = {
          contactPoints: config.contactPoints,
          localDataCenter: config.localDataCenter,
          authProvider,
        };
        if (config.keyspace) {
          clientConfig.keyspace = config.keyspace;
        }
        client = new Client(clientConfig);

        await client.connect();
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
        await client.shutdown();
        client = null;
      }
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!client) {
        return ok({ status: 'unhealthy', error: new Error('Database not initialized') });
      }

      try {
        await client.execute('SELECT now() FROM system.local');
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
        const result = await client.execute(query.query, query.params || [], { prepare: true });
        return ok({
          rows: result.rows as TRow[],
          rowCount: result.rowLength,
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    execute: async (query: DatabaseQuery): Promise<Result<DatabaseResult, Error>> => {
      if (!client) {
        return err(new Error('Database not initialized'));
      }

      try {
        await client.execute(query.query, query.params || [], { prepare: true });
        return ok({
          rows: [],
          rowCount: 0,
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
