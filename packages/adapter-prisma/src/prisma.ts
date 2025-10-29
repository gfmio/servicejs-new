/**
 * Prisma ORM Adapter
 *
 * Type-safe database access with Prisma Client
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import type { PrismaClient } from '@prisma/client';

export interface PrismaAdapterConfig {
  // Prisma client instance (must be provided by user)
  client: PrismaClient;

  // Optional: Enable query logging
  enableLogging?: boolean;
}

export interface TransactionOptions {
  maxWait?: number;
  timeout?: number;
  isolationLevel?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable';
}

export interface PrismaAdapter {
  init(config: PrismaAdapterConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  // Get the underlying Prisma client for direct access
  getClient(): Result<PrismaClient, Error>;

  // Transaction support
  transaction<T>(
    fn: (client: PrismaClient) => Promise<T>,
    options?: TransactionOptions
  ): Promise<Result<T, Error>>;

  // Raw query support
  queryRaw<T = unknown>(
    query: string | TemplateStringsArray,
    ...values: any[]
  ): Promise<Result<T, Error>>;

  executeRaw(
    query: string | TemplateStringsArray,
    ...values: any[]
  ): Promise<Result<number, Error>>;

  // Metrics (if available)
  getMetrics(): Promise<Result<any, Error>>;
}

export const createPrismaAdapter = (): PrismaAdapter => {
  let client: PrismaClient | null = null;
  let enableLogging = false;

  return {
    init: async (config: PrismaAdapterConfig): Promise<Result<void, Error>> => {
      try {
        client = config.client;
        enableLogging = config.enableLogging || false;

        if (enableLogging) {
          console.log('[Prisma] Adapter initialized');
        }

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Prisma client not initialized'));
      }

      try {
        // Connect to database
        await client.$connect();

        if (enableLogging) {
          console.log('[Prisma] Connected to database');
        }

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    stop: async (): Promise<Result<void, Error>> => {
      if (!client) {
        return ok(undefined);
      }

      try {
        // Disconnect from database
        await client.$disconnect();

        if (enableLogging) {
          console.log('[Prisma] Disconnected from database');
        }

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    destroy: async (): Promise<Result<void, Error>> => {
      if (client) {
        try {
          await client.$disconnect();
        } catch (error) {
          // Ignore errors during destroy
        }
        client = null;
      }
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!client) {
        return ok({ status: 'unhealthy', error: new Error('Prisma client not initialized') });
      }

      try {
        // Test database connection with a simple query
        await client.$queryRaw`SELECT 1`;
        return ok({ status: 'healthy' });
      } catch (error) {
        return ok({
          status: 'unhealthy',
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    },

    getClient: (): Result<PrismaClient, Error> => {
      if (!client) {
        return err(new Error('Prisma client not initialized'));
      }
      return ok(client);
    },

    transaction: async <T>(
      fn: (client: PrismaClient) => Promise<T>,
      options?: TransactionOptions
    ): Promise<Result<T, Error>> => {
      if (!client) {
        return err(new Error('Prisma client not initialized'));
      }

      try {
        const result = await client.$transaction(
          fn as any,
          options as any
        );

        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    queryRaw: async <T = unknown>(
      query: string | TemplateStringsArray,
      ...values: any[]
    ): Promise<Result<T, Error>> => {
      if (!client) {
        return err(new Error('Prisma client not initialized'));
      }

      try {
        let result: any;

        if (typeof query === 'string') {
          // String query
          result = await client.$queryRawUnsafe(query, ...values);
        } else {
          // Tagged template
          result = await (client.$queryRaw as any)(query, ...values);
        }

        return ok(result as T);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    executeRaw: async (
      query: string | TemplateStringsArray,
      ...values: any[]
    ): Promise<Result<number, Error>> => {
      if (!client) {
        return err(new Error('Prisma client not initialized'));
      }

      try {
        let result: number;

        if (typeof query === 'string') {
          // String query
          result = await client.$executeRawUnsafe(query, ...values);
        } else {
          // Tagged template
          result = await (client.$executeRaw as any)(query, ...values);
        }

        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    getMetrics: async (): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Prisma client not initialized'));
      }

      try {
        // Check if metrics are available
        if ('$metrics' in client && typeof (client as any).$metrics === 'object') {
          const metrics = await (client as any).$metrics.json();
          return ok(metrics);
        }

        return err(new Error('Metrics not enabled in Prisma client'));
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
