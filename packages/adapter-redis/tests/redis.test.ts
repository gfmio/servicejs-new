import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { createRedisAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('Redis Adapter', () => {
  let container: StartedTestContainer;
  let adapter: ReturnType<typeof createRedisAdapter>;

  beforeEach(async () => {
    // Start Redis container
    container = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .withStartupTimeout(120000)
      .start();

    adapter = createRedisAdapter();
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.destroy();
    }
    if (container) {
      await container.stop();
    }
  });

  describe('Lifecycle', () => {
    test('init and start with standalone mode', async () => {
      const initResult = await adapter.init({
        mode: 'standalone',
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });

      expect(isOk(initResult)).toBe(true);

      const startResult = await adapter.start();
      expect(isOk(startResult)).toBe(true);
    });

    test('health returns healthy after init', async () => {
      await adapter.init({
        mode: 'standalone',
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });
      await adapter.start();

      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }
    });

    test('health returns unhealthy before init', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('unhealthy');
      }
    });
  });

  describe('Basic Cache Operations', () => {
    beforeEach(async () => {
      await adapter.init({
        mode: 'standalone',
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });
      await adapter.start();
    });

    test('set and get string value', async () => {
      const setResult = await adapter.set('test-key', 'test-value');
      expect(isOk(setResult)).toBe(true);

      const getResult = await adapter.get('test-key');
      expect(isOk(getResult)).toBe(true);
      if (isOk(getResult)) {
        expect(getResult.value).toBe('test-value');
      }
    });

    test('set with TTL expires correctly', async () => {
      await adapter.set('expiring-key', 'value', 1);

      const getResult1 = await adapter.get('expiring-key');
      expect(isOk(getResult1)).toBe(true);
      if (isOk(getResult1)) {
        expect(getResult1.value).toBe('value');
      }

      await new Promise((resolve) => setTimeout(resolve, 1100));

      const getResult2 = await adapter.get('expiring-key');
      expect(isOk(getResult2)).toBe(true);
      if (isOk(getResult2)) {
        expect(getResult2.value).toBe(null);
      }
    });

    test('del removes key', async () => {
      await adapter.set('to-delete', 'value');

      const delResult = await adapter.del('to-delete');
      expect(isOk(delResult)).toBe(true);
      if (isOk(delResult)) {
        expect(delResult.value).toBe(1);
      }

      const getResult = await adapter.get('to-delete');
      if (isOk(getResult)) {
        expect(getResult.value).toBe(null);
      }
    });

    test('exists checks key existence', async () => {
      await adapter.set('existing-key', 'value');

      const existsResult = await adapter.exists('existing-key');
      expect(isOk(existsResult)).toBe(true);
      if (isOk(existsResult)) {
        expect(existsResult.value).toBe(1);
      }

      const notExistsResult = await adapter.exists('non-existing-key');
      if (isOk(notExistsResult)) {
        expect(notExistsResult.value).toBe(0);
      }
    });
  });

  describe('Batch Operations', () => {
    beforeEach(async () => {
      await adapter.init({
        mode: 'standalone',
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });
      await adapter.start();
    });

    test('mset and mget multiple keys', async () => {
      const msetResult = await adapter.mset({
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      });
      expect(isOk(msetResult)).toBe(true);

      const mgetResult = await adapter.mget(['key1', 'key2', 'key3']);
      expect(isOk(mgetResult)).toBe(true);
      if (isOk(mgetResult)) {
        expect(mgetResult.value).toEqual(['value1', 'value2', 'value3']);
      }
    });

    test('mdel removes multiple keys', async () => {
      await adapter.mset({ key1: 'v1', key2: 'v2', key3: 'v3' });

      const mdelResult = await adapter.mdel(['key1', 'key2']);
      expect(isOk(mdelResult)).toBe(true);
      if (isOk(mdelResult)) {
        expect(mdelResult.value).toBe(2);
      }

      const mgetResult = await adapter.mget(['key1', 'key2', 'key3']);
      if (isOk(mgetResult)) {
        expect(mgetResult.value).toEqual([null, null, 'v3']);
      }
    });
  });

  describe('Hash Operations', () => {
    beforeEach(async () => {
      await adapter.init({
        mode: 'standalone',
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });
      await adapter.start();
    });

    test('hset and hget', async () => {
      await adapter.hset('user:1', 'name', 'Alice');

      const result = await adapter.hget('user:1', 'name');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe('Alice');
      }
    });

    test('hgetall returns all fields', async () => {
      await adapter.hset('user:2', 'name', 'Bob');
      await adapter.hset('user:2', 'age', '30');

      const result = await adapter.hgetall('user:2');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual({ name: 'Bob', age: '30' });
      }
    });

    test('hdel removes fields', async () => {
      await adapter.hset('user:3', 'name', 'Charlie');
      await adapter.hset('user:3', 'age', '25');

      const delResult = await adapter.hdel('user:3', ['age']);
      expect(isOk(delResult)).toBe(true);

      const result = await adapter.hgetall('user:3');
      if (isOk(result)) {
        expect(result.value).toEqual({ name: 'Charlie' });
      }
    });
  });

  describe('List Operations', () => {
    beforeEach(async () => {
      await adapter.init({
        mode: 'standalone',
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });
      await adapter.start();
    });

    test('lpush and lpop', async () => {
      await adapter.lpush('queue', ['item1', 'item2']);

      const popResult = await adapter.lpop('queue');
      expect(isOk(popResult)).toBe(true);
      if (isOk(popResult)) {
        expect(popResult.value).toBe('item2');
      }
    });

    test('rpush and lrange', async () => {
      await adapter.rpush('list', ['a', 'b', 'c']);

      const rangeResult = await adapter.lrange('list', 0, -1);
      expect(isOk(rangeResult)).toBe(true);
      if (isOk(rangeResult)) {
        expect(rangeResult.value).toEqual(['a', 'b', 'c']);
      }
    });

    test('llen returns list length', async () => {
      await adapter.rpush('mylist', ['1', '2', '3']);

      const lenResult = await adapter.llen('mylist');
      expect(isOk(lenResult)).toBe(true);
      if (isOk(lenResult)) {
        expect(lenResult.value).toBe(3);
      }
    });
  });

  describe('Set Operations', () => {
    beforeEach(async () => {
      await adapter.init({
        mode: 'standalone',
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });
      await adapter.start();
    });

    test('sadd and smembers', async () => {
      await adapter.sadd('tags', ['redis', 'cache', 'nosql']);

      const membersResult = await adapter.smembers('tags');
      expect(isOk(membersResult)).toBe(true);
      if (isOk(membersResult)) {
        expect(membersResult.value.sort()).toEqual(['cache', 'nosql', 'redis']);
      }
    });

    test('sismember checks membership', async () => {
      await adapter.sadd('set', ['a', 'b', 'c']);

      const isMemberResult = await adapter.sismember('set', 'b');
      expect(isOk(isMemberResult)).toBe(true);
      if (isOk(isMemberResult)) {
        expect(isMemberResult.value).toBe(1);
      }

      const notMemberResult = await adapter.sismember('set', 'z');
      if (isOk(notMemberResult)) {
        expect(notMemberResult.value).toBe(0);
      }
    });
  });

  describe('Sorted Set Operations', () => {
    beforeEach(async () => {
      await adapter.init({
        mode: 'standalone',
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });
      await adapter.start();
    });

    test('zadd and zrange', async () => {
      await adapter.zadd('leaderboard', [
        { score: 100, value: 'player1' },
        { score: 200, value: 'player2' },
        { score: 150, value: 'player3' },
      ]);

      const rangeResult = await adapter.zrange('leaderboard', 0, -1);
      expect(isOk(rangeResult)).toBe(true);
      if (isOk(rangeResult)) {
        expect(rangeResult.value).toEqual(['player1', 'player3', 'player2']);
      }
    });

    test('zrangebyscore filters by score', async () => {
      await adapter.zadd('scores', [
        { score: 10, value: 'a' },
        { score: 20, value: 'b' },
        { score: 30, value: 'c' },
      ]);

      const result = await adapter.zrangebyscore('scores', 15, 25);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual(['b']);
      }
    });

    test('zscore returns member score', async () => {
      await adapter.zadd('myzset', [{ score: 42, value: 'member' }]);

      const scoreResult = await adapter.zscore('myzset', 'member');
      expect(isOk(scoreResult)).toBe(true);
      if (isOk(scoreResult)) {
        expect(scoreResult.value).toBe('42');
      }
    });
  });

  describe('Counter Operations', () => {
    beforeEach(async () => {
      await adapter.init({
        mode: 'standalone',
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });
      await adapter.start();
    });

    test('incr increments value', async () => {
      const incr1 = await adapter.incr('counter');
      expect(isOk(incr1)).toBe(true);
      if (isOk(incr1)) {
        expect(incr1.value).toBe(1);
      }

      const incr2 = await adapter.incr('counter');
      if (isOk(incr2)) {
        expect(incr2.value).toBe(2);
      }
    });

    test('incrby increments by amount', async () => {
      const result = await adapter.incrby('score', 10);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(10);
      }

      const result2 = await adapter.incrby('score', 5);
      if (isOk(result2)) {
        expect(result2.value).toBe(15);
      }
    });
  });

  describe('Pattern Operations', () => {
    beforeEach(async () => {
      await adapter.init({
        mode: 'standalone',
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });
      await adapter.start();
    });

    test('keys finds matching keys', async () => {
      await adapter.set('user:1', 'a');
      await adapter.set('user:2', 'b');
      await adapter.set('post:1', 'c');

      const keysResult = await adapter.keys('user:*');
      expect(isOk(keysResult)).toBe(true);
      if (isOk(keysResult)) {
        expect(keysResult.value.sort()).toEqual(['user:1', 'user:2']);
      }
    });

    test('scan iterates through keys', async () => {
      await adapter.set('key1', 'v1');
      await adapter.set('key2', 'v2');

      const scanResult = await adapter.scan('0');
      expect(isOk(scanResult)).toBe(true);
      if (isOk(scanResult)) {
        expect(scanResult.value.keys.length).toBeGreaterThan(0);
      }
    });
  });
});
