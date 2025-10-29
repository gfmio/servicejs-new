/**
 * Typesense Adapter Tests
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import { createTypesenseAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('Typesense Adapter', () => {
  let container: StartedTestContainer;
  let adapter: ReturnType<typeof createTypesenseAdapter>;

  beforeAll(async () => {
    // Start Typesense container
    container = await new GenericContainer('typesense/typesense:27.1')
      .withExposedPorts(8108)
      .withCommand(['--data-dir', '/data', '--api-key=test-api-key'])
      .withWaitStrategy(Wait.forHttp('/health', 8108))
      .start();
  }, 60000);

  afterAll(async () => {
    if (container) {
      await container.stop();
    }
  });

  beforeEach(() => {
    adapter = createTypesenseAdapter();
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
        nodes: [{
          host: container.getHost(),
          port: container.getMappedPort(8108),
          protocol: 'http',
        }],
        apiKey: 'test-api-key',
      });

      expect(isOk(result)).toBe(true);
    });

    test('start after init', async () => {
      await adapter.init({
        nodes: [{
          host: container.getHost(),
          port: container.getMappedPort(8108),
          protocol: 'http',
        }],
        apiKey: 'test-api-key',
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
        nodes: [{
          host: container.getHost(),
          port: container.getMappedPort(8108),
          protocol: 'http',
        }],
        apiKey: 'test-api-key',
      });

      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }
    });

    test('getClient after init returns client', async () => {
      await adapter.init({
        nodes: [{
          host: container.getHost(),
          port: container.getMappedPort(8108),
          protocol: 'http',
        }],
        apiKey: 'test-api-key',
      });

      const result = adapter.getClient();
      expect(isOk(result)).toBe(true);
    });

    test('getClient before init fails', () => {
      const result = adapter.getClient();
      expect(isErr(result)).toBe(true);
    });
  });

  describe('Collection and Document Operations', () => {
    beforeEach(async () => {
      await adapter.init({
        nodes: [{
          host: container.getHost(),
          port: container.getMappedPort(8108),
          protocol: 'http',
        }],
        apiKey: 'test-api-key',
      });
      await adapter.start();
    });

    test('create collection and add documents', async () => {
      const collectionName = `products_${Date.now()}`;

      // Create collection
      const schema = {
        name: collectionName,
        fields: [
          { name: 'name', type: 'string' },
          { name: 'price', type: 'float' },
          { name: 'category', type: 'string', facet: true },
        ],
        default_sorting_field: 'price',
      };

      const createResult = await adapter.createCollection(schema);
      expect(isOk(createResult)).toBe(true);

      // Create document
      const docResult = await adapter.createDocument(collectionName, {
        id: '1',
        name: 'Laptop',
        price: 1299.99,
        category: 'electronics',
      });

      expect(isOk(docResult)).toBe(true);

      // Search
      const searchResult = await adapter.search(collectionName, {
        q: 'laptop',
        query_by: 'name',
      });

      expect(isOk(searchResult)).toBe(true);
      if (isOk(searchResult)) {
        expect(searchResult.value.hits).toBeDefined();
        expect(searchResult.value.hits.length).toBeGreaterThan(0);
      }

      // Cleanup
      await adapter.deleteCollection(collectionName);
    });

    test('upsert and update documents', async () => {
      const collectionName = `test_upsert_${Date.now()}`;

      const schema = {
        name: collectionName,
        fields: [
          { name: 'name', type: 'string' },
          { name: 'value', type: 'int32' },
        ],
      };

      await adapter.createCollection(schema);

      // Upsert
      const upsertResult = await adapter.upsertDocument(collectionName, {
        id: '1',
        name: 'Test',
        value: 10,
      });

      expect(isOk(upsertResult)).toBe(true);

      // Update
      const updateResult = await adapter.updateDocument(collectionName, '1', {
        value: 20,
      });

      expect(isOk(updateResult)).toBe(true);

      // Delete
      const deleteResult = await adapter.deleteDocument(collectionName, '1');
      expect(isOk(deleteResult)).toBe(true);

      // Cleanup
      await adapter.deleteCollection(collectionName);
    });

    test('import documents', async () => {
      const collectionName = `test_import_${Date.now()}`;

      const schema = {
        name: collectionName,
        fields: [
          { name: 'title', type: 'string' },
          { name: 'year', type: 'int32' },
        ],
      };

      await adapter.createCollection(schema);

      const documents = [
        { id: '1', title: 'Book 1', year: 2020 },
        { id: '2', title: 'Book 2', year: 2021 },
        { id: '3', title: 'Book 3', year: 2022 },
      ];

      const importResult = await adapter.importDocuments(collectionName, documents, {
        action: 'create',
      });

      expect(isOk(importResult)).toBe(true);

      // Cleanup
      await adapter.deleteCollection(collectionName);
    });
  });
});
