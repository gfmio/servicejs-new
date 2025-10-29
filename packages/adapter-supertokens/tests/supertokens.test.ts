/**
 * SuperTokens Adapter Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createSuperTokensAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('SuperTokens Adapter', () => {
  let adapter: ReturnType<typeof createSuperTokensAdapter>;

  beforeEach(() => {
    adapter = createSuperTokensAdapter();
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
        connectionURI: 'http://localhost:3567',
      });

      expect(isOk(result)).toBe(true);
    });

    test('init with API key', async () => {
      const result = await adapter.init({
        connectionURI: 'http://localhost:3567',
        apiKey: 'test-api-key',
      });

      expect(isOk(result)).toBe(true);
    });

    test('init without connection URI fails', async () => {
      const result = await adapter.init({
        connectionURI: '',
      });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('Connection URI is required');
      }
    });

    test('start after init', async () => {
      await adapter.init({
        connectionURI: 'http://localhost:3567',
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
        connectionURI: 'http://localhost:3567',
      });
    });

    test('createEmailPasswordUser requires initialization', async () => {
      await adapter.destroy();
      adapter = createSuperTokensAdapter();

      const result = await adapter.createEmailPasswordUser({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(isErr(result)).toBe(true);
    });

    test('createPasswordlessUser requires email or phone', async () => {
      const result = await adapter.createPasswordlessUser({});

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('email or phoneNumber');
      }
    });

    test('signIn requires initialization', async () => {
      await adapter.destroy();
      adapter = createSuperTokensAdapter();

      const result = await adapter.signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(isErr(result)).toBe(true);
    });
  });

  describe('Session Operations (Unit Tests)', () => {
    beforeEach(async () => {
      await adapter.init({
        connectionURI: 'http://localhost:3567',
      });
    });

    test('createSession requires initialization', async () => {
      await adapter.destroy();
      adapter = createSuperTokensAdapter();

      const result = await adapter.createSession({
        userId: 'user_123',
      });

      expect(isErr(result)).toBe(true);
    });

    test('verifySession requires initialization', async () => {
      await adapter.destroy();
      adapter = createSuperTokensAdapter();

      const result = await adapter.verifySession({
        sessionHandle: 'session_123',
      });

      expect(isErr(result)).toBe(true);
    });
  });
});
