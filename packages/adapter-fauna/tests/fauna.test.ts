/**
 * FaunaDB Adapter Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createFaunaAdapter, fql } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('Fauna Adapter', () => {
  let adapter: ReturnType<typeof createFaunaAdapter>;

  beforeEach(() => {
    adapter = createFaunaAdapter();
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
        secret: 'test-secret-key',
      });

      expect(isOk(result)).toBe(true);
    });

    test('init with endpoint', async () => {
      const result = await adapter.init({
        secret: 'test-secret-key',
        endpoint: 'http://localhost:8443',
      });

      expect(isOk(result)).toBe(true);
    });

    test('init with query timeout', async () => {
      const result = await adapter.init({
        secret: 'test-secret-key',
        queryTimeout: 30000,
      });

      expect(isOk(result)).toBe(true);
    });

    test('start after init', async () => {
      await adapter.init({
        secret: 'test-secret-key',
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
        secret: 'test-secret-key',
      });

      const result = await adapter.stop();
      expect(isOk(result)).toBe(true);
    });

    test('stop without init', async () => {
      const result = await adapter.stop();
      expect(isOk(result)).toBe(true);
    });

    test('destroy', async () => {
      await adapter.init({
        secret: 'test-secret-key',
      });

      const result = await adapter.destroy();
      expect(isOk(result)).toBe(true);

      // Verify state is cleared
      const clientResult = adapter.getClient();
      expect(isErr(clientResult)).toBe(true);
    });

    test('destroy without init', async () => {
      const result = await adapter.destroy();
      expect(isOk(result)).toBe(true);
    });

    test('health check when not initialized', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('unhealthy');
        expect(result.value.error).toBeDefined();
      }
    });

    test.skip('health check when initialized', async () => {
      // Skipped: requires real Fauna connection
      await adapter.init({
        secret: 'test-secret-key',
      });

      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
    });
  });

  describe('Client Access', () => {
    test('getClient after init returns client', async () => {
      await adapter.init({
        secret: 'test-secret-key',
      });

      const result = adapter.getClient();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeDefined();
      }
    });

    test('getClient before init fails', () => {
      const result = adapter.getClient();
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('not initialized');
      }
    });
  });

  describe('Query Execution', () => {
    beforeEach(async () => {
      await adapter.init({
        secret: 'test-secret-key',
      });
      await adapter.start();
    });

    test('query without client fails', async () => {
      const uninitializedAdapter = createFaunaAdapter();
      const result = await uninitializedAdapter.query(fql`1 + 1`);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('not initialized');
      }
    });

    test.skip('query with FQL template', async () => {
      // Skipped: requires real Fauna connection
      const result = await adapter.query(fql`1 + 1`);
      expect(result).toBeDefined();
    });

    test.skip('query with parameterized FQL', async () => {
      // Skipped: requires real Fauna connection
      const value = 42;
      const result = await adapter.query(fql`${value} + 1`);
      expect(result).toBeDefined();
    });

    test.skip('query handles errors', async () => {
      // Skipped: requires real Fauna connection
      const result = await adapter.query(fql`InvalidFunction()`);
      expect(result).toBeDefined();
    });

    test.skip('query with collection operations', async () => {
      // Skipped: requires real Fauna connection
      const result = await adapter.query(fql`
        Collection.all()
      `);
      expect(result).toBeDefined();
    });
  });

  describe('FQL Operations', () => {
    beforeEach(async () => {
      await adapter.init({
        secret: 'test-secret-key',
      });
      await adapter.start();
    });

    test.skip('create collection query', async () => {
      // Skipped: requires real Fauna connection
      const result = await adapter.query(fql`
        if (!Collection.byName("TestCollection").exists()) {
          Collection.create({ name: "TestCollection" })
        }
      `);
      expect(result).toBeDefined();
    });

    test.skip('create document query', async () => {
      // Skipped: requires real Fauna connection
      const result = await adapter.query(fql`
        TestCollection.create({
          name: "Test",
          value: 42
        })
      `);
      expect(result).toBeDefined();
    });

    test.skip('query with filter', async () => {
      // Skipped: requires real Fauna connection
      const result = await adapter.query(fql`
        TestCollection.where(.active == true)
      `);
      expect(result).toBeDefined();
    });

    test.skip('query with pagination', async () => {
      // Skipped: requires real Fauna connection
      const result = await adapter.query(fql`
        TestCollection.all().pageSize(10)
      `);
      expect(result).toBeDefined();
    });

    test.skip('update document query', async () => {
      // Skipped: requires real Fauna connection
      const result = await adapter.query(fql`
        TestCollection.byId("123").update({ name: "Updated" })
      `);
      expect(result).toBeDefined();
    });

    test.skip('delete document query', async () => {
      // Skipped: requires real Fauna connection
      const result = await adapter.query(fql`
        TestCollection.byId("123").delete()
      `);
      expect(result).toBeDefined();
    });
  });

  describe('Advanced Queries', () => {
    beforeEach(async () => {
      await adapter.init({
        secret: 'test-secret-key',
      });
      await adapter.start();
    });

    test.skip('query with map', async () => {
      // Skipped: requires real Fauna connection
      const result = await adapter.query(fql`
        TestCollection.all().map(doc => {
          id: doc.id,
          name: doc.name
        })
      `);
      expect(result).toBeDefined();
    });

    test.skip('query with count', async () => {
      // Skipped: requires real Fauna connection
      const result = await adapter.query(fql`
        TestCollection.where(.active == true).count()
      `);
      expect(result).toBeDefined();
    });

    test.skip('query with fold (aggregation)', async () => {
      // Skipped: requires real Fauna connection
      const result = await adapter.query(fql`
        TestCollection.all().fold(0, (sum, doc) => sum + doc.value)
      `);
      expect(result).toBeDefined();
    });

    test.skip('query with conditional', async () => {
      // Skipped: requires real Fauna connection
      const result = await adapter.query(fql`
        let doc = TestCollection.byId("123").first()
        if (doc != null) {
          doc.update({ updated: true })
        } else {
          TestCollection.create({ name: "New" })
        }
      `);
      expect(result).toBeDefined();
    });

    test.skip('query with index', async () => {
      // Skipped: requires real Fauna connection
      const result = await adapter.query(fql`
        Index.byName("test_index").match("value")
      `);
      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    test('multiple init calls', async () => {
      const result1 = await adapter.init({
        secret: 'test-secret-1',
      });

      const result2 = await adapter.init({
        secret: 'test-secret-2',
      });

      expect(isOk(result1)).toBe(true);
      expect(isOk(result2)).toBe(true);
    });

    test.skip('query with complex FQL expression', async () => {
      // Skipped: requires real Fauna connection
      await adapter.init({
        secret: 'test-secret-key',
      });

      const name = 'Test';
      const age = 30;

      const result = await adapter.query(fql`
        Users.create({
          name: ${name},
          age: ${age},
          createdAt: Time.now()
        })
      `);

      expect(result).toBeDefined();
    });

    test.skip('query with nested objects', async () => {
      // Skipped: requires real Fauna connection
      await adapter.init({
        secret: 'test-secret-key',
      });

      const result = await adapter.query(fql`
        Users.create({
          name: "Test",
          address: {
            street: "123 Main St",
            city: "Test City",
            country: "Test Country"
          }
        })
      `);

      expect(result).toBeDefined();
    });

    test('stop before start', async () => {
      await adapter.init({
        secret: 'test-secret-key',
      });

      const result = await adapter.stop();
      expect(isOk(result)).toBe(true);
    });

    test('getClient after destroy fails', async () => {
      await adapter.init({
        secret: 'test-secret-key',
      });

      await adapter.destroy();

      const result = adapter.getClient();
      expect(isErr(result)).toBe(true);
    });
  });

  describe('FQL Export', () => {
    test('fql is exported from module', () => {
      expect(fql).toBeDefined();
      expect(typeof fql).toBe('function');
    });

    test('fql creates tagged template', () => {
      const query = fql`1 + 1`;
      expect(query).toBeDefined();
    });

    test('fql supports interpolation', () => {
      const value = 42;
      const query = fql`${value} + 1`;
      expect(query).toBeDefined();
    });
  });
});
