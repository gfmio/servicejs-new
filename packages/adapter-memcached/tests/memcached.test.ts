/**
 * Tests for Memcached Cache Adapter
 *
 * These tests use testcontainers to automatically start a Memcached instance.
 */

import { describe, test, expect, beforeAll, beforeEach, afterAll, afterEach } from 'bun:test';
import { isOk, isErr } from '@servicejs/result';
import { createMemcachedAdapter } from '../src/memcached.js';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';

describe('Memcached Adapter', () => {
  let container: StartedTestContainer;
  let connectionString: string;
  const adapter = createMemcachedAdapter();

  beforeAll(async () => {
    // Start Memcached container
    console.log('Starting Memcached container...');
    container = await new GenericContainer('memcached:1.6-alpine')
      .withExposedPorts(11211)
      .start();

    const host = container.getHost();
    const port = container.getMappedPort(11211);
    connectionString = `${host}:${port}`;
    console.log(`Memcached container started at ${connectionString}`);
  }, 60000); // 60 second timeout for container startup

  afterAll(async () => {
    // Stop container
    if (container) {
      console.log('Stopping Memcached container...');
      await container.stop();
    }
  }, 30000);

  beforeEach(async () => {
    await adapter.init({ servers: connectionString });
    await adapter.start();
    // Clear all keys before each test
    await adapter.flush();
  });

  afterEach(async () => {
    await adapter.stop();
    await adapter.destroy();
  });

  describe('Lifecycle', () => {
    test('should initialize with config', async () => {
      const adapter2 = createMemcachedAdapter();
      const result = await adapter2.init({ servers: connectionString });
      expect(isOk(result)).toBe(true);
      await adapter2.destroy();
    });

    test('should initialize with multiple servers', async () => {
      const adapter2 = createMemcachedAdapter();
      const result = await adapter2.init({ servers: [connectionString, 'localhost:11212'] });
      expect(isOk(result)).toBe(true);
      await adapter2.destroy();
    });

    test('should start successfully', async () => {
      const adapter2 = createMemcachedAdapter();
      await adapter2.init({ servers: connectionString });
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
      const adapter2 = createMemcachedAdapter();
      const result = await adapter2.start();
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('Client not initialized');
      }
    });
  });

  describe('Health Check', () => {
    test('should report healthy when connected', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }
    });

    test('should report unhealthy when not initialized', async () => {
      const adapter2 = createMemcachedAdapter();
      const result = await adapter2.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('unhealthy');
        expect(result.value.error?.message).toBe('Client not initialized');
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

    test('should flush all keys', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');

      const flushResult = await adapter.flush();
      expect(isOk(flushResult)).toBe(true);

      const get1 = await adapter.get('key1');
      const get2 = await adapter.get('key2');

      expect(isOk(get1)).toBe(true);
      expect(isOk(get2)).toBe(true);
      if (isOk(get1) && isOk(get2)) {
        expect(get1.value).toBeNull();
        expect(get2.value).toBeNull();
      }
    });
  });

  describe('TTL (Time To Live)', () => {
    test('should set value with TTL', async () => {
      const setResult = await adapter.set('ttl-key', 'ttl-value', 2);
      expect(isOk(setResult)).toBe(true);

      const getResult = await adapter.get('ttl-key');
      expect(isOk(getResult)).toBe(true);
      if (isOk(getResult)) {
        expect(getResult.value).toBe('ttl-value');
      }
    });

    test('should expire value after TTL', async () => {
      await adapter.set('expire-key', 'expire-value', 1);

      // Wait for expiration (1 second + buffer)
      await new Promise(resolve => setTimeout(resolve, 1500));

      const result = await adapter.get('expire-key');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle get without initialization', async () => {
      const adapter2 = createMemcachedAdapter();
      const result = await adapter2.get('key');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('Client not initialized');
      }
    });

    test('should handle set without initialization', async () => {
      const adapter2 = createMemcachedAdapter();
      const result = await adapter2.set('key', 'value');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('Client not initialized');
      }
    });

    test('should handle delete without initialization', async () => {
      const adapter2 = createMemcachedAdapter();
      const result = await adapter2.delete('key');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('Client not initialized');
      }
    });

    test('should handle exists without initialization', async () => {
      const adapter2 = createMemcachedAdapter();
      const result = await adapter2.exists('key');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('Client not initialized');
      }
    });

    test('should handle flush without initialization', async () => {
      const adapter2 = createMemcachedAdapter();
      const result = await adapter2.flush();
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('Client not initialized');
      }
    });
  });

  describe('Configuration', () => {
    test('should accept authentication config', async () => {
      const adapter2 = createMemcachedAdapter();
      const result = await adapter2.init({
        servers: connectionString,
        username: 'user',
        password: 'pass'
      });
      expect(isOk(result)).toBe(true);
      await adapter2.destroy();
    });

    test('should accept timeout config', async () => {
      const adapter2 = createMemcachedAdapter();
      const result = await adapter2.init({
        servers: connectionString,
        timeout: 5000
      });
      expect(isOk(result)).toBe(true);
      await adapter2.destroy();
    });

    test('should accept retry config', async () => {
      const adapter2 = createMemcachedAdapter();
      const result = await adapter2.init({
        servers: connectionString,
        retries: 3,
        retryDelay: 1000
      });
      expect(isOk(result)).toBe(true);
      await adapter2.destroy();
    });
  });
});
