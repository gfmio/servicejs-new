/**
 * Clerk Adapter Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createClerkAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('Clerk Adapter', () => {
  let adapter: ReturnType<typeof createClerkAdapter>;

  beforeEach(() => {
    adapter = createClerkAdapter();
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
        secretKey: 'sk_test_validkey123',
      });

      expect(isOk(result)).toBe(true);
    });

    test('init with publishable key', async () => {
      const result = await adapter.init({
        secretKey: 'sk_test_validkey123',
        publishableKey: 'pk_test_validkey123',
      });

      expect(isOk(result)).toBe(true);
    });

    test('init without secret key fails', async () => {
      const result = await adapter.init({
        secretKey: '',
      });

      expect(isErr(result)).toBe(true);
    });

    test('init with invalid secret key format fails', async () => {
      const result = await adapter.init({
        secretKey: 'invalid-key-format',
      });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('Invalid secret key format');
      }
    });

    test('start after init', async () => {
      await adapter.init({
        secretKey: 'sk_test_validkey123',
      });

      const result = await adapter.start();
      expect(isOk(result)).toBe(true);
    });

    test('start without init fails', async () => {
      const result = await adapter.start();
      expect(isErr(result)).toBe(true);
    });

    test('health check when uninitialized', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('unhealthy');
      }
    });
  });

  describe('User Operations (Unit Tests)', () => {
    beforeEach(async () => {
      await adapter.init({
        secretKey: 'sk_test_validkey123',
      });
    });

    test('getUser requires initialization', async () => {
      await adapter.destroy();
      adapter = createClerkAdapter();

      const result = await adapter.getUser('user_123');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('not initialized');
      }
    });

    test('createUser requires initialization', async () => {
      await adapter.destroy();
      adapter = createClerkAdapter();

      const result = await adapter.createUser({
        email_address: ['test@example.com'],
        password: 'password123',
      });

      expect(isErr(result)).toBe(true);
    });

    test('updateUser requires initialization', async () => {
      await adapter.destroy();
      adapter = createClerkAdapter();

      const result = await adapter.updateUser({
        userId: 'user_123',
        first_name: 'Updated',
      });

      expect(isErr(result)).toBe(true);
    });

    test('deleteUser requires initialization', async () => {
      await adapter.destroy();
      adapter = createClerkAdapter();

      const result = await adapter.deleteUser('user_123');

      expect(isErr(result)).toBe(true);
    });

    test('banUser requires initialization', async () => {
      await adapter.destroy();
      adapter = createClerkAdapter();

      const result = await adapter.banUser('user_123');

      expect(isErr(result)).toBe(true);
    });

    test('unbanUser requires initialization', async () => {
      await adapter.destroy();
      adapter = createClerkAdapter();

      const result = await adapter.unbanUser('user_123');

      expect(isErr(result)).toBe(true);
    });

    test('lockUser requires initialization', async () => {
      await adapter.destroy();
      adapter = createClerkAdapter();

      const result = await adapter.lockUser('user_123');

      expect(isErr(result)).toBe(true);
    });

    test('unlockUser requires initialization', async () => {
      await adapter.destroy();
      adapter = createClerkAdapter();

      const result = await adapter.unlockUser('user_123');

      expect(isErr(result)).toBe(true);
    });
  });

  describe('Session Operations (Unit Tests)', () => {
    beforeEach(async () => {
      await adapter.init({
        secretKey: 'sk_test_validkey123',
      });
    });

    test('getSession requires initialization', async () => {
      await adapter.destroy();
      adapter = createClerkAdapter();

      const result = await adapter.getSession('sess_123');

      expect(isErr(result)).toBe(true);
    });

    test('getUserSessions requires initialization', async () => {
      await adapter.destroy();
      adapter = createClerkAdapter();

      const result = await adapter.getUserSessions('user_123');

      expect(isErr(result)).toBe(true);
    });

    test('revokeSession requires initialization', async () => {
      await adapter.destroy();
      adapter = createClerkAdapter();

      const result = await adapter.revokeSession('sess_123');

      expect(isErr(result)).toBe(true);
    });

    test('verifyToken requires initialization', async () => {
      await adapter.destroy();
      adapter = createClerkAdapter();

      const result = await adapter.verifyToken({
        token: 'token_123',
      });

      expect(isErr(result)).toBe(true);
    });

    test('createToken requires initialization', async () => {
      await adapter.destroy();
      adapter = createClerkAdapter();

      const result = await adapter.createToken({
        userId: 'user_123',
      });

      expect(isErr(result)).toBe(true);
    });
  });

  // Note: Integration tests with real Clerk API would be in a separate file
  // and marked with test.skip() or run conditionally with environment variables
});
