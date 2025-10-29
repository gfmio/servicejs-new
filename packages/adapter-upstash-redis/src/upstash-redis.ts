/**
 * Upstash Redis Adapter
 *
 * Edge-compatible Redis using Upstash REST API
 * Works in Cloudflare Workers, Deno Deploy, and other edge runtimes
 */

import { Redis } from '@upstash/redis';
import { ok, err } from '@servicejs/result';
import type { Result } from '@servicejs/result';

export interface UpstashRedisConfig {
  url: string;
  token: string;
  enableAutoPipelining?: boolean;
  enableTelemetry?: boolean;
}

export interface UpstashCacheAdapter {
  init(config: UpstashRedisConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  // Cache operations
  get(key: string): Promise<Result<string | null, Error>>;
  set(key: string, value: string, ttlSeconds?: number): Promise<Result<void, Error>>;
  del(key: string): Promise<Result<number, Error>>;
  exists(key: string): Promise<Result<number, Error>>;
  expire(key: string, ttlSeconds: number): Promise<Result<number, Error>>;
  ttl(key: string): Promise<Result<number, Error>>;

  // Batch operations
  mget(keys: string[]): Promise<Result<Array<string | null>, Error>>;
  mset(entries: Record<string, string>): Promise<Result<void, Error>>;
  mdel(keys: string[]): Promise<Result<number, Error>>;

  // Hash operations
  hget(key: string, field: string): Promise<Result<string | null, Error>>;
  hset(key: string, field: string, value: string): Promise<Result<number, Error>>;
  hgetall(key: string): Promise<Result<Record<string, string>, Error>>;
  hdel(key: string, fields: string[]): Promise<Result<number, Error>>;

  // List operations
  lpush(key: string, values: string[]): Promise<Result<number, Error>>;
  rpush(key: string, values: string[]): Promise<Result<number, Error>>;
  lpop(key: string): Promise<Result<string | null, Error>>;
  rpop(key: string): Promise<Result<string | null, Error>>;
  lrange(key: string, start: number, stop: number): Promise<Result<string[], Error>>;
  llen(key: string): Promise<Result<number, Error>>;

  // Set operations
  sadd(key: string, members: string[]): Promise<Result<number, Error>>;
  srem(key: string, members: string[]): Promise<Result<number, Error>>;
  smembers(key: string): Promise<Result<string[], Error>>;
  sismember(key: string, member: string): Promise<Result<number, Error>>;

  // Sorted set operations
  zadd(key: string, members: Array<{ score: number; member: string }>): Promise<Result<number, Error>>;
  zrange(key: string, start: number, stop: number): Promise<Result<string[], Error>>;
  zrangebyscore(key: string, min: number, max: number): Promise<Result<string[], Error>>;
  zrem(key: string, members: string[]): Promise<Result<number, Error>>;
  zscore(key: string, member: string): Promise<Result<number | null, Error>>;

  // Advanced operations
  incr(key: string): Promise<Result<number, Error>>;
  decr(key: string): Promise<Result<number, Error>>;
  incrby(key: string, increment: number): Promise<Result<number, Error>>;
  decrby(key: string, decrement: number): Promise<Result<number, Error>>;

  // Pattern operations
  keys(pattern: string): Promise<Result<string[], Error>>;
  scan(cursor: number, pattern?: string, count?: number): Promise<Result<{ cursor: number; keys: string[] }, Error>>;

  // Utility
  ping(): Promise<Result<string, Error>>;
  flushdb(): Promise<Result<void, Error>>;
}

/**
 * Create an Upstash Redis adapter
 *
 * Uses Upstash REST API for edge-compatible Redis access
 *
 * @example
 * ```typescript
 * const cache = createUpstashRedisAdapter();
 * await cache.init({
 *   url: 'https://your-endpoint.upstash.io',
 *   token: 'your-token',
 * });
 * await cache.start();
 *
 * await cache.set('key', 'value', 3600);
 * const result = await cache.get('key');
 * ```
 */
export const createUpstashRedisAdapter = (): UpstashCacheAdapter => {
  let client: Redis | null = null;
  let initialized = false;

  return {
    init: async (config: UpstashRedisConfig): Promise<Result<void, Error>> => {
      try {
        const opts: { url: string; token: string; enableAutoPipelining?: boolean; enableTelemetry?: boolean } = {
          url: config.url,
          token: config.token,
        };

        if (config.enableAutoPipelining !== undefined) {
          opts.enableAutoPipelining = config.enableAutoPipelining;
        }
        if (config.enableTelemetry !== undefined) {
          opts.enableTelemetry = config.enableTelemetry;
        } else {
          opts.enableTelemetry = true;
        }

        client = new Redis(opts);

        initialized = true;
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!initialized || !client) {
        return err(new Error('Upstash Redis not initialized'));
      }
      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      client = null;
      initialized = false;
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!initialized || !client) {
        return ok({ status: 'unhealthy', error: new Error('Upstash Redis not initialized') });
      }

      try {
        await client.ping();
        return ok({ status: 'healthy' });
      } catch (error) {
        return ok({
          status: 'unhealthy',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },

    // Cache operations
    get: async (key: string): Promise<Result<string | null, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const value = await client.get<string>(key);
        return ok(value);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    set: async (key: string, value: string, ttlSeconds?: number): Promise<Result<void, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        if (ttlSeconds !== undefined) {
          await client.setex(key, ttlSeconds, value);
        } else {
          await client.set(key, value);
        }
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    del: async (key: string): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const count = await client.del(key);
        return ok(count);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    exists: async (key: string): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const count = await client.exists(key);
        return ok(count);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    expire: async (key: string, ttlSeconds: number): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const result = await client.expire(key, ttlSeconds);
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    ttl: async (key: string): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const ttl = await client.ttl(key);
        return ok(ttl);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    // Batch operations
    mget: async (keys: string[]): Promise<Result<Array<string | null>, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const values: Array<string | null> = [];
        for (const key of keys) {
          const val = await client.get<string>(key);
          values.push(val);
        }
        return ok(values);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    mset: async (entries: Record<string, string>): Promise<Result<void, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        await client.mset(entries);
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    mdel: async (keys: string[]): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const count = await client.del(...keys);
        return ok(count);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    // Hash operations
    hget: async (key: string, field: string): Promise<Result<string | null, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const value = await client.hget<string>(key, field);
        return ok(value);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    hset: async (key: string, field: string, value: string): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const result = await client.hset(key, { [field]: value });
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    hgetall: async (key: string): Promise<Result<Record<string, string>, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const hash = await client.hgetall<Record<string, string>>(key);
        return ok(hash || {});
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    hdel: async (key: string, fields: string[]): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const count = await client.hdel(key, ...fields);
        return ok(count);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    // List operations
    lpush: async (key: string, values: string[]): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const length = await client.lpush(key, ...values);
        return ok(length);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    rpush: async (key: string, values: string[]): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const length = await client.rpush(key, ...values);
        return ok(length);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    lpop: async (key: string): Promise<Result<string | null, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const value = await client.lpop<string>(key);
        return ok(value);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    rpop: async (key: string): Promise<Result<string | null, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const value = await client.rpop<string>(key);
        return ok(value);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    lrange: async (key: string, start: number, stop: number): Promise<Result<string[], Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const values = await client.lrange<string>(key, start, stop);
        return ok(values);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    llen: async (key: string): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const length = await client.llen(key);
        return ok(length);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    // Set operations
    sadd: async (key: string, members: string[]): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        let count = 0;
        for (const member of members) {
          const result = await client.sadd(key, member);
          count += result;
        }
        return ok(count);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    srem: async (key: string, members: string[]): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const count = await client.srem(key, ...members);
        return ok(count);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    smembers: async (key: string): Promise<Result<string[], Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const members = await client.smembers(key);
        return ok((Array.isArray(members) ? members : []) as string[]);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    sismember: async (key: string, member: string): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const result = await client.sismember(key, member);
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    // Sorted set operations
    zadd: async (key: string, members: Array<{ score: number; member: string }>): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        let count = 0;
        for (const m of members) {
          const result = await client.zadd(key, { score: m.score, member: m.member });
          count += result || 0;
        }
        return ok(count);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    zrange: async (key: string, start: number, stop: number): Promise<Result<string[], Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const values = await client.zrange(key, start, stop);
        return ok((Array.isArray(values) ? values : []) as string[]);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    zrangebyscore: async (key: string, min: number, max: number): Promise<Result<string[], Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const values = await client.zrange(key, min, max, { byScore: true });
        return ok((Array.isArray(values) ? values : []) as string[]);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    zrem: async (key: string, members: string[]): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const count = await client.zrem(key, ...members);
        return ok(count);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    zscore: async (key: string, member: string): Promise<Result<number | null, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const score = await client.zscore(key, member);
        return ok(score);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    // Advanced operations
    incr: async (key: string): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const value = await client.incr(key);
        return ok(value);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    decr: async (key: string): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const value = await client.decr(key);
        return ok(value);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    incrby: async (key: string, increment: number): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const value = await client.incrby(key, increment);
        return ok(value);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    decrby: async (key: string, decrement: number): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const value = await client.decrby(key, decrement);
        return ok(value);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    // Pattern operations
    keys: async (pattern: string): Promise<Result<string[], Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const keys = await client.keys(pattern);
        return ok(keys);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    scan: async (cursor: number, pattern?: string, count?: number): Promise<Result<{ cursor: number; keys: string[] }, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const opts: { match?: string; count?: number } = {};
        if (pattern !== undefined) opts.match = pattern;
        if (count !== undefined) opts.count = count;
        const result = await client.scan(cursor, opts);
        return ok({ cursor: Number(result[0]), keys: result[1] });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    // Utility
    ping: async (): Promise<Result<string, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        const result = await client.ping();
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    flushdb: async (): Promise<Result<void, Error>> => {
      if (!client) return err(new Error('Upstash Redis not initialized'));
      try {
        await client.flushdb();
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
