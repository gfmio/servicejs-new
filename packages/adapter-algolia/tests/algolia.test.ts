/**
 * Algolia Adapter Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createAlgoliaAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('Algolia Adapter', () => {
  let adapter: ReturnType<typeof createAlgoliaAdapter>;

  beforeEach(() => {
    adapter = createAlgoliaAdapter();
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
        appId: 'test-app-id',
        apiKey: 'test-api-key',
      });

      expect(isOk(result)).toBe(true);
    });

    test('start after init', async () => {
      await adapter.init({
        appId: 'test-app-id',
        apiKey: 'test-api-key',
      });

      const result = await adapter.start();
      expect(isOk(result)).toBe(true);
    });

    test('start without init fails', async () => {
      const result = await adapter.start();
      expect(isErr(result)).toBe(true);
    });

    test('getClient after init returns client', async () => {
      await adapter.init({
        appId: 'test-app-id',
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

  describe('Object Operations', () => {
    beforeEach(async () => {
      await adapter.init({
        appId: 'test-app-id',
        apiKey: 'test-api-key',
      });
    });

    test('saveObject without client fails', async () => {
      const uninitializedAdapter = createAlgoliaAdapter();
      const result = await uninitializedAdapter.saveObject('test-index', {
        objectID: '1',
        name: 'Test',
      });

      expect(isErr(result)).toBe(true);
    });

    test('search without client fails', async () => {
      const uninitializedAdapter = createAlgoliaAdapter();
      const result = await uninitializedAdapter.search('test-index', {
        query: 'test',
      });

      expect(isErr(result)).toBe(true);
    });
  });
});
