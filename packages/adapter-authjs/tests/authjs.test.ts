import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createAuthJSAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('Auth.js Adapter', () => {
  let adapter: ReturnType<typeof createAuthJSAdapter>;

  beforeEach(() => {
    adapter = createAuthJSAdapter();
  });

  afterEach(async () => {
    await adapter.destroy();
  });

  test('init with valid config', async () => {
    const result = await adapter.init({
      baseUrl: 'http://localhost:3000',
      secret: 'test-secret',
    });
    expect(isOk(result)).toBe(true);
  });

  test('init without required fields fails', async () => {
    const result = await adapter.init({
      baseUrl: '',
      secret: '',
    });
    expect(isErr(result)).toBe(true);
  });

  test('create and get user', async () => {
    await adapter.init({ baseUrl: 'http://localhost:3000', secret: 'secret' });

    const createResult = await adapter.createUser({
      email: 'test@example.com',
      name: 'Test User',
    });

    expect(isOk(createResult)).toBe(true);

    if (isOk(createResult)) {
      const getResult = await adapter.getUser(createResult.value.id);
      expect(isOk(getResult)).toBe(true);
      if (isOk(getResult)) {
        expect(getResult.value.email).toBe('test@example.com');
      }
    }
  });

  test('create session and get with user', async () => {
    await adapter.init({ baseUrl: 'http://localhost:3000', secret: 'secret' });

    const userResult = await adapter.createUser({ email: 'test@example.com' });
    if (!isOk(userResult)) throw new Error('User creation failed');

    const sessionResult = await adapter.createSession({
      userId: userResult.value.id,
      expires: new Date(Date.now() + 3600000),
    });

    expect(isOk(sessionResult)).toBe(true);

    if (isOk(sessionResult)) {
      const getResult = await adapter.getSessionAndUser(sessionResult.value.sessionToken);
      expect(isOk(getResult)).toBe(true);
      if (isOk(getResult)) {
        expect(getResult.value.user.id).toBe(userResult.value.id);
      }
    }
  });
});
