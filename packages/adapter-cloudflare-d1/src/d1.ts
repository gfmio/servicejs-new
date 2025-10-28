/**
 * Cloudflare D1 Database Adapter
 *
 * Real implementation using Cloudflare D1
 */

import {
  createDatabaseAdapter,
  type DatabaseAdapter,
  type DatabaseQuery,
  type DatabaseResult,
  type DatabaseTransaction,
} from '@servicejs/integration-database';
import type { Result } from '@servicejs/result';
import { err, isOk, ok } from '@servicejs/result';

export interface D1Config {
  /**
   * D1 Database binding from Cloudflare Workers environment
   */
  database: D1Database;
}

/**
 * Create a Cloudflare D1 database adapter
 *
 * Uses Cloudflare's D1 distributed SQLite database.
 *
 * @example
 * ```typescript
 * // In your Cloudflare Worker
 * export default {
 *   async fetch(request: Request, env: Env): Promise<Response> {
 *     const db = createD1Adapter();
 *
 *     await db.init({ database: env.DB });
 *     await db.start();
 *
 *     // Create table
 *     await db.query({
 *       text: 'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)',
 *     });
 *
 *     // Insert data
 *     await db.query({
 *       text: 'INSERT INTO users (name, email) VALUES (?, ?)',
 *       params: ['Alice', 'alice@example.com'],
 *     });
 *
 *     // Query data
 *     const result = await db.query<{ id: number; name: string; email: string }>({
 *       text: 'SELECT * FROM users',
 *     });
 *
 *     await db.stop();
 *     await db.destroy();
 *
 *     return new Response(JSON.stringify(result));
 *   },
 * };
 * ```
 */
export const createD1Adapter = (): DatabaseAdapter => {
  let database: D1Database | null = null;
  let transactionCounter = 0;

  const adapter = createDatabaseAdapter(
    {
      name: 'd1',
      version: '1.0.0',
      type: 'database',
      platforms: ['cloudflare'],
      description: 'Cloudflare D1 database adapter',
    },
    {
      onInit: async (cfg) => {
        const config = cfg as unknown as D1Config;

        if (!config.database) {
          return err(new Error('D1 database binding is required'));
        }

        database = config.database;
        return ok(undefined);
      },

      onStart: async () => {
        if (!database) {
          return err(new Error('Database not initialized'));
        }
        return ok(undefined);
      },

      onStop: async () => {
        // D1 doesn't need explicit stop
        return ok(undefined);
      },

      onDestroy: async () => {
        database = null;
        return ok(undefined);
      },

      onHealth: async () => {
        if (!database) {
          return ok({ status: 'unhealthy', error: new Error('Database not initialized') });
        }

        try {
          // Test query
          await database.prepare('SELECT 1').first();
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

  // Implement database-specific methods
  const dbAdapter = adapter as DatabaseAdapter;

  dbAdapter.query = async <TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>> => {
    if (!database) {
      return err(new Error('Database not initialized'));
    }

    try {
      let stmt = database.prepare(query.text);

      // Bind parameters if provided
      if (query.params && query.params.length > 0) {
        stmt = stmt.bind(...query.params);
      }

      // Check if this is a SELECT query (returns rows)
      const isSelect = query.text.trim().toUpperCase().startsWith('SELECT');

      if (isSelect) {
        const result = await stmt.all<TRow>();
        return ok({
          rows: result.results || [],
          rowCount: result.results?.length || 0,
        });
      } else {
        // For INSERT/UPDATE/DELETE, run the query
        const result = await stmt.run();
        return ok({
          rows: [],
          rowCount: result.meta.changes || 0,
        });
      }
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

  dbAdapter.begin = async (): Promise<Result<DatabaseTransaction, Error>> => {
    if (!database) {
      return err(new Error('Database not initialized'));
    }

    const txId = `tx-${++transactionCounter}`;
    let committed = false;
    let rolledBack = false;

    // D1 doesn't support manual transactions with BEGIN/COMMIT
    // We use D1's batch API to simulate transactions
    const statements: D1PreparedStatement[] = [];

    const transaction: DatabaseTransaction = {
      id: txId,

      query: async <TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>> => {
        if (committed || rolledBack) {
          return err(new Error('Transaction already completed'));
        }

        try {
          let stmt = database!.prepare(query.text);

          // Bind parameters if provided
          if (query.params && query.params.length > 0) {
            stmt = stmt.bind(...query.params);
          }

          // Store statement for batch execution
          statements.push(stmt);

          // Return empty result (actual execution happens on commit)
          return ok({
            rows: [],
            rowCount: 0,
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
          // Execute all statements in a batch
          await database!.batch(statements);
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

        // Just mark as rolled back (don't execute statements)
        rolledBack = true;
        return ok(undefined);
      },
    };

    return ok(transaction);
  };

  dbAdapter.transaction = async <T>(
    fn: (tx: DatabaseTransaction) => Promise<Result<T, Error>>
  ): Promise<Result<T, Error>> => {
    const txResult = await dbAdapter.begin();
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

  return dbAdapter;
};
