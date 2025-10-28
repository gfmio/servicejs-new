/**
 * Bun SQLite Database Adapter
 *
 * Real implementation using bun:sqlite
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
import { Database } from 'bun:sqlite';

export interface SqliteConfig {
  filename: string;
  readonly?: boolean;
  create?: boolean;
  readwrite?: boolean;
}

/**
 * Create a SQLite database adapter
 *
 * Uses Bun's native SQLite implementation (bun:sqlite) for maximum performance.
 *
 * @example
 * ```typescript
 * const db = createSqliteAdapter();
 *
 * await db.init({ filename: ':memory:' });
 * await db.start();
 *
 * // Create table
 * await db.query({
 *   text: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)',
 * });
 *
 * // Insert data
 * await db.query({
 *   text: 'INSERT INTO users (name, email) VALUES (?, ?)',
 *   params: ['Alice', 'alice@example.com'],
 * });
 *
 * // Query data
 * const result = await db.query<{ id: number; name: string; email: string }>({
 *   text: 'SELECT * FROM users',
 * });
 *
 * // Use transactions
 * await db.transaction(async (tx) => {
 *   await tx.query({
 *     text: 'INSERT INTO users (name, email) VALUES (?, ?)',
 *     params: ['Bob', 'bob@example.com'],
 *   });
 *   return ok(undefined);
 * });
 *
 * // Later...
 * await db.stop();
 * await db.destroy();
 * ```
 */
export const createSqliteAdapter = (): DatabaseAdapter => {
  let database: Database | null = null;
  let transactionCounter = 0;

  const adapter = createDatabaseAdapter(
    {
      name: 'sqlite',
      version: '1.0.0',
      type: 'database',
      platforms: ['bun'],
      description: 'SQLite database adapter using bun:sqlite',
    },
    {
      onInit: async (cfg) => {
        const config = cfg as unknown as SqliteConfig;

        if (!config.filename) {
          return err(new Error('Filename is required'));
        }

        try {
          const options: { readonly?: boolean; create?: boolean; readwrite?: boolean } = {};

          // Default to readwrite if not specified
          if (config.readonly !== undefined) {
            options.readonly = config.readonly;
          } else if (config.readwrite !== undefined) {
            options.readwrite = config.readwrite;
          } else {
            // Default: readwrite + create
            options.readwrite = true;
            options.create = config.create !== false; // Default to true unless explicitly false
          }

          if (config.create !== undefined && !options.readonly) {
            options.create = config.create;
          }

          database = new Database(config.filename, options);

          return ok(undefined);
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
      },

      onStart: async () => {
        if (!database) {
          return err(new Error('Database not initialized'));
        }
        return ok(undefined);
      },

      onStop: async () => {
        // SQLite doesn't need explicit stop
        return ok(undefined);
      },

      onDestroy: async () => {
        if (database) {
          database.close();
          database = null;
        }
        return ok(undefined);
      },

      onHealth: async () => {
        if (!database) {
          return ok({ status: 'unhealthy', error: new Error('Database not initialized') });
        }

        try {
          // Test query
          database.query('SELECT 1').get();
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
      const stmt = database.query(query.text);

      // Check if this is a SELECT query (returns rows)
      const isSelect = query.text.trim().toUpperCase().startsWith('SELECT');

      let rows: TRow[];
      if (isSelect) {
        if (query.params && query.params.length > 0) {
          rows = stmt.all(...(query.params as any[])) as TRow[];
        } else {
          rows = stmt.all() as TRow[];
        }
      } else {
        // For INSERT/UPDATE/DELETE, run the query and return empty rows
        if (query.params && query.params.length > 0) {
          stmt.run(...(query.params as any[]));
        } else {
          stmt.run();
        }
        rows = [];
      }

      return ok({
        rows,
        rowCount: rows.length,
      });
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

    // Begin transaction
    try {
      database.run('BEGIN');
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }

    const transaction: DatabaseTransaction = {
      id: txId,

      query: async <TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>> => {
        if (committed || rolledBack) {
          return err(new Error('Transaction already completed'));
        }
        return dbAdapter.query<TRow>(query);
      },

      commit: async (): Promise<Result<void, Error>> => {
        if (committed) {
          return err(new Error('Transaction already committed'));
        }
        if (rolledBack) {
          return err(new Error('Transaction already rolled back'));
        }

        try {
          database!.run('COMMIT');
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
          database!.run('ROLLBACK');
          rolledBack = true;
          return ok(undefined);
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
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
