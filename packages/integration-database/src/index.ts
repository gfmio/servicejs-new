/**
 * @servicejs/integration-database
 *
 * Database adapter interfaces for ServiceJS
 *
 * Provides base interfaces for SQL, NoSQL, and KV store integrations.
 * Supports:
 * - SQL databases (PostgreSQL, MySQL, SQLite)
 * - NoSQL databases (MongoDB, DynamoDB)
 * - Key-value stores (Redis, Memcached)
 */

export type {
  DatabaseAdapter,
  DatabaseConfig,
  DatabaseQuery,
  DatabaseResult,
  DatabaseTransaction,
} from './database.js';

export {
  createDatabaseAdapter,
} from './database.js';
