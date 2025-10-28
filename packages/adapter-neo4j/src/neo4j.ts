/**
 * Neo4j Graph Database Adapter
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import neo4j from 'neo4j-driver';

export interface Neo4jConfig {
  uri: string;
  username: string;
  password: string;
  database?: string;
}

export interface DatabaseQuery {
  cypher: string;
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
  init(config: Neo4jConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;
  query<TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>>;
  begin(): Promise<Result<DatabaseTransaction, Error>>;
}

export const createNeo4jAdapter = (): DatabaseAdapter => {
  let driver: ReturnType<typeof neo4j.driver> | null = null;
  let database: string | undefined;
  let transactionCounter = 0;

  return {
    init: async (config: Neo4jConfig): Promise<Result<void, Error>> => {
      try {
        driver = neo4j.driver(config.uri, neo4j.auth.basic(config.username, config.password));
        database = config.database;
        await driver.verifyConnectivity();
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!driver) {
        return err(new Error('Database not initialized'));
      }
      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      if (driver) {
        await driver.close();
        driver = null;
      }
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!driver) {
        return ok({ status: 'unhealthy', error: new Error('Database not initialized') });
      }

      try {
        await driver.verifyConnectivity();
        return ok({ status: 'healthy' });
      } catch (error) {
        return ok({
          status: 'unhealthy',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },

    query: async <TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>> => {
      if (!driver) {
        return err(new Error('Database not initialized'));
      }

      const session = driver.session({ database });
      try {
        const result = await session.run(query.cypher, query.params || {});
        const rows = result.records.map((record) => record.toObject() as TRow);
        return ok({ rows, rowCount: rows.length });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      } finally {
        await session.close();
      }
    },

    begin: async (): Promise<Result<DatabaseTransaction, Error>> => {
      if (!driver) {
        return err(new Error('Database not initialized'));
      }

      try {
        const session = driver.session({ database });
        const tx = session.beginTransaction();
        const txId = `tx-${++transactionCounter}`;
        let committed = false;
        let rolledBack = false;

        const transaction: DatabaseTransaction = {
          id: txId,

          query: async <TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>> => {
            if (committed || rolledBack) {
              return err(new Error('Transaction already completed'));
            }

            try {
              const result = await tx.run(query.cypher, query.params || {});
              const rows = result.records.map((record) => record.toObject() as TRow);
              return ok({ rows, rowCount: rows.length });
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
              await tx.commit();
              await session.close();
              committed = true;
              return ok(undefined);
            } catch (error) {
              await session.close();
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
              await tx.rollback();
              await session.close();
              rolledBack = true;
              return ok(undefined);
            } catch (error) {
              await session.close();
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
