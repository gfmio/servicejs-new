/**
 * In-Memory LRU Cache Adapter
 *
 * Pure TypeScript implementation with no external dependencies
 */

import { ok, err } from '@servicejs/result';
import type { Result } from '@servicejs/result';

export interface LRUCacheConfig {
  maxSize: number;
  ttl?: number; // Default TTL in milliseconds
  onEvict?: (key: string, value: string) => void;
}

interface CacheEntry {
  value: string;
  expiresAt?: number;
}

export interface LRUCacheAdapter {
  init(config: LRUCacheConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  // Cache operations
  get(key: string): Promise<Result<string | null, Error>>;
  set(key: string, value: string, ttlMs?: number): Promise<Result<void, Error>>;
  del(key: string): Promise<Result<boolean, Error>>;
  has(key: string): Promise<Result<boolean, Error>>;
  clear(): Promise<Result<void, Error>>;
  size(): Promise<Result<number, Error>>;
  keys(): Promise<Result<string[], Error>>;
  values(): Promise<Result<string[], Error>>;
  entries(): Promise<Result<Array<[string, string]>, Error>>;
}

/**
 * Create an in-memory LRU cache adapter
 *
 * Features:
 * - LRU eviction policy
 * - Per-item and default TTL support
 * - Optional eviction callback
 * - Pure TypeScript, no dependencies
 *
 * @example
 * ```typescript
 * const cache = createLRUCacheAdapter();
 * await cache.init({
 *   maxSize: 1000,
 *   ttl: 60000, // 1 minute default TTL
 * });
 * await cache.start();
 *
 * await cache.set('key', 'value');
 * const result = await cache.get('key');
 *
 * await cache.set('temp', 'data', 5000); // 5 second TTL
 * ```
 */
export const createLRUCacheAdapter = (): LRUCacheAdapter => {
  let config: LRUCacheConfig | null = null;
  let cache: Map<string, CacheEntry> | null = null;
  let initialized = false;
  let cleanupInterval: ReturnType<typeof setInterval> | null = null;

  const evict = (key: string): void => {
    if (!cache) return;

    const entry = cache.get(key);
    if (entry && config?.onEvict) {
      config.onEvict(key, entry.value);
    }
    cache.delete(key);
  };

  const evictLRU = (): void => {
    if (!cache || !config) return;

    // Map maintains insertion order, so first key is least recently used
    const firstKey = cache.keys().next().value;
    if (firstKey) {
      evict(firstKey);
    }
  };

  const isExpired = (entry: CacheEntry): boolean => {
    if (entry.expiresAt === undefined) return false;
    return Date.now() > entry.expiresAt;
  };

  const cleanupExpired = (): void => {
    if (!cache) return;

    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt !== undefined && now > entry.expiresAt) {
        evict(key);
      }
    }
  };

  return {
    init: async (cfg: LRUCacheConfig): Promise<Result<void, Error>> => {
      if (cfg.maxSize <= 0) {
        return err(new Error('maxSize must be greater than 0'));
      }

      config = cfg;
      cache = new Map();
      initialized = true;

      return ok(undefined);
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!initialized || !cache) {
        return err(new Error('LRU cache not initialized'));
      }

      // Start cleanup interval for expired entries (every 10 seconds)
      cleanupInterval = setInterval(cleanupExpired, 10000);

      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
      }
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
      }

      cache?.clear();
      cache = null;
      config = null;
      initialized = false;

      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!initialized || !cache) {
        return ok({ status: 'unhealthy', error: new Error('LRU cache not initialized') });
      }

      return ok({ status: 'healthy' });
    },

    get: async (key: string): Promise<Result<string | null, Error>> => {
      if (!cache) return err(new Error('LRU cache not initialized'));

      try {
        const entry = cache.get(key);
        if (!entry) {
          return ok(null);
        }

        // Check expiration
        if (isExpired(entry)) {
          evict(key);
          return ok(null);
        }

        // Move to end (most recently used) by deleting and re-adding
        cache.delete(key);
        cache.set(key, entry);

        return ok(entry.value);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    set: async (key: string, value: string, ttlMs?: number): Promise<Result<void, Error>> => {
      if (!cache || !config) return err(new Error('LRU cache not initialized'));

      try {
        // Check if we need to evict
        if (!cache.has(key) && cache.size >= config.maxSize) {
          evictLRU();
        }

        // Remove if exists (to update position)
        if (cache.has(key)) {
          cache.delete(key);
        }

        let entry: CacheEntry;
        if (ttlMs !== undefined) {
          entry = { value, expiresAt: Date.now() + ttlMs };
        } else if (config.ttl !== undefined) {
          entry = { value, expiresAt: Date.now() + config.ttl };
        } else {
          entry = { value };
        }

        cache.set(key, entry);

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    del: async (key: string): Promise<Result<boolean, Error>> => {
      if (!cache) return err(new Error('LRU cache not initialized'));

      try {
        const existed = cache.has(key);
        if (existed) {
          evict(key);
        }
        return ok(existed);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    has: async (key: string): Promise<Result<boolean, Error>> => {
      if (!cache) return err(new Error('LRU cache not initialized'));

      try {
        const entry = cache.get(key);
        if (!entry) {
          return ok(false);
        }

        // Check expiration
        if (isExpired(entry)) {
          evict(key);
          return ok(false);
        }

        return ok(true);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    clear: async (): Promise<Result<void, Error>> => {
      if (!cache) return err(new Error('LRU cache not initialized'));

      try {
        // Call eviction callback for all entries if configured
        if (config?.onEvict) {
          for (const [key, entry] of cache.entries()) {
            config.onEvict(key, entry.value);
          }
        }

        cache.clear();
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    size: async (): Promise<Result<number, Error>> => {
      if (!cache) return err(new Error('LRU cache not initialized'));

      try {
        // Clean up expired entries first
        cleanupExpired();
        return ok(cache.size);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    keys: async (): Promise<Result<string[], Error>> => {
      if (!cache) return err(new Error('LRU cache not initialized'));

      try {
        const keys: string[] = [];
        for (const [key, entry] of cache.entries()) {
          if (!isExpired(entry)) {
            keys.push(key);
          } else {
            evict(key);
          }
        }
        return ok(keys);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    values: async (): Promise<Result<string[], Error>> => {
      if (!cache) return err(new Error('LRU cache not initialized'));

      try {
        const values: string[] = [];
        for (const [key, entry] of cache.entries()) {
          if (!isExpired(entry)) {
            values.push(entry.value);
          } else {
            evict(key);
          }
        }
        return ok(values);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    entries: async (): Promise<Result<Array<[string, string]>, Error>> => {
      if (!cache) return err(new Error('LRU cache not initialized'));

      try {
        const entries: Array<[string, string]> = [];
        for (const [key, entry] of cache.entries()) {
          if (!isExpired(entry)) {
            entries.push([key, entry.value]);
          } else {
            evict(key);
          }
        }
        return ok(entries);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
