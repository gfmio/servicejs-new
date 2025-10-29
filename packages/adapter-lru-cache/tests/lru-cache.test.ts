import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createLRUCacheAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

describe('LRU Cache Adapter', () => {
  let adapter: ReturnType<typeof createLRUCacheAdapter>;

  beforeEach(() => {
    adapter = createLRUCacheAdapter();
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.destroy();
    }
  });

  describe('Lifecycle', () => {
    test('init with valid config', async () => {
      const result = await adapter.init({ maxSize: 100 });
      expect(isOk(result)).toBe(true);
    });

    test('init fails with invalid maxSize', async () => {
      const result = await adapter.init({ maxSize: 0 });
      expect(isOk(result)).toBe(false);
    });

    test('start succeeds after init', async () => {
      await adapter.init({ maxSize: 100 });
      const result = await adapter.start();
      expect(isOk(result)).toBe(true);
    });

    test('health returns healthy after init', async () => {
      await adapter.init({ maxSize: 100 });
      await adapter.start();

      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }
    });
  });

  describe('Basic Operations', () => {
    beforeEach(async () => {
      await adapter.init({ maxSize: 10 });
      await adapter.start();
    });

    test('set and get value', async () => {
      await adapter.set('key1', 'value1');

      const result = await adapter.get('key1');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe('value1');
      }
    });

    test('get returns null for non-existent key', async () => {
      const result = await adapter.get('non-existent');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(null);
      }
    });

    test('del removes key', async () => {
      await adapter.set('key', 'value');

      const delResult = await adapter.del('key');
      expect(isOk(delResult)).toBe(true);
      if (isOk(delResult)) {
        expect(delResult.value).toBe(true);
      }

      const getResult = await adapter.get('key');
      if (isOk(getResult)) {
        expect(getResult.value).toBe(null);
      }
    });

    test('has returns true for existing key', async () => {
      await adapter.set('key', 'value');

      const result = await adapter.has('key');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(true);
      }
    });

    test('has returns false for non-existent key', async () => {
      const result = await adapter.has('non-existent');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(false);
      }
    });

    test('clear removes all entries', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');

      await adapter.clear();

      const sizeResult = await adapter.size();
      if (isOk(sizeResult)) {
        expect(sizeResult.value).toBe(0);
      }
    });
  });

  describe('LRU Eviction', () => {
    beforeEach(async () => {
      await adapter.init({ maxSize: 3 });
      await adapter.start();
    });

    test('evicts least recently used item when full', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');
      await adapter.set('key3', 'value3');

      // key1 is now least recently used
      // Adding key4 should evict key1
      await adapter.set('key4', 'value4');

      const result1 = await adapter.get('key1');
      if (isOk(result1)) {
        expect(result1.value).toBe(null);
      }

      const result4 = await adapter.get('key4');
      if (isOk(result4)) {
        expect(result4.value).toBe('value4');
      }
    });

    test('get updates LRU order', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');
      await adapter.set('key3', 'value3');

      // Access key1 to make it recently used
      await adapter.get('key1');

      // Add key4, should evict key2 (not key1)
      await adapter.set('key4', 'value4');

      const result1 = await adapter.get('key1');
      if (isOk(result1)) {
        expect(result1.value).toBe('value1');
      }

      const result2 = await adapter.get('key2');
      if (isOk(result2)) {
        expect(result2.value).toBe(null);
      }
    });
  });

  describe('TTL Support', () => {
    beforeEach(async () => {
      await adapter.init({ maxSize: 10 });
      await adapter.start();
    });

    test('item expires after TTL', async () => {
      await adapter.set('key', 'value', 100); // 100ms TTL

      const result1 = await adapter.get('key');
      if (isOk(result1)) {
        expect(result1.value).toBe('value');
      }

      await new Promise((resolve) => setTimeout(resolve, 150));

      const result2 = await adapter.get('key');
      if (isOk(result2)) {
        expect(result2.value).toBe(null);
      }
    });

    test('default TTL applies when specified', async () => {
      await adapter.destroy();
      adapter = createLRUCacheAdapter();
      await adapter.init({ maxSize: 10, ttl: 100 });
      await adapter.start();

      await adapter.set('key', 'value'); // Uses default TTL

      await new Promise((resolve) => setTimeout(resolve, 150));

      const result = await adapter.get('key');
      if (isOk(result)) {
        expect(result.value).toBe(null);
      }
    });

    test('item-specific TTL overrides default', async () => {
      await adapter.destroy();
      adapter = createLRUCacheAdapter();
      await adapter.init({ maxSize: 10, ttl: 50 });
      await adapter.start();

      await adapter.set('key', 'value', 200); // Override with longer TTL

      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await adapter.get('key');
      if (isOk(result)) {
        expect(result.value).toBe('value'); // Still alive
      }
    });
  });

  describe('Eviction Callback', () => {
    test('calls onEvict when item is evicted', async () => {
      const evicted: Array<{ key: string; value: string }> = [];

      await adapter.init({
        maxSize: 2,
        onEvict: (key, value) => {
          evicted.push({ key, value });
        },
      });
      await adapter.start();

      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');
      await adapter.set('key3', 'value3'); // Should evict key1

      expect(evicted.length).toBe(1);
      expect(evicted[0]).toEqual({ key: 'key1', value: 'value1' });
    });

    test('calls onEvict for all items on clear', async () => {
      const evicted: Array<{ key: string; value: string }> = [];

      await adapter.init({
        maxSize: 10,
        onEvict: (key, value) => {
          evicted.push({ key, value });
        },
      });
      await adapter.start();

      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');

      await adapter.clear();

      expect(evicted.length).toBe(2);
    });
  });

  describe('Introspection', () => {
    beforeEach(async () => {
      await adapter.init({ maxSize: 10 });
      await adapter.start();
    });

    test('size returns number of items', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');

      const result = await adapter.size();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(2);
      }
    });

    test('keys returns all keys', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');

      const result = await adapter.keys();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.sort()).toEqual(['key1', 'key2']);
      }
    });

    test('values returns all values', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');

      const result = await adapter.values();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.sort()).toEqual(['value1', 'value2']);
      }
    });

    test('entries returns all key-value pairs', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');

      const result = await adapter.entries();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.sort()).toEqual([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ]);
      }
    });

    test('expired entries are excluded from introspection', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2', 50);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const keysResult = await adapter.keys();
      if (isOk(keysResult)) {
        expect(keysResult.value).toEqual(['key1']);
      }

      const sizeResult = await adapter.size();
      if (isOk(sizeResult)) {
        expect(sizeResult.value).toBe(1);
      }
    });
  });

  describe('Automatic Cleanup', () => {
    test('expired entries are cleaned up periodically', async () => {
      await adapter.init({ maxSize: 10 });
      await adapter.start();

      await adapter.set('key1', 'value1', 50);
      await adapter.set('key2', 'value2', 50);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Trigger cleanup by waiting for the cleanup interval
      await new Promise((resolve) => setTimeout(resolve, 10100));

      const sizeResult = await adapter.size();
      if (isOk(sizeResult)) {
        expect(sizeResult.value).toBe(0);
      }
    });
  });
});
