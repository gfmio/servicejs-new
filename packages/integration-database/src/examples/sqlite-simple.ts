/**
 * Simple SQLite Database Adapter Example
 *
 * Demonstrates how to implement a basic SQLite database adapter.
 * This is a minimal in-memory example - production adapters would use actual SQLite drivers.
 */

import { ok, err, type Result } from '@servicejs/result';
import {
  createDatabaseAdapter,
  type DatabaseAdapter,
  type DatabaseQuery,
  type DatabaseResult,
  type DatabaseTransaction,
} from '../database.js';

/**
 * Simple in-memory database (simulates SQLite)
 */
class SimpleInMemoryDb {
  private data: Map<string, unknown[]> = new Map();
  private nextId = 1;

  query(sql: string, params: unknown[] = []): unknown[] {
    // Very simplified SQL parsing - just for demonstration
    if (sql.startsWith('CREATE TABLE')) {
      const match = sql.match(/CREATE TABLE (\w+)/);
      if (match) {
        this.data.set(match[1], []);
      }
      return [];
    }

    if (sql.startsWith('INSERT INTO')) {
      const match = sql.match(/INSERT INTO (\w+)/);
      if (match) {
        const table = this.data.get(match[1]) || [];
        const id = this.nextId++;
        table.push({ id, ...params });
        this.data.set(match[1], table);
        return [{ id }];
      }
      return [];
    }

    if (sql.startsWith('SELECT')) {
      const match = sql.match(/FROM (\w+)/);
      if (match) {
        return this.data.get(match[1]) || [];
      }
      return [];
    }

    return [];
  }

  close() {
    this.data.clear();
  }
}

/**
 * Create a simple SQLite adapter
 *
 * This is an example implementation using in-memory storage.
 * Real implementations would use better-sqlite3, bun:sqlite, etc.
 *
 * @example
 * ```typescript
 * const db = createSimpleSqliteAdapter();
 *
 * await db.init({ connection: ':memory:' });
 * await db.start();
 *
 * // Create table
 * await db.query({
 *   text: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)',
 * });
 *
 * // Insert data
 * await db.query({
 *   text: 'INSERT INTO users (name) VALUES (?)',
 *   params: ['Alice'],
 * });
 *
 * // Query data
 * const result = await db.query<{ id: number; name: string }>({
 *   text: 'SELECT * FROM users',
 * });
 *
 * // Later...
 * await db.stop();
 * await db.destroy();
 * ```
 */
export const createSimpleSqliteAdapter = (): DatabaseAdapter => {
  let database: SimpleInMemoryDb | null = null;
  let transactionCounter = 0;

  const adapter = createDatabaseAdapter(
    {
      name: 'simple-sqlite',
      version: '1.0.0',
      type: 'database',
      platforms: ['node', 'bun'],
      description: 'Simple SQLite example adapter',
    },
    {
      onInit: async (config) => {
        // In a real implementation, you would open the database here
        // For example: database = new Database(config.connection)

        database = new SimpleInMemoryDb();
        return ok(undefined);
      },

      onStart: async () => {
        if (!database) {
          return err(new Error('Database not initialized'));
        }
        return ok(undefined);
      },

      onStop: async () => {
        // In a real implementation, you might close connections here
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

        // In a real implementation, you might run a test query
        // For example: SELECT 1

        return ok({ status: 'healthy' });
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
      const rows = database.query(query.text, query.params) as TRow[];

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

    const transaction: DatabaseTransaction = {
      id: txId,

      query: async <TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>> => {
        if (committed || rolledBack) {
          return err(new Error('Transaction already completed'));
        }

        // In a real implementation, this would execute in the transaction context
        return dbAdapter.query<TRow>(query);
      },

      commit: async (): Promise<Result<void, Error>> => {
        if (committed) {
          return err(new Error('Transaction already committed'));
        }
        if (rolledBack) {
          return err(new Error('Transaction already rolled back'));
        }

        // In a real implementation, you would commit the transaction
        committed = true;
        return ok(undefined);
      },

      rollback: async (): Promise<Result<void, Error>> => {
        if (committed) {
          return err(new Error('Transaction already committed'));
        }
        if (rolledBack) {
          return err(new Error('Transaction already rolled back'));
        }

        // In a real implementation, you would rollback the transaction
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
    if (txResult.isErr()) {
      return err(txResult.error);
    }

    const tx = txResult.value;

    try {
      const result = await fn(tx);

      if (result.isErr()) {
        await tx.rollback();
        return result;
      }

      const commitResult = await tx.commit();
      if (commitResult.isErr()) {
        return err(commitResult.error);
      }

      return result;
    } catch (error) {
      await tx.rollback();
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return dbAdapter;
};

/**
 * Example: Create a database with schema and queries
 *
 * @example
 * ```typescript
 * const db = createSimpleSqliteAdapter();
 * await db.init({ connection: ':memory:' });
 * await db.start();
 *
 * // Create schema
 * await db.query({
 *   text: `
 *     CREATE TABLE users (
 *       id INTEGER PRIMARY KEY,
 *       name TEXT NOT NULL,
 *       email TEXT NOT NULL
 *     )
 *   `,
 * });
 *
 * // Use transaction
 * await db.transaction(async (tx) => {
 *   await tx.query({
 *     text: 'INSERT INTO users (name, email) VALUES (?, ?)',
 *     params: ['Alice', 'alice@example.com'],
 *   });
 *
 *   await tx.query({
 *     text: 'INSERT INTO users (name, email) VALUES (?, ?)',
 *     params: ['Bob', 'bob@example.com'],
 *   });
 *
 *   return ok(undefined);
 * });
 *
 * // Query users
 * const result = await db.query<{ id: number; name: string; email: string }>({
 *   text: 'SELECT * FROM users',
 * });
 *
 * if (result.isOk()) {
 *   console.log('Users:', result.value.rows);
 * }
 * ```
 */
export const exampleDatabaseUsage = async () => {
  const db = createSimpleSqliteAdapter();

  await db.init({ connection: ':memory:' });
  await db.start();

  // Create schema
  await db.query({
    text: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)',
  });

  // Insert with transaction
  await db.transaction(async (tx) => {
    await tx.query({
      text: 'INSERT INTO users (name, email) VALUES (?, ?)',
      params: ['Alice', 'alice@example.com'],
    });

    await tx.query({
      text: 'INSERT INTO users (name, email) VALUES (?, ?)',
      params: ['Bob', 'bob@example.com'],
    });

    return ok(undefined);
  });

  // Query
  const result = await db.query<{ id: number; name: string; email: string }>({
    text: 'SELECT * FROM users',
  });

  return { db, result };
};
