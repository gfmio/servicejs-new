/**
 * MySQL/MariaDB Database Adapter
 *
 * Relational database with SQL queries, transactions, and connection pooling
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import mysql, { type Pool, type RowDataPacket, type ResultSetHeader } from 'mysql2/promise';

export interface MySQLConfig {
  /**
   * Database host
   * @default 'localhost'
   */
  host?: string;

  /**
   * Database port
   * @default 3306
   */
  port?: number;

  /**
   * Database user
   */
  user: string;

  /**
   * Database password
   */
  password: string;

  /**
   * Database name
   */
  database: string;

  /**
   * Connection pool options
   */
  pool?: {
    connectionLimit?: number;
    queueLimit?: number;
    waitForConnections?: boolean;
  };
}

export interface DatabaseQuery {
  text: string;
  params?: unknown[];
}

export interface DatabaseResult<TRow = unknown> {
  rows: TRow[];
  rowCount: number;
  affectedRows?: number;
  insertId?: number;
}

export interface DatabaseTransaction {
  id: string;
  query<TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>>;
  commit(): Promise<Result<void, Error>>;
  rollback(): Promise<Result<void, Error>>;
}

export interface DatabaseAdapter {
  init(config: MySQLConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  query<TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>>;
  begin(): Promise<Result<DatabaseTransaction, Error>>;

  // Convenience methods
  execute(query: DatabaseQuery): Promise<Result<DatabaseResult, Error>>;
}

/**
 * Create a MySQL/MariaDB database adapter
 *
 * @example
 * ```typescript
 * const db = createMySQLAdapter();
 *
 * await db.init({
 *   host: 'localhost',
 *   port: 3306,
 *   user: 'root',
 *   password: 'password',
 *   database: 'mydb'
 * });
 * await db.start();
 *
 * // Create table
 * await db.execute({
 *   text: 'CREATE TABLE users (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255), age INT)'
 * });
 *
 * // Insert data
 * await db.execute({
 *   text: 'INSERT INTO users (name, age) VALUES (?, ?)',
 *   params: ['Alice', 30]
 * });
 *
 * // Query data
 * const result = await db.query({
 *   text: 'SELECT * FROM users WHERE age > ?',
 *   params: [25]
 * });
 *
 * await db.stop();
 * await db.destroy();
 * ```
 */
export const createMySQLAdapter = (): DatabaseAdapter => {
  let pool: Pool | null = null;
  let transactionCounter = 0;

  return {
    init: async (config: MySQLConfig): Promise<Result<void, Error>> => {
      try {
        pool = mysql.createPool({
          host: config.host || 'localhost',
          port: config.port || 3306,
          user: config.user,
          password: config.password,
          database: config.database,
          connectionLimit: config.pool?.connectionLimit || 10,
          queueLimit: config.pool?.queueLimit || 0,
          waitForConnections: config.pool?.waitForConnections ?? true,
        });

        // Test connection
        const connection = await pool.getConnection();
        connection.release();

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
      // MySQL doesn't require explicit stop
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
        // Try a simple query to check health
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
        const [rows] = await pool.query<RowDataPacket[]>(query.text, query.params || []);
        const rowCount = rows.length;

        return ok({ rows: rows as TRow[], rowCount });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    execute: async (query: DatabaseQuery): Promise<Result<DatabaseResult, Error>> => {
      if (!pool) {
        return err(new Error('Database not initialized'));
      }

      try {
        const [result] = await pool.query<ResultSetHeader>(query.text, query.params || []);

        return ok({
          rows: [],
          rowCount: 0,
          affectedRows: result.affectedRows,
          insertId: result.insertId,
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
        const connection = await pool.getConnection();
        const txId = `tx-${++transactionCounter}`;
        let committed = false;
        let rolledBack = false;

        // Start transaction
        await connection.beginTransaction();

        const transaction: DatabaseTransaction = {
          id: txId,

          query: async <TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>> => {
            if (committed || rolledBack) {
              return err(new Error('Transaction already completed'));
            }

            try {
              const [rows] = await connection.query<RowDataPacket[]>(query.text, query.params || []);
              const rowCount = rows.length;

              return ok({ rows: rows as TRow[], rowCount });
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
              await connection.commit();
              connection.release();
              committed = true;
              return ok(undefined);
            } catch (error) {
              connection.release();
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
              await connection.rollback();
              connection.release();
              rolledBack = true;
              return ok(undefined);
            } catch (error) {
              connection.release();
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
