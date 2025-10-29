/**
 * TypeORM Adapter
 *
 * Entity-based ORM with repository pattern
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import type { DataSource, EntityManager, Repository, ObjectLiteral } from 'typeorm';

export interface TypeORMAdapterConfig {
  // DataSource instance (must be provided by user)
  dataSource: DataSource;

  // Optional: Enable query logging
  enableLogging?: boolean;
}

export interface TypeORMAdapter {
  init(config: TypeORMAdapterConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  // Get the underlying DataSource
  getDataSource(): Result<DataSource, Error>;

  // Get entity manager
  getManager(): Result<EntityManager, Error>;

  // Get repository for entity
  getRepository<Entity extends ObjectLiteral>(
    entity: new () => Entity
  ): Result<Repository<Entity>, Error>;

  // Transaction support
  transaction<T>(
    fn: (manager: EntityManager) => Promise<T>
  ): Promise<Result<T, Error>>;

  // Raw query support
  query<T = any>(query: string, parameters?: any[]): Promise<Result<T, Error>>;
}

export const createTypeORMAdapter = (): TypeORMAdapter => {
  let dataSource: DataSource | null = null;
  let enableLogging = false;

  return {
    init: async (config: TypeORMAdapterConfig): Promise<Result<void, Error>> => {
      try {
        dataSource = config.dataSource;
        enableLogging = config.enableLogging || false;

        if (enableLogging) {
          console.log('[TypeORM] Adapter initialized');
        }

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!dataSource) {
        return err(new Error('DataSource not initialized'));
      }

      try {
        if (!dataSource.isInitialized) {
          await dataSource.initialize();

          if (enableLogging) {
            console.log('[TypeORM] DataSource initialized');
          }
        }

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    stop: async (): Promise<Result<void, Error>> => {
      if (!dataSource) {
        return ok(undefined);
      }

      try {
        if (dataSource.isInitialized) {
          await dataSource.destroy();

          if (enableLogging) {
            console.log('[TypeORM] DataSource destroyed');
          }
        }

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    destroy: async (): Promise<Result<void, Error>> => {
      if (dataSource && dataSource.isInitialized) {
        try {
          await dataSource.destroy();
        } catch (error) {
          // Ignore errors during destroy
        }
      }
      dataSource = null;
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!dataSource || !dataSource.isInitialized) {
        return ok({ status: 'unhealthy', error: new Error('DataSource not initialized') });
      }

      try {
        // Test database connection with a simple query
        await dataSource.query('SELECT 1');
        return ok({ status: 'healthy' });
      } catch (error) {
        return ok({
          status: 'unhealthy',
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    },

    getDataSource: (): Result<DataSource, Error> => {
      if (!dataSource) {
        return err(new Error('DataSource not initialized'));
      }
      if (!dataSource.isInitialized) {
        return err(new Error('DataSource not initialized'));
      }
      return ok(dataSource);
    },

    getManager: (): Result<EntityManager, Error> => {
      if (!dataSource) {
        return err(new Error('DataSource not initialized'));
      }
      if (!dataSource.isInitialized) {
        return err(new Error('DataSource not initialized'));
      }
      return ok(dataSource.manager);
    },

    getRepository: <Entity extends ObjectLiteral>(
      entity: new () => Entity
    ): Result<Repository<Entity>, Error> => {
      if (!dataSource) {
        return err(new Error('DataSource not initialized'));
      }
      if (!dataSource.isInitialized) {
        return err(new Error('DataSource not initialized'));
      }

      try {
        const repository = dataSource.getRepository(entity);
        return ok(repository);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    transaction: async <T>(
      fn: (manager: EntityManager) => Promise<T>
    ): Promise<Result<T, Error>> => {
      if (!dataSource) {
        return err(new Error('DataSource not initialized'));
      }
      if (!dataSource.isInitialized) {
        return err(new Error('DataSource not initialized'));
      }

      try {
        const result = await dataSource.transaction(fn);
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    query: async <T = any>(
      query: string,
      parameters?: any[]
    ): Promise<Result<T, Error>> => {
      if (!dataSource) {
        return err(new Error('DataSource not initialized'));
      }
      if (!dataSource.isInitialized) {
        return err(new Error('DataSource not initialized'));
      }

      try {
        const result = await dataSource.query(query, parameters);
        return ok(result as T);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
