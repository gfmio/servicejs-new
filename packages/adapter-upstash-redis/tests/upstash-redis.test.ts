import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createUpstashRedisAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('Upstash Redis Adapter', () => {
  let adapter: ReturnType<typeof createUpstashRedisAdapter>;

  beforeEach(() => {
    adapter = createUpstashRedisAdapter();
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.destroy();
    }
  });

  describe('Lifecycle', () => {
    test('init with valid config', async () => {
      const result = await adapter.init({
        url: 'https://example.upstash.io',
        token: 'test-token',
      });

      expect(isOk(result)).toBe(true);
    });

    test('start succeeds after init', async () => {
      await adapter.init({
        url: 'https://example.upstash.io',
        token: 'test-token',
      });

      const result = await adapter.start();
      expect(isOk(result)).toBe(true);
    });

    test('start fails before init', async () => {
      const result = await adapter.start();
      expect(isErr(result)).toBe(true);
    });

    test('health returns unhealthy before init', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('unhealthy');
      }
    });
  });

  describe('Operations (without actual Upstash)', () => {
    beforeEach(async () => {
      await adapter.init({
        url: 'https://example.upstash.io',
        token: 'test-token',
      });
      await adapter.start();
    });

    test('operations return errors without valid credentials', async () => {
      // These will fail because we don't have valid Upstash credentials
      // but we can verify the adapter structure is correct
      const setResult = await adapter.set('test-key', 'test-value');
      expect(isErr(setResult)).toBe(true);

      const getResult = await adapter.get('test-key');
      expect(isErr(getResult)).toBe(true);
    });
  });
});

/*
 * Integration tests with actual Upstash instance
 *
 * To run these tests, set the following environment variables:
 * - UPSTASH_REDIS_URL=https://your-instance.upstash.io
 * - UPSTASH_REDIS_TOKEN=your-token
 *
 * Then uncomment this section:

describe.skipIf(!process.env.UPSTASH_REDIS_URL)('Upstash Redis Integration Tests', () => {
  let adapter: ReturnType<typeof createUpstashRedisAdapter>;

  beforeEach(async () => {
    adapter = createUpstashRedisAdapter();
    await adapter.init({
      url: process.env.UPSTASH_REDIS_URL!,
      token: process.env.UPSTASH_REDIS_TOKEN!,
    });
    await adapter.start();
  });

  afterEach(async () => {
    await adapter.flushdb();
    await adapter.destroy();
  });

  test('set and get', async () => {
    const setResult = await adapter.set('test-key', 'test-value');
    expect(isOk(setResult)).toBe(true);

    const getResult = await adapter.get('test-key');
    expect(isOk(getResult)).toBe(true);
    if (isOk(getResult)) {
      expect(getResult.value).toBe('test-value');
    }
  });

  test('set with TTL', async () => {
    await adapter.set('expiring-key', 'value', 1);

    const result1 = await adapter.get('expiring-key');
    if (isOk(result1)) {
      expect(result1.value).toBe('value');
    }

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const result2 = await adapter.get('expiring-key');
    if (isOk(result2)) {
      expect(result2.value).toBe(null);
    }
  });

  test('del removes key', async () => {
    await adapter.set('to-delete', 'value');

    const delResult = await adapter.del('to-delete');
    expect(isOk(delResult)).toBe(true);

    const getResult = await adapter.get('to-delete');
    if (isOk(getResult)) {
      expect(getResult.value).toBe(null);
    }
  });

  test('mset and mget', async () => {
    await adapter.mset({
      key1: 'value1',
      key2: 'value2',
    });

    const result = await adapter.mget(['key1', 'key2']);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual(['value1', 'value2']);
    }
  });

  test('hash operations', async () => {
    await adapter.hset('user:1', 'name', 'Alice');
    await adapter.hset('user:1', 'email', 'alice@example.com');

    const userResult = await adapter.hgetall('user:1');
    expect(isOk(userResult)).toBe(true);
    if (isOk(userResult)) {
      expect(userResult.value).toEqual({
        name: 'Alice',
        email: 'alice@example.com',
      });
    }
  });

  test('list operations', async () => {
    await adapter.rpush('mylist', ['a', 'b', 'c']);

    const rangeResult = await adapter.lrange('mylist', 0, -1);
    expect(isOk(rangeResult)).toBe(true);
    if (isOk(rangeResult)) {
      expect(rangeResult.value).toEqual(['a', 'b', 'c']);
    }

    const popResult = await adapter.lpop('mylist');
    if (isOk(popResult)) {
      expect(popResult.value).toBe('a');
    }
  });

  test('set operations', async () => {
    await adapter.sadd('myset', ['a', 'b', 'c']);

    const membersResult = await adapter.smembers('myset');
    expect(isOk(membersResult)).toBe(true);
    if (isOk(membersResult)) {
      expect(membersResult.value.sort()).toEqual(['a', 'b', 'c']);
    }

    const isMemberResult = await adapter.sismember('myset', 'b');
    if (isOk(isMemberResult)) {
      expect(isMemberResult.value).toBe(1);
    }
  });

  test('sorted set operations', async () => {
    await adapter.zadd('leaderboard', [
      { score: 100, member: 'player1' },
      { score: 200, member: 'player2' },
    ]);

    const rangeResult = await adapter.zrange('leaderboard', 0, -1);
    expect(isOk(rangeResult)).toBe(true);
    if (isOk(rangeResult)) {
      expect(rangeResult.value).toEqual(['player1', 'player2']);
    }
  });

  test('counter operations', async () => {
    const incr1 = await adapter.incr('counter');
    if (isOk(incr1)) {
      expect(incr1.value).toBe(1);
    }

    const incr2 = await adapter.incrby('counter', 10);
    if (isOk(incr2)) {
      expect(incr2.value).toBe(11);
    }
  });

  test('health check', async () => {
    const result = await adapter.health();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.status).toBe('healthy');
    }
  });
});
*/
