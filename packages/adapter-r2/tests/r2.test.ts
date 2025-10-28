import { describe, test, expect } from 'bun:test';
import { createR2Adapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('R2 Adapter', () => {
  describe('Lifecycle', () => {
    test('init succeeds with valid config', async () => {
      const adapter = createR2Adapter();
      const result = await adapter.init({
        accountId: 'test-account',
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
      });
      expect(isOk(result)).toBe(true);
      await adapter.destroy();
    });

    test('start succeeds after init', async () => {
      const adapter = createR2Adapter();
      await adapter.init({
        accountId: 'test-account',
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
      });

      const result = await adapter.start();
      expect(isOk(result)).toBe(true);
      await adapter.destroy();
    });

    test('start fails before init', async () => {
      const adapter = createR2Adapter();
      const result = await adapter.start();
      expect(isErr(result)).toBe(true);
    });

    test('health returns unhealthy before init', async () => {
      const adapter = createR2Adapter();
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('unhealthy');
      }
    });

    test('health returns healthy after init', async () => {
      const adapter = createR2Adapter();
      await adapter.init({
        accountId: 'test-account',
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
      });
      await adapter.start();

      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }

      await adapter.destroy();
    });
  });

  describe('Storage Operations', () => {
    test('operations fail before init', async () => {
      const adapter = createR2Adapter();

      const putResult = await adapter.put('bucket', 'key', 'data');
      expect(isErr(putResult)).toBe(true);

      const getResult = await adapter.get('bucket', 'key');
      expect(isErr(getResult)).toBe(true);

      const deleteResult = await adapter.delete('bucket', 'key');
      expect(isErr(deleteResult)).toBe(true);

      const listResult = await adapter.list('bucket');
      expect(isErr(listResult)).toBe(true);
    });
  });
});
