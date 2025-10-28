/**
 * Memcached Cache Adapter
 *
 * Implementation using memjs
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import { Client } from 'memjs';

export interface MemcachedConfig {
  /**
   * Memcached servers (comma-separated or array)
   * @example 'localhost:11211' or ['server1:11211', 'server2:11211']
   */
  servers?: string | string[];

  /**
   * Username for SASL authentication
   */
  username?: string;

  /**
   * Password for SASL authentication
   */
  password?: string;

  /**
   * Connection timeout in milliseconds
   */
  timeout?: number;

  /**
   * Number of connection retries
   */
  retries?: number;

  /**
   * Retry delay in milliseconds
   */
  retryDelay?: number;
}

export interface CacheAdapter {
  init(config: MemcachedConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  get<T = unknown>(key: string): Promise<Result<T | null, Error>>;
  set<T = unknown>(key: string, value: T, ttl?: number): Promise<Result<void, Error>>;
  delete(key: string): Promise<Result<boolean, Error>>;
  exists(key: string): Promise<Result<boolean, Error>>;
  flush(): Promise<Result<void, Error>>;
}

/**
 * Create a Memcached cache adapter
 *
 * @example
 * ```typescript
 * const cache = createMemcachedAdapter();
 *
 * await cache.init({ servers: 'localhost:11211' });
 * await cache.start();
 *
 * // Set value
 * await cache.set('user:123', { name: 'Alice', email: 'alice@example.com' }, 3600);
 *
 * // Get value
 * const result = await cache.get<{ name: string; email: string }>('user:123');
 * if (isOk(result) && result.value) {
 *   console.log(result.value.name);
 * }
 *
 * // Delete value
 * await cache.delete('user:123');
 *
 * await cache.stop();
 * await cache.destroy();
 * ```
 */
export const createMemcachedAdapter = (): CacheAdapter => {
  let client: Client | null = null;

  return {
    init: async (config: MemcachedConfig): Promise<Result<void, Error>> => {
      try {
        const servers = Array.isArray(config.servers)
          ? config.servers.join(',')
          : config.servers || 'localhost:11211';

        const options: any = {};

        if (config.username) {
          options.username = config.username;
        }

        if (config.password) {
          options.password = config.password;
        }

        if (config.timeout !== undefined) {
          options.timeout = config.timeout / 1000; // memjs uses seconds
        }

        if (config.retries !== undefined) {
          options.retries = config.retries;
        }

        if (config.retryDelay !== undefined) {
          options.retry_delay = config.retryDelay / 1000; // memjs uses seconds
        }

        client = Client.create(servers, options);

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Client not initialized'));
      }
      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      // Memjs doesn't require explicit stop
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      if (client) {
        client.close();
        client = null;
      }
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!client) {
        return ok({ status: 'unhealthy', error: new Error('Client not initialized') });
      }

      try {
        // Try to set and get a test value
        await new Promise<void>((resolve, reject) => {
          client!.set('__health_check__', 'ok', {}, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });

        return ok({ status: 'healthy' });
      } catch (error) {
        return ok({
          status: 'unhealthy',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },

    get: async <T = unknown>(key: string): Promise<Result<T | null, Error>> => {
      if (!client) {
        return err(new Error('Client not initialized'));
      }

      try {
        const value = await new Promise<T | null>((resolve, reject) => {
          client!.get(key, (error, data) => {
            if (error) {
              reject(error);
            } else if (!data) {
              resolve(null);
            } else {
              try {
                const parsed = JSON.parse(data.toString());
                resolve(parsed as T);
              } catch {
                // If not JSON, return as string
                resolve(data.toString() as T);
              }
            }
          });
        });

        return ok(value);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    set: async <T = unknown>(key: string, value: T, ttl?: number): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Client not initialized'));
      }

      try {
        const serialized = JSON.stringify(value);
        const options: any = {};

        if (ttl !== undefined) {
          options.expires = ttl;
        }

        await new Promise<void>((resolve, reject) => {
          client!.set(key, serialized, options, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    delete: async (key: string): Promise<Result<boolean, Error>> => {
      if (!client) {
        return err(new Error('Client not initialized'));
      }

      try {
        const deleted = await new Promise<boolean>((resolve, reject) => {
          client!.delete(key, (error, success) => {
            if (error) reject(error);
            else resolve(success === true);
          });
        });

        return ok(deleted);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    exists: async (key: string): Promise<Result<boolean, Error>> => {
      if (!client) {
        return err(new Error('Client not initialized'));
      }

      try {
        const exists = await new Promise<boolean>((resolve, reject) => {
          client!.get(key, (error, data) => {
            if (error) reject(error);
            else resolve(data !== null);
          });
        });

        return ok(exists);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    flush: async (): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Client not initialized'));
      }

      try {
        await new Promise<void>((resolve, reject) => {
          client!.flush((error) => {
            if (error) reject(error);
            else resolve();
          });
        });

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
