/**
 * Auth0 Adapter Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createAuth0Adapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('Auth0 Adapter', () => {
  let adapter: ReturnType<typeof createAuth0Adapter>;

  beforeEach(() => {
    adapter = createAuth0Adapter();
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
        domain: 'test.auth0.com',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
      });

      expect(isOk(result)).toBe(true);
    });

    test('init with minimal config', async () => {
      const result = await adapter.init({
        domain: 'test.auth0.com',
        clientId: 'test-client-id',
      });

      expect(isOk(result)).toBe(true);
    });

    test('init with custom scope', async () => {
      const result = await adapter.init({
        domain: 'test.auth0.com',
        clientId: 'test-client-id',
        scope: 'openid profile email offline_access',
      });

      expect(isOk(result)).toBe(true);
    });

    test('start after init', async () => {
      await adapter.init({
        domain: 'test.auth0.com',
        clientId: 'test-client-id',
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
        domain: 'auth0.com', // Real domain for health check
        clientId: 'test-client-id',
      });

      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
    });

    test('health check when uninitialized', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('unhealthy');
      }
    });
  });

  describe('Authorization URLs', () => {
    beforeEach(async () => {
      await adapter.init({
        domain: 'test.auth0.com',
        clientId: 'test-client-id',
        scope: 'openid profile email',
      });
    });

    test('getAuthorizationUrl generates correct URL', () => {
      const url = adapter.getAuthorizationUrl('https://example.com/callback');

      expect(url).toContain('https://test.auth0.com/authorize');
      expect(url).toContain('response_type=code');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback');
      expect(url).toContain('scope=openid+profile+email');
    });

    test('getAuthorizationUrl with state parameter', () => {
      const url = adapter.getAuthorizationUrl(
        'https://example.com/callback',
        'random-state-123'
      );

      expect(url).toContain('state=random-state-123');
    });

    test('getAuthorizationUrl with audience', async () => {
      await adapter.destroy();
      adapter = createAuth0Adapter();
      await adapter.init({
        domain: 'test.auth0.com',
        clientId: 'test-client-id',
        audience: 'https://api.example.com',
      });

      const url = adapter.getAuthorizationUrl('https://example.com/callback');

      expect(url).toContain('audience=https%3A%2F%2Fapi.example.com');
    });

    test('getLogoutUrl generates correct URL', () => {
      const url = adapter.getLogoutUrl('https://example.com');

      expect(url).toContain('https://test.auth0.com/v2/logout');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('returnTo=https%3A%2F%2Fexample.com');
    });

    test('getLogoutUrl without returnTo', () => {
      const url = adapter.getLogoutUrl();

      expect(url).toContain('https://test.auth0.com/v2/logout');
      expect(url).toContain('client_id=test-client-id');
      expect(url).not.toContain('returnTo');
    });
  });

  describe('Token Verification', () => {
    beforeEach(async () => {
      await adapter.init({
        domain: 'test.auth0.com',
        clientId: 'test-client-id',
      });
    });

    test('verifyToken decodes valid JWT', async () => {
      // Simple JWT with header, payload, signature
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({
        sub: 'auth0|123',
        aud: 'test-client-id',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }));
      const signature = 'fake-signature';
      const token = `${header}.${payload}.${signature}`;

      const result = await adapter.verifyToken({ token });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.sub).toBe('auth0|123');
      }
    });

    test('verifyToken rejects expired token', async () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({
        sub: 'auth0|123',
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      }));
      const signature = 'fake-signature';
      const token = `${header}.${payload}.${signature}`;

      const result = await adapter.verifyToken({ token });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('expired');
      }
    });

    test('verifyToken validates audience', async () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({
        sub: 'auth0|123',
        aud: 'wrong-audience',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }));
      const signature = 'fake-signature';
      const token = `${header}.${payload}.${signature}`;

      const result = await adapter.verifyToken({
        token,
        audience: 'expected-audience',
      });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('audience');
      }
    });

    test('verifyToken rejects invalid format', async () => {
      const result = await adapter.verifyToken({ token: 'invalid-token' });

      expect(isErr(result)).toBe(true);
    });
  });

  describe('Authentication Operations (Unit Tests)', () => {
    beforeEach(async () => {
      await adapter.init({
        domain: 'test.auth0.com',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
      });
    });

    test('login requires initialization', async () => {
      await adapter.destroy();
      adapter = createAuth0Adapter();

      const result = await adapter.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('not initialized');
      }
    });

    test('signup requires initialization', async () => {
      await adapter.destroy();
      adapter = createAuth0Adapter();

      const result = await adapter.signup({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('not initialized');
      }
    });

    test('resetPassword requires initialization', async () => {
      await adapter.destroy();
      adapter = createAuth0Adapter();

      const result = await adapter.resetPassword({
        email: 'test@example.com',
      });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('not initialized');
      }
    });

    test('exchangeCode requires initialization', async () => {
      await adapter.destroy();
      adapter = createAuth0Adapter();

      const result = await adapter.exchangeCode('code', 'https://example.com/callback');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('not initialized');
      }
    });

    test('refreshToken requires client secret', async () => {
      await adapter.destroy();
      adapter = createAuth0Adapter();
      await adapter.init({
        domain: 'test.auth0.com',
        clientId: 'test-client-id',
        // No client secret
      });

      const result = await adapter.refreshToken('refresh-token');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('secret required');
      }
    });

    test('revokeToken requires client secret', async () => {
      await adapter.destroy();
      adapter = createAuth0Adapter();
      await adapter.init({
        domain: 'test.auth0.com',
        clientId: 'test-client-id',
        // No client secret
      });

      const result = await adapter.revokeToken('token');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('secret required');
      }
    });
  });

  describe('Management API Operations (Unit Tests)', () => {
    beforeEach(async () => {
      await adapter.init({
        domain: 'test.auth0.com',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
      });
    });

    test('getUser requires client secret', async () => {
      await adapter.destroy();
      adapter = createAuth0Adapter();
      await adapter.init({
        domain: 'test.auth0.com',
        clientId: 'test-client-id',
        // No client secret
      });

      const result = await adapter.getUser('auth0|123');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('secret required');
      }
    });

    test('updateUser requires client secret', async () => {
      await adapter.destroy();
      adapter = createAuth0Adapter();
      await adapter.init({
        domain: 'test.auth0.com',
        clientId: 'test-client-id',
        // No client secret
      });

      const result = await adapter.updateUser({
        userId: 'auth0|123',
        name: 'New Name',
      });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('secret required');
      }
    });

    test('deleteUser requires client secret', async () => {
      await adapter.destroy();
      adapter = createAuth0Adapter();
      await adapter.init({
        domain: 'test.auth0.com',
        clientId: 'test-client-id',
        // No client secret
      });

      const result = await adapter.deleteUser('auth0|123');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('secret required');
      }
    });
  });

  // Note: Integration tests with real Auth0 tenant would be in a separate file
  // and marked with test.skip() or run conditionally with environment variables
});
