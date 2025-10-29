/**
 * Meilisearch Adapter Tests
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import { createMeilisearchAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('Meilisearch Adapter', () => {
  let container: StartedTestContainer;
  let adapter: ReturnType<typeof createMeilisearchAdapter>;

  beforeAll(async () => {
    // Start Meilisearch container
    container = await new GenericContainer('getmeili/meilisearch:v1.10')
      .withExposedPorts(7700)
      .withEnvironment({ MEILI_NO_ANALYTICS: 'true' })
      .withWaitStrategy(Wait.forHttp('/health', 7700))
      .start();
  }, 60000);

  afterAll(async () => {
    if (container) {
      await container.stop();
    }
  });

  beforeEach(() => {
    adapter = createMeilisearchAdapter();
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
        host: `http://${container.getHost()}:${container.getMappedPort(7700)}`,
      });

      expect(isOk(result)).toBe(true);
    });

    test('init with API key', async () => {
      const result = await adapter.init({
        host: `http://${container.getHost()}:${container.getMappedPort(7700)}`,
        apiKey: 'test-api-key',
      });

      expect(isOk(result)).toBe(true);
    });

    test('start after init', async () => {
      await adapter.init({
        host: `http://${container.getHost()}:${container.getMappedPort(7700)}`,
      });

      const result = await adapter.start();
      expect(isOk(result)).toBe(true);
    });

    test('start without init fails', async () => {
      const result = await adapter.start();
      expect(isErr(result)).toBe(true);
    });

    test('health check when initialized', async () => {
      await adapter.init({
        host: `http://${container.getHost()}:${container.getMappedPort(7700)}`,
      });

      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }
    });

    test('getClient after init returns client', async () => {
      await adapter.init({
        host: `http://${container.getHost()}:${container.getMappedPort(7700)}`,
      });

      const result = adapter.getClient();
      expect(isOk(result)).toBe(true);
    });

    test('getClient before init fails', () => {
      const result = adapter.getClient();
      expect(isErr(result)).toBe(true);
    });
  });

  describe('Document Operations', () => {
    beforeEach(async () => {
      await adapter.init({
        host: `http://${container.getHost()}:${container.getMappedPort(7700)}`,
      });
      await adapter.start();
    });

    test('create index and add documents', async () => {
      const indexName = `test-index-${Date.now()}`;

      // Create index
      const createResult = await adapter.createIndex(indexName, { primaryKey: 'id' });
      expect(isOk(createResult)).toBe(true);

      // Add documents
      const addResult = await adapter.addDocuments(indexName, [
        { id: 1, name: 'Product 1', price: 10.99 },
        { id: 2, name: 'Product 2', price: 20.99 },
      ]);

      expect(isOk(addResult)).toBe(true);

      // Wait for indexing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Search
      const searchResult = await adapter.search(indexName, {
        query: 'Product',
        limit: 10,
      });

      expect(isOk(searchResult)).toBe(true);
      if (isOk(searchResult)) {
        expect(searchResult.value.hits.length).toBeGreaterThan(0);
      }

      // Cleanup
      await adapter.deleteIndex(indexName);
    });

    test('update and delete documents', async () => {
      const indexName = `test-update-${Date.now()}`;

      await adapter.createIndex(indexName, { primaryKey: 'id' });
      await adapter.addDocuments(indexName, [
        { id: 1, name: 'Original', price: 10.99 },
      ]);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update
      const updateResult = await adapter.updateDocuments(indexName, [
        { id: 1, name: 'Updated' },
      ]);

      expect(isOk(updateResult)).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Delete
      const deleteResult = await adapter.deleteDocument(indexName, 1);
      expect(isOk(deleteResult)).toBe(true);

      // Cleanup
      await adapter.deleteIndex(indexName);
    });

    test('settings management', async () => {
      const indexName = `test-settings-${Date.now()}`;

      await adapter.createIndex(indexName);

      const settings = {
        searchableAttributes: ['name', 'description'],
        filterableAttributes: ['price'],
      };

      const updateResult = await adapter.updateSettings(indexName, settings);
      expect(isOk(updateResult)).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 500));

      const getResult = await adapter.getSettings(indexName);
      expect(isOk(getResult)).toBe(true);

      // Cleanup
      await adapter.deleteIndex(indexName);
    });
  });
});
