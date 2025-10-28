/**
 * Database Adapter Framework
 *
 * Base interfaces for database integrations (SQL, NoSQL, KV stores)
 *
 * Supports:
 * - SQL databases (PostgreSQL, MySQL, SQLite)
 * - NoSQL databases (MongoDB, Redis, DynamoDB)
 * - Key-value stores (Redis, Memcached)
 */

import { type Result } from '@servicejs/result';
import { type Integration, type IntegrationMetadata, createIntegration } from '@servicejs/integrations';

// ============================================================================
// Types
// ============================================================================

/**
 * Database configuration
 */
export interface DatabaseConfig {
  /** Connection string or host */
  connection: string;

  /** Database name */
  database?: string;

  /** Authentication */
  auth?: {
    username: string;
    password: string;
  };

  /** Connection pool settings */
  pool?: {
    min?: number;
    max?: number;
    idleTimeout?: number;
  };

  /** Additional database-specific options */
  [key: string]: unknown;
}

/**
 * Database query
 */
export interface DatabaseQuery {
  /** Query text (SQL, Cypher, etc.) */
  text: string;

  /** Query parameters */
  params?: unknown[];

  /** Query options */
  options?: {
    timeout?: number;
    [key: string]: unknown;
  };
}

/**
 * Database query result
 */
export interface DatabaseResult<TRow = unknown> {
  /** Rows returned */
  rows: TRow[];

  /** Number of rows affected */
  rowCount?: number;

  /** Additional metadata */
  metadata?: {
    [key: string]: unknown;
  };
}

/**
 * Database transaction
 */
export interface DatabaseTransaction {
  /** Transaction ID */
  readonly id: string;

  /** Execute query in transaction */
  query<TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>>;

  /** Commit transaction */
  commit(): Promise<Result<void, Error>>;

  /** Rollback transaction */
  rollback(): Promise<Result<void, Error>>;
}

/**
 * Database adapter interface
 */
export interface DatabaseAdapter extends Integration {
  /**
   * Execute a query
   */
  query<TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>>;

  /**
   * Begin a transaction
   */
  begin(): Promise<Result<DatabaseTransaction, Error>>;

  /**
   * Execute in a transaction
   */
  transaction<T>(fn: (tx: DatabaseTransaction) => Promise<Result<T, Error>>): Promise<Result<T, Error>>;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a database adapter
 *
 * @example
 * ```typescript
 * const db = createDatabaseAdapter(
 *   {
 *     name: 'postgresql',
 *     version: '1.0.0',
 *     type: 'database',
 *     platforms: ['node', 'bun']
 *   },
 *   {
 *     onInit: async (config) => {
 *       // Connect to database
 *       return ok(undefined);
 *     },
 *     onDestroy: async () => {
 *       // Close connections
 *       return ok(undefined);
 *     }
 *   }
 * );
 * ```
 */
export const createDatabaseAdapter = (
  metadata: IntegrationMetadata,
  handlers: Parameters<typeof createIntegration>[1]
): DatabaseAdapter => {
  const base = createIntegration(metadata, handlers);

  return {
    ...base,

    async query<TRow = unknown>(_query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>> {
      // Implement in specific adapter
      throw new Error('query() must be implemented by database adapter');
    },

    async begin(): Promise<Result<DatabaseTransaction, Error>> {
      // Implement in specific adapter
      throw new Error('begin() must be implemented by database adapter');
    },

    async transaction<T>(
      _fn: (tx: DatabaseTransaction) => Promise<Result<T, Error>>
    ): Promise<Result<T, Error>> {
      // Implement in specific adapter
      throw new Error('transaction() must be implemented by database adapter');
    },
  };
};
