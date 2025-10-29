/**
 * Elasticsearch Adapter Tests
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { ElasticsearchContainer } from '@testcontainers/elasticsearch';
import type { StartedElasticsearchContainer } from '@testcontainers/elasticsearch';
import { createElasticsearchAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('Elasticsearch Adapter', () => {
  let container: StartedElasticsearchContainer;
  let adapter: ReturnType<typeof createElasticsearchAdapter>;

  beforeAll(async () => {
    // Start Elasticsearch container
    container = await new ElasticsearchContainer('docker.elastic.co/elasticsearch/elasticsearch:8.15.0')
      .withEnvironment({ 'xpack.security.enabled': 'false' })
      .start();
  }, 60000);

  afterAll(async () => {
    if (container) {
      await container.stop();
    }
  });

  beforeEach(() => {
    adapter = createElasticsearchAdapter();
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.stop();
      await adapter.destroy();
    }
  });

  describe('Lifecycle', () => {
    test('init with node URL', async () => {
      const result = await adapter.init({
        node: container.getHttpUrl(),
      });

      expect(isOk(result)).toBe(true);
    });

    test.skip('init with cloud ID', async () => {
      // Skipped: requires valid Elastic Cloud ID format
      const result = await adapter.init({
        cloud: {
          id: 'test-cloud-id',
        },
        auth: {
          apiKey: 'test-api-key',
        },
      });

      expect(isOk(result)).toBe(true);
    });

    test('init with authentication', async () => {
      const result = await adapter.init({
        node: container.getHttpUrl(),
        auth: {
          username: 'elastic',
          password: 'changeme',
        },
      });

      expect(isOk(result)).toBe(true);
    });

    test('start after init', async () => {
      await adapter.init({
        node: container.getHttpUrl(),
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
        node: container.getHttpUrl(),
      });

      const result = await adapter.stop();
      expect(isOk(result)).toBe(true);
    });

    test('destroy', async () => {
      await adapter.init({
        node: container.getHttpUrl(),
      });

      const result = await adapter.destroy();
      expect(isOk(result)).toBe(true);

      // Verify state is cleared
      const clientResult = adapter.getClient();
      expect(isErr(clientResult)).toBe(true);
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
        node: container.getHttpUrl(),
      });

      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(['healthy', 'degraded']).toContain(result.value.status);
      }
    });
  });

  describe('Client Access', () => {
    test('getClient after init returns client', async () => {
      await adapter.init({
        node: container.getHttpUrl(),
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

  describe('Document Operations', () => {
    beforeEach(async () => {
      await adapter.init({
        node: container.getHttpUrl(),
      });
      await adapter.start();
    });

    test('index without client fails', async () => {
      const uninitializedAdapter = createElasticsearchAdapter();
      const result = await uninitializedAdapter.index({
        index: 'test-index',
        document: { title: 'Test' },
      });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('not initialized');
      }
    });

    test('index and search document', async () => {
      // Create index
      await adapter.createIndex({
        index: 'products',
        mappings: {
          properties: {
            name: { type: 'text' },
            price: { type: 'float' },
          },
        },
      });

      // Index a document
      const indexResult = await adapter.index({
        index: 'products',
        id: '1',
        document: {
          name: 'Laptop',
          price: 1299.99,
        },
        refresh: 'wait_for',
      });

      expect(isOk(indexResult)).toBe(true);

      // Search for it
      const searchResult = await adapter.search({
        index: 'products',
        query: {
          match: { name: 'laptop' },
        },
      });

      expect(isOk(searchResult)).toBe(true);
      if (isOk(searchResult)) {
        expect(searchResult.value.hits.hits.length).toBeGreaterThan(0);
      }
    });

    test('get document', async () => {
      // Create index and document
      await adapter.createIndex({ index: 'test-get' });
      await adapter.index({
        index: 'test-get',
        id: '1',
        document: { title: 'Test' },
        refresh: 'wait_for',
      });

      const result = await adapter.get('test-get', '1');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value._source).toEqual({ title: 'Test' });
      }
    });

    test('update document', async () => {
      // Create index and document
      await adapter.createIndex({ index: 'test-update' });
      await adapter.index({
        index: 'test-update',
        id: '1',
        document: { title: 'Original' },
        refresh: 'wait_for',
      });

      const result = await adapter.update({
        index: 'test-update',
        id: '1',
        doc: { title: 'Updated' },
        refresh: 'wait_for',
      });

      expect(isOk(result)).toBe(true);

      // Verify update
      const getResult = await adapter.get('test-update', '1');
      if (isOk(getResult)) {
        expect(getResult.value._source.title).toBe('Updated');
      }
    });

    test('delete document', async () => {
      // Create index and document
      await adapter.createIndex({ index: 'test-delete' });
      await adapter.index({
        index: 'test-delete',
        id: '1',
        document: { title: 'To Delete' },
        refresh: 'wait_for',
      });

      const result = await adapter.delete({
        index: 'test-delete',
        id: '1',
        refresh: 'wait_for',
      });

      expect(isOk(result)).toBe(true);

      // Verify deletion
      const getResult = await adapter.get('test-delete', '1');
      expect(isErr(getResult)).toBe(true);
    });

    test('bulk operations', async () => {
      await adapter.createIndex({ index: 'test-bulk' });

      const result = await adapter.bulk([
        { index: { _index: 'test-bulk', _id: '1' } },
        { title: 'Doc 1' },
        { index: { _index: 'test-bulk', _id: '2' } },
        { title: 'Doc 2' },
      ]);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.errors).toBe(false);
      }
    });
  });

  describe('Index Management', () => {
    beforeEach(async () => {
      await adapter.init({
        node: container.getHttpUrl(),
      });
      await adapter.start();
    });

    test('create and delete index', async () => {
      const createResult = await adapter.createIndex({
        index: 'test-index-mgmt',
      });

      expect(isOk(createResult)).toBe(true);

      const existsResult = await adapter.indexExists('test-index-mgmt');
      expect(isOk(existsResult)).toBe(true);
      if (isOk(existsResult)) {
        expect(existsResult.value).toBe(true);
      }

      const deleteResult = await adapter.deleteIndex('test-index-mgmt');
      expect(isOk(deleteResult)).toBe(true);

      const existsAfterResult = await adapter.indexExists('test-index-mgmt');
      if (isOk(existsAfterResult)) {
        expect(existsAfterResult.value).toBe(false);
      }
    });
  });

  describe('Edge Cases', () => {
    test('multiple init calls', async () => {
      const result1 = await adapter.init({
        node: container.getHttpUrl(),
      });

      const result2 = await adapter.init({
        node: container.getHttpUrl(),
      });

      expect(isOk(result1)).toBe(true);
      expect(isOk(result2)).toBe(true);
    });

    test('stop before start', async () => {
      await adapter.init({
        node: container.getHttpUrl(),
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
