/**
 * Tests for Cloudflare KV Cache Adapter
 *
 * These tests run in a real Cloudflare Workers environment using Miniflare.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { isOk, isErr } from '@servicejs/result';
import { createCloudflareKVAdapter } from '../src/kv.js';

describe('Cloudflare KV Adapter', () => {
  const adapter = createCloudflareKVAdapter();

  beforeEach(async () => {
    await adapter.init({ namespace: env.CACHE });
    await adapter.start();
    // Clear all keys before each test
    await adapter.flush();
  });

  describe('Lifecycle', () => {
    test('should initialize with KV namespace', async () => {
      const adapter2 = createCloudflareKVAdapter();
      const result = await adapter2.init({ namespace: env.CACHE });
      expect(isOk(result)).toBe(true);
      await adapter2.destroy();
    });

    test('should initialize with default TTL', async () => {
      const adapter2 = createCloudflareKVAdapter();
      const result = await adapter2.init({ namespace: env.CACHE, defaultTTL: 3600 });
      expect(isOk(result)).toBe(true);
      await adapter2.destroy();
    });

    test('should start successfully', async () => {
      const adapter2 = createCloudflareKVAdapter();
      await adapter2.init({ namespace: env.CACHE });
      const result = await adapter2.start();
      expect(isOk(result)).toBe(true);
      await adapter2.destroy();
    });

    test('should stop successfully', async () => {
      const result = await adapter.stop();
      expect(isOk(result)).toBe(true);
    });

    test('should destroy successfully', async () => {
      const result = await adapter.destroy();
      expect(isOk(result)).toBe(true);
    });

    test('should fail to start if not initialized', async () => {
      const adapter2 = createCloudflareKVAdapter();
      const result = await adapter2.start();
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('KV namespace not initialized');
      }
    });
  });

  describe('Health Check', () => {
    test('should report healthy when initialized', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }
    });

    test('should report unhealthy when not initialized', async () => {
      const adapter2 = createCloudflareKVAdapter();
      const result = await adapter2.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('unhealthy');
        expect(result.value.error?.message).toBe('KV namespace not initialized');
      }
    });
  });

  describe('Basic Operations', () => {
    test('should set and get a string value', async () => {
      const setResult = await adapter.set('test-key', 'test-value');
      expect(isOk(setResult)).toBe(true);

      const getResult = await adapter.get<string>('test-key');
      expect(isOk(getResult)).toBe(true);
      if (isOk(getResult)) {
        expect(getResult.value).toBe('test-value');
      }
    });

    test('should set and get an object value', async () => {
      const obj = { name: 'Alice', age: 30 };
      const setResult = await adapter.set('user:1', obj);
      expect(isOk(setResult)).toBe(true);

      const getResult = await adapter.get<typeof obj>('user:1');
      expect(isOk(getResult)).toBe(true);
      if (isOk(getResult)) {
        expect(getResult.value).toEqual(obj);
      }
    });

    test('should return null for non-existent key', async () => {
      const result = await adapter.get('non-existent');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeNull();
      }
    });

    test('should delete a key', async () => {
      await adapter.set('delete-me', 'value');

      const deleteResult = await adapter.delete('delete-me');
      expect(isOk(deleteResult)).toBe(true);
      if (isOk(deleteResult)) {
        expect(deleteResult.value).toBe(true);
      }

      const getResult = await adapter.get('delete-me');
      expect(isOk(getResult)).toBe(true);
      if (isOk(getResult)) {
        expect(getResult.value).toBeNull();
      }
    });

    test('should return false when deleting non-existent key', async () => {
      const result = await adapter.delete('non-existent');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(false);
      }
    });

    test('should check if key exists', async () => {
      await adapter.set('exists-key', 'value');

      const existsResult = await adapter.exists('exists-key');
      expect(isOk(existsResult)).toBe(true);
      if (isOk(existsResult)) {
        expect(existsResult.value).toBe(true);
      }

      const notExistsResult = await adapter.exists('not-exists');
      expect(isOk(notExistsResult)).toBe(true);
      if (isOk(notExistsResult)) {
        expect(notExistsResult.value).toBe(false);
      }
    });
  });

  describe('List Operations', () => {
    test('should list all keys', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');
      await adapter.set('key3', 'value3');

      const result = await adapter.list();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toHaveLength(3);
        expect(result.value).toContain('key1');
        expect(result.value).toContain('key2');
        expect(result.value).toContain('key3');
      }
    });

    test('should list keys with prefix', async () => {
      await adapter.set('user:1', 'alice');
      await adapter.set('user:2', 'bob');
      await adapter.set('post:1', 'hello');

      const result = await adapter.list('user:');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toHaveLength(2);
        expect(result.value).toContain('user:1');
        expect(result.value).toContain('user:2');
        expect(result.value).not.toContain('post:1');
      }
    });

    test('should list keys with limit', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');
      await adapter.set('key3', 'value3');

      const result = await adapter.list(undefined, 2);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toHaveLength(2);
      }
    });
  });

  describe('Flush Operations', () => {
    test('should flush all keys', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');

      const flushResult = await adapter.flush();
      expect(isOk(flushResult)).toBe(true);

      const listResult = await adapter.list();
      expect(isOk(listResult)).toBe(true);
      if (isOk(listResult)) {
        expect(listResult.value).toHaveLength(0);
      }
    });

    test('should flush keys with prefix', async () => {
      await adapter.set('user:1', 'alice');
      await adapter.set('user:2', 'bob');
      await adapter.set('post:1', 'hello');

      const flushResult = await adapter.flush('user:');
      expect(isOk(flushResult)).toBe(true);

      const allKeys = await adapter.list();
      expect(isOk(allKeys)).toBe(true);
      if (isOk(allKeys)) {
        expect(allKeys.value).toHaveLength(1);
        expect(allKeys.value).toContain('post:1');
        expect(allKeys.value).not.toContain('user:1');
        expect(allKeys.value).not.toContain('user:2');
      }
    });
  });

  describe('TTL (Time To Live)', () => {
    test('should set value with TTL', async () => {
      const setResult = await adapter.set('ttl-key', 'ttl-value', 3600);
      expect(isOk(setResult)).toBe(true);

      const getResult = await adapter.get('ttl-key');
      expect(isOk(getResult)).toBe(true);
      if (isOk(getResult)) {
        expect(getResult.value).toBe('ttl-value');
      }
    });

    test('should use default TTL when set', async () => {
      const adapter2 = createCloudflareKVAdapter();
      await adapter2.init({ namespace: env.CACHE, defaultTTL: 3600 });
      await adapter2.start();

      const setResult = await adapter2.set('default-ttl-key', 'value');
      expect(isOk(setResult)).toBe(true);

      const getResult = await adapter2.get('default-ttl-key');
      expect(isOk(getResult)).toBe(true);
      if (isOk(getResult)) {
        expect(getResult.value).toBe('value');
      }

      await adapter2.destroy();
    });
  });

  describe('Error Handling', () => {
    test('should handle get without initialization', async () => {
      const adapter2 = createCloudflareKVAdapter();
      const result = await adapter2.get('key');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('KV namespace not initialized');
      }
    });

    test('should handle set without initialization', async () => {
      const adapter2 = createCloudflareKVAdapter();
      const result = await adapter2.set('key', 'value');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('KV namespace not initialized');
      }
    });

    test('should handle delete without initialization', async () => {
      const adapter2 = createCloudflareKVAdapter();
      const result = await adapter2.delete('key');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('KV namespace not initialized');
      }
    });

    test('should handle exists without initialization', async () => {
      const adapter2 = createCloudflareKVAdapter();
      const result = await adapter2.exists('key');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('KV namespace not initialized');
      }
    });

    test('should handle list without initialization', async () => {
      const adapter2 = createCloudflareKVAdapter();
      const result = await adapter2.list();
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('KV namespace not initialized');
      }
    });

    test('should handle flush without initialization', async () => {
      const adapter2 = createCloudflareKVAdapter();
      const result = await adapter2.flush();
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('KV namespace not initialized');
      }
    });
  });
});
