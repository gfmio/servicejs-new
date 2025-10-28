/**
 * Cloudflare KV Cache Adapter
 *
 * Implementation using Cloudflare Workers KV namespace
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';

/**
 * Cloudflare KV namespace interface
 * This represents the KV namespace binding in Cloudflare Workers
 */
export interface KVNamespace {
  get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<any>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: KVPutOptions): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: KVListOptions): Promise<KVListResult>;
}

export interface KVPutOptions {
  expiration?: number;
  expirationTtl?: number;
  metadata?: Record<string, any>;
}

export interface KVListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export interface KVListResult {
  keys: Array<{ name: string; expiration?: number; metadata?: any }>;
  list_complete: boolean;
  cursor?: string;
}

export interface CloudflareKVConfig {
  /**
   * KV namespace binding
   * This is provided by Cloudflare Workers environment
   */
  namespace: KVNamespace;

  /**
   * Default TTL in seconds for cached values
   */
  defaultTTL?: number;
}

export interface CacheAdapter {
  init(config: CloudflareKVConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  get<T = unknown>(key: string): Promise<Result<T | null, Error>>;
  set<T = unknown>(key: string, value: T, ttl?: number): Promise<Result<void, Error>>;
  delete(key: string): Promise<Result<boolean, Error>>;
  exists(key: string): Promise<Result<boolean, Error>>;
  list(prefix?: string, limit?: number): Promise<Result<string[], Error>>;
  flush(prefix?: string): Promise<Result<void, Error>>;
}

/**
 * Create a Cloudflare KV cache adapter
 *
 * @example
 * ```typescript
 * // In a Cloudflare Worker
 * export default {
 *   async fetch(request: Request, env: Env): Promise<Response> {
 *     const cache = createCloudflareKVAdapter();
 *
 *     await cache.init({ namespace: env.MY_KV_NAMESPACE });
 *     await cache.start();
 *
 *     // Set value
 *     await cache.set('user:123', { name: 'Alice', email: 'alice@example.com' }, 3600);
 *
 *     // Get value
 *     const result = await cache.get<{ name: string; email: string }>('user:123');
 *     if (isOk(result) && result.value) {
 *       return new Response(JSON.stringify(result.value));
 *     }
 *
 *     return new Response('Not found', { status: 404 });
 *   }
 * };
 * ```
 */
export const createCloudflareKVAdapter = (): CacheAdapter => {
  let namespace: KVNamespace | null = null;
  let defaultTTL: number | undefined;

  return {
    init: async (config: CloudflareKVConfig): Promise<Result<void, Error>> => {
      try {
        namespace = config.namespace;
        defaultTTL = config.defaultTTL;
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!namespace) {
        return err(new Error('KV namespace not initialized'));
      }
      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      // KV doesn't require explicit stop
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      namespace = null;
      defaultTTL = undefined;
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!namespace) {
        return ok({ status: 'unhealthy', error: new Error('KV namespace not initialized') });
      }

      try {
        // Try to list keys to verify connection
        await namespace.list({ limit: 1 });
        return ok({ status: 'healthy' });
      } catch (error) {
        return ok({
          status: 'unhealthy',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },

    get: async <T = unknown>(key: string): Promise<Result<T | null, Error>> => {
      if (!namespace) {
        return err(new Error('KV namespace not initialized'));
      }

      try {
        // KV can return typed values directly with { type: 'json' }
        const value = await namespace.get(key, { type: 'json' });
        return ok(value as T | null);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    set: async <T = unknown>(key: string, value: T, ttl?: number): Promise<Result<void, Error>> => {
      if (!namespace) {
        return err(new Error('KV namespace not initialized'));
      }

      try {
        const serialized = JSON.stringify(value);
        const options: KVPutOptions = {};

        const effectiveTTL = ttl ?? defaultTTL;
        if (effectiveTTL !== undefined) {
          options.expirationTtl = effectiveTTL;
        }

        await namespace.put(key, serialized, options);
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    delete: async (key: string): Promise<Result<boolean, Error>> => {
      if (!namespace) {
        return err(new Error('KV namespace not initialized'));
      }

      try {
        // Check if key exists before deletion
        const existsBefore = await namespace.get(key);
        await namespace.delete(key);
        return ok(existsBefore !== null);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    exists: async (key: string): Promise<Result<boolean, Error>> => {
      if (!namespace) {
        return err(new Error('KV namespace not initialized'));
      }

      try {
        const value = await namespace.get(key);
        return ok(value !== null);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    list: async (prefix?: string, limit?: number): Promise<Result<string[], Error>> => {
      if (!namespace) {
        return err(new Error('KV namespace not initialized'));
      }

      try {
        const options: KVListOptions = {};
        if (prefix) options.prefix = prefix;
        if (limit) options.limit = limit;

        const result = await namespace.list(options);
        const keys = result.keys.map(k => k.name);
        return ok(keys);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    flush: async (prefix?: string): Promise<Result<void, Error>> => {
      if (!namespace) {
        return err(new Error('KV namespace not initialized'));
      }

      try {
        // List all keys (with optional prefix) and delete them
        let cursor: string | undefined;
        const batchSize = 1000; // KV list limit

        do {
          const options: KVListOptions = { limit: batchSize };
          if (prefix) options.prefix = prefix;
          if (cursor) options.cursor = cursor;

          const result = await namespace.list(options);

          // Delete all keys in this batch
          await Promise.all(
            result.keys.map(key => namespace!.delete(key.name))
          );

          cursor = result.list_complete ? undefined : result.cursor;
        } while (cursor);

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
