/**
 * PlanetScale Adapter Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createPlanetScaleAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('PlanetScale Adapter', () => {
  let adapter: ReturnType<typeof createPlanetScaleAdapter>;

  beforeEach(() => {
    adapter = createPlanetScaleAdapter();
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.stop();
      await adapter.destroy();
    }
  });

  describe('Lifecycle', () => {
    test('init with valid config', async () => {
      const result = await adapter.init({
        host: 'test.psdb.cloud',
        username: 'test-user',
        password: 'test-pass',
      });

      expect(isOk(result)).toBe(true);
    });

    test('init with custom fetch', async () => {
      const result = await adapter.init({
        host: 'test.psdb.cloud',
        username: 'test-user',
        password: 'test-pass',
        fetch: globalThis.fetch,
      });

      expect(isOk(result)).toBe(true);
    });

    test('start after init', async () => {
      await adapter.init({
        host: 'test.psdb.cloud',
        username: 'test-user',
        password: 'test-pass',
      });

      const result = await adapter.start();
      expect(isOk(result)).toBe(true);
    });

    test('start without init fails', async () => {
      const result = await adapter.start();
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('not initialized');
      }
    });

    test('stop', async () => {
      await adapter.init({
        host: 'test.psdb.cloud',
        username: 'test-user',
        password: 'test-pass',
      });

      const result = await adapter.stop();
      expect(isOk(result)).toBe(true);
    });

    test('destroy', async () => {
      await adapter.init({
        host: 'test.psdb.cloud',
        username: 'test-user',
        password: 'test-pass',
      });

      const result = await adapter.destroy();
      expect(isOk(result)).toBe(true);

      // Verify state is cleared
      const connResult = adapter.getConnection();
      expect(isErr(connResult)).toBe(true);
    });

    test('health check when not initialized', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('unhealthy');
        expect(result.value.error).toBeDefined();
      }
    });

    test('health check when initialized', async () => {
      await adapter.init({
        host: 'test.psdb.cloud',
        username: 'test-user',
        password: 'test-pass',
      });

      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
    });
  });

  describe('Connection Access', () => {
    test('getConnection after init returns connection', async () => {
      await adapter.init({
        host: 'test.psdb.cloud',
        username: 'test-user',
        password: 'test-pass',
      });

      const result = adapter.getConnection();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeDefined();
      }
    });

    test('getConnection before init fails', () => {
      const result = adapter.getConnection();
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('not initialized');
      }
    });
  });

  describe('Query Execution', () => {
    beforeEach(async () => {
      await adapter.init({
        host: 'test.psdb.cloud',
        username: 'test-user',
        password: 'test-pass',
      });
      await adapter.start();
    });

    test('execute without connection fails', async () => {
      const uninitializedAdapter = createPlanetScaleAdapter();
      const result = await uninitializedAdapter.execute('SELECT 1');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('not initialized');
      }
    });

    test.skip('execute with SQL string', async () => {
      // Skipped: requires real PlanetScale connection
      const result = await adapter.execute('SELECT 1');
      expect(result).toBeDefined();
    });

    test.skip('execute with parameterized query', async () => {
      // Skipped: requires real PlanetScale connection
      const result = await adapter.execute('SELECT ? as value', [42]);
      expect(result).toBeDefined();
    });

    test.skip('execute handles errors', async () => {
      // Skipped: requires real PlanetScale connection
      const result = await adapter.execute('INVALID SQL');
      expect(result).toBeDefined();
    });
  });

  describe('Transactions', () => {
    beforeEach(async () => {
      await adapter.init({
        host: 'test.psdb.cloud',
        username: 'test-user',
        password: 'test-pass',
      });
      await adapter.start();
    });

    test('transaction without connection fails', async () => {
      const uninitializedAdapter = createPlanetScaleAdapter();
      const result = await uninitializedAdapter.transaction(async (tx) => {
        return 'test';
      });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('not initialized');
      }
    });

    test.skip('transaction callback receives wrapped tx', async () => {
      // Skipped: requires real PlanetScale connection
      let txReceived = false;

      await adapter.transaction(async (tx) => {
        expect(tx).toBeDefined();
        expect(tx.execute).toBeDefined();
        expect(typeof tx.execute).toBe('function');
        txReceived = true;
        return 'test';
      });

      expect(txReceived).toBe(true);
    });

    test.skip('transaction callback can return value', async () => {
      // Skipped: requires real PlanetScale connection
      const result = await adapter.transaction(async (tx) => {
        return { success: true, value: 42 };
      });

      expect(result).toBeDefined();
    });

    test.skip('transaction handles callback errors', async () => {
      // Skipped: requires real PlanetScale connection
      const result = await adapter.transaction(async (tx) => {
        throw new Error('Transaction error');
      });

      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    test('multiple init calls', async () => {
      const result1 = await adapter.init({
        host: 'test1.psdb.cloud',
        username: 'test-user',
        password: 'test-pass',
      });

      const result2 = await adapter.init({
        host: 'test2.psdb.cloud',
        username: 'test-user',
        password: 'test-pass',
      });

      expect(isOk(result1)).toBe(true);
      expect(isOk(result2)).toBe(true);
    });

    test('execute with empty args', async () => {
      await adapter.init({
        host: 'test.psdb.cloud',
        username: 'test-user',
        password: 'test-pass',
      });

      const result = await adapter.execute('SELECT 1', []);
      expect(result).toBeDefined();
    });

    test('execute with null args', async () => {
      await adapter.init({
        host: 'test.psdb.cloud',
        username: 'test-user',
        password: 'test-pass',
      });

      const result = await adapter.execute('SELECT 1', undefined);
      expect(result).toBeDefined();
    });

    test('stop before start', async () => {
      await adapter.init({
        host: 'test.psdb.cloud',
        username: 'test-user',
        password: 'test-pass',
      });

      const result = await adapter.stop();
      expect(isOk(result)).toBe(true);
    });

    test('destroy without init', async () => {
      const result = await adapter.destroy();
      expect(isOk(result)).toBe(true);
    });
  });
});
