/**
 * Drizzle ORM Adapter
 * Supports SQLite, MySQL, and PostgreSQL
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import { drizzle as drizzleSqlite, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzleMysql, type MySql2Database } from 'drizzle-orm/mysql2';
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type Database from 'better-sqlite3';
import type mysql from 'mysql2/promise';
import type postgres from 'postgres';

export type DrizzleDatabase =
  | BetterSQLite3Database<Record<string, never>>
  | MySql2Database<Record<string, never>>
  | PostgresJsDatabase<Record<string, never>>;

export interface DrizzleSQLiteConfig {
  type: 'sqlite';
  database: typeof Database.prototype;
}

export interface DrizzleMySQLConfig {
  type: 'mysql';
  connection: mysql.Pool | mysql.Connection;
}

export interface DrizzlePostgresConfig {
  type: 'postgres';
  client: postgres.Sql;
}

export type DrizzleConfig = DrizzleSQLiteConfig | DrizzleMySQLConfig | DrizzlePostgresConfig;

export interface DatabaseAdapter<TSchema = Record<string, never>> {
  init(config: DrizzleConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  getDb(): DrizzleDatabase | null;
}

export const createDrizzleAdapter = <TSchema = Record<string, never>>(): DatabaseAdapter<TSchema> => {
  let db: DrizzleDatabase | null = null;
  let configType: 'sqlite' | 'mysql' | 'postgres' | null = null;
  let rawConnection: any = null;

  return {
    init: async (config: DrizzleConfig): Promise<Result<void, Error>> => {
      try {
        configType = config.type;

        switch (config.type) {
          case 'sqlite':
            db = drizzleSqlite(config.database) as DrizzleDatabase;
            rawConnection = config.database;
            break;
          case 'mysql':
            db = drizzleMysql(config.connection) as DrizzleDatabase;
            rawConnection = config.connection;
            break;
          case 'postgres':
            db = drizzlePostgres(config.client) as DrizzleDatabase;
            rawConnection = config.client;
            break;
        }

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!db) {
        return err(new Error('Database not initialized'));
      }
      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      if (rawConnection) {
        try {
          if (configType === 'sqlite' && typeof rawConnection.close === 'function') {
            rawConnection.close();
          } else if (configType === 'mysql' && typeof rawConnection.end === 'function') {
            await rawConnection.end();
          } else if (configType === 'postgres' && typeof rawConnection.end === 'function') {
            await rawConnection.end();
          }
        } catch (error) {
          // Ignore cleanup errors
        }
        rawConnection = null;
      }
      db = null;
      configType = null;
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!db) {
        return ok({ status: 'unhealthy', error: new Error('Database not initialized') });
      }

      try {
        // Try a simple query based on database type
        if (configType === 'sqlite') {
          await (db as BetterSQLite3Database).run('SELECT 1' as any);
        } else if (configType === 'mysql') {
          await (db as MySql2Database).execute('SELECT 1' as any);
        } else if (configType === 'postgres') {
          await (db as PostgresJsDatabase).execute('SELECT 1' as any);
        }
        return ok({ status: 'healthy' });
      } catch (error) {
        return ok({
          status: 'unhealthy',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },

    getDb: (): DrizzleDatabase | null => {
      return db;
    },
  };
};
