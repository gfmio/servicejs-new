/**
 * Supabase Adapter Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createSupabaseAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('Supabase Adapter', () => {
  let adapter: ReturnType<typeof createSupabaseAdapter>;

  beforeEach(() => {
    adapter = createSupabaseAdapter();
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
        url: 'https://test.supabase.co',
        key: 'test-key',
      });

      expect(isOk(result)).toBe(true);
    });

    test('init with auth options', async () => {
      const result = await adapter.init({
        url: 'https://test.supabase.co',
        key: 'test-key',
        auth: {
          autoRefreshToken: true,
          persistSession: false,
        },
      });

      expect(isOk(result)).toBe(true);
    });

    test('start after init', async () => {
      await adapter.init({
        url: 'https://test.supabase.co',
        key: 'test-key',
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
        url: 'https://test.supabase.co',
        key: 'test-key',
      });

      const result = await adapter.stop();
      expect(isOk(result)).toBe(true);
    });

    test('destroy', async () => {
      await adapter.init({
        url: 'https://test.supabase.co',
        key: 'test-key',
      });

      const result = await adapter.destroy();
      expect(isOk(result)).toBe(true);
    });

    test('health check when not initialized', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('unhealthy');
      }
    });

    test('health check when initialized', async () => {
      await adapter.init({
        url: 'https://test.supabase.co',
        key: 'test-key',
      });

      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
    });
  });

  describe('Client Access', () => {
    test('getClient after init returns client', async () => {
      await adapter.init({
        url: 'https://test.supabase.co',
        key: 'test-key',
      });

      const result = adapter.getClient();
      expect(isOk(result)).toBe(true);
    });

    test('getClient before init fails', () => {
      const result = adapter.getClient();
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('not initialized');
      }
    });
  });

  describe('Database Operations', () => {
    beforeEach(async () => {
      await adapter.init({
        url: 'https://test.supabase.co',
        key: 'test-key',
      });
      await adapter.start();
    });

    test('query without client fails', async () => {
      const uninitializedAdapter = createSupabaseAdapter();
      const result = await uninitializedAdapter.query({
        table: 'users',
        select: '*',
      });

      expect(isErr(result)).toBe(true);
    });

    test('insert without client fails', async () => {
      const uninitializedAdapter = createSupabaseAdapter();
      const result = await uninitializedAdapter.insert({
        table: 'users',
        data: { name: 'Test' },
      });

      expect(isErr(result)).toBe(true);
    });

    test('update without client fails', async () => {
      const uninitializedAdapter = createSupabaseAdapter();
      const result = await uninitializedAdapter.update({
        table: 'users',
        data: { name: 'Updated' },
        filter: { id: 1 },
      });

      expect(isErr(result)).toBe(true);
    });

    test('delete without client fails', async () => {
      const uninitializedAdapter = createSupabaseAdapter();
      const result = await uninitializedAdapter.delete({
        table: 'users',
        filter: { id: 1 },
      });

      expect(isErr(result)).toBe(true);
    });

    test('rpc without client fails', async () => {
      const uninitializedAdapter = createSupabaseAdapter();
      const result = await uninitializedAdapter.rpc('test_function');

      expect(isErr(result)).toBe(true);
    });
  });

  describe('Authentication', () => {
    beforeEach(async () => {
      await adapter.init({
        url: 'https://test.supabase.co',
        key: 'test-key',
      });
      await adapter.start();
    });

    test('signUp without client fails', async () => {
      const uninitializedAdapter = createSupabaseAdapter();
      const result = await uninitializedAdapter.signUp({
        email: 'test@example.com',
        password: 'password',
      });

      expect(isErr(result)).toBe(true);
    });

    test('signIn without client fails', async () => {
      const uninitializedAdapter = createSupabaseAdapter();
      const result = await uninitializedAdapter.signIn({
        email: 'test@example.com',
        password: 'password',
      });

      expect(isErr(result)).toBe(true);
    });

    test('signOut without client fails', async () => {
      const uninitializedAdapter = createSupabaseAdapter();
      const result = await uninitializedAdapter.signOut();

      expect(isErr(result)).toBe(true);
    });

    test('getSession without client fails', async () => {
      const uninitializedAdapter = createSupabaseAdapter();
      const result = await uninitializedAdapter.getSession();

      expect(isErr(result)).toBe(true);
    });

    test('getUser without client fails', async () => {
      const uninitializedAdapter = createSupabaseAdapter();
      const result = await uninitializedAdapter.getUser();

      expect(isErr(result)).toBe(true);
    });

    test('onAuthStateChange without client throws', () => {
      const uninitializedAdapter = createSupabaseAdapter();
      expect(() => {
        uninitializedAdapter.onAuthStateChange(() => {});
      }).toThrow();
    });
  });

  describe('Real-time', () => {
    beforeEach(async () => {
      await adapter.init({
        url: 'https://test.supabase.co',
        key: 'test-key',
      });
      await adapter.start();
    });

    test('subscribe without client fails', () => {
      const uninitializedAdapter = createSupabaseAdapter();
      const result = uninitializedAdapter.subscribe({
        channel: 'test',
        callback: () => {},
      });

      expect(isErr(result)).toBe(true);
    });

    test('unsubscribe without client fails', async () => {
      const uninitializedAdapter = createSupabaseAdapter();
      const result = await uninitializedAdapter.unsubscribe({} as any);

      expect(isErr(result)).toBe(true);
    });
  });

  describe('Storage', () => {
    beforeEach(async () => {
      await adapter.init({
        url: 'https://test.supabase.co',
        key: 'test-key',
      });
      await adapter.start();
    });

    test('uploadFile without client fails', async () => {
      const uninitializedAdapter = createSupabaseAdapter();
      const result = await uninitializedAdapter.uploadFile({
        bucket: 'test',
        path: 'test.txt',
        file: new Blob(['test']),
      });

      expect(isErr(result)).toBe(true);
    });

    test('downloadFile without client fails', async () => {
      const uninitializedAdapter = createSupabaseAdapter();
      const result = await uninitializedAdapter.downloadFile({
        bucket: 'test',
        path: 'test.txt',
      });

      expect(isErr(result)).toBe(true);
    });

    test('listFiles without client fails', async () => {
      const uninitializedAdapter = createSupabaseAdapter();
      const result = await uninitializedAdapter.listFiles({
        bucket: 'test',
      });

      expect(isErr(result)).toBe(true);
    });

    test('deleteFile without client fails', async () => {
      const uninitializedAdapter = createSupabaseAdapter();
      const result = await uninitializedAdapter.deleteFile('test', ['test.txt']);

      expect(isErr(result)).toBe(true);
    });

    test('getPublicUrl without client fails', () => {
      const uninitializedAdapter = createSupabaseAdapter();
      const result = uninitializedAdapter.getPublicUrl('test', 'test.txt');

      expect(isErr(result)).toBe(true);
    });
  });
});
