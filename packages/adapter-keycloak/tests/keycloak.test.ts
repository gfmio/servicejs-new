import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createKeycloakAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('Keycloak Adapter', () => {
  let adapter: ReturnType<typeof createKeycloakAdapter>;

  beforeEach(() => {
    adapter = createKeycloakAdapter();
  });

  afterEach(async () => {
    await adapter.destroy();
  });

  test('init with valid config', async () => {
    const result = await adapter.init({
      serverUrl: 'http://localhost:8080',
      realm: 'master',
      clientId: 'admin-cli',
      clientSecret: 'secret',
    });
    expect(isOk(result)).toBe(true);
  });

  test('init without required fields fails', async () => {
    const result = await adapter.init({
      serverUrl: '',
      realm: '',
      clientId: '',
      clientSecret: '',
    });
    expect(isErr(result)).toBe(true);
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
