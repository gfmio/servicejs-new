import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createLuciaAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('Lucia Adapter', () => {
  let adapter: ReturnType<typeof createLuciaAdapter>;

  beforeEach(() => {
    adapter = createLuciaAdapter();
  });

  afterEach(async () => {
    await adapter.destroy();
  });

  test('init with default config', async () => {
    const result = await adapter.init();
    expect(isOk(result)).toBe(true);
  });

  test('init with custom config', async () => {
    const result = await adapter.init({
      sessionExpiresIn: 7 * 24 * 60 * 60 * 1000,
      sessionIdleTimeout: 15 * 60 * 1000,
    });
    expect(isOk(result)).toBe(true);
  });

  test('create and get user', async () => {
    await adapter.init();

    const createResult = await adapter.createUser({
      attributes: { email: 'test@example.com' },
    });

    expect(isOk(createResult)).toBe(true);

    if (isOk(createResult)) {
      const getResult = await adapter.getUser(createResult.value.id);
      expect(isOk(getResult)).toBe(true);
      if (isOk(getResult)) {
        expect(getResult.value.attributes.email).toBe('test@example.com');
      }
    }
  });

  test('create session and validate', async () => {
    await adapter.init();

    const userResult = await adapter.createUser({});
    if (!isOk(userResult)) throw new Error('User creation failed');

    const sessionResult = await adapter.createSession({
      userId: userResult.value.id,
    });

    expect(isOk(sessionResult)).toBe(true);

    if (isOk(sessionResult)) {
      const validateResult = await adapter.validateSession(sessionResult.value.id);
      expect(isOk(validateResult)).toBe(true);
      if (isOk(validateResult)) {
        expect(validateResult.value.user.id).toBe(userResult.value.id);
      }
    }
  });

  test('verify password', async () => {
    await adapter.init();

    const userResult = await adapter.createUser({
      key: {
        providerId: 'email',
        providerUserId: 'test@example.com',
        password: 'password123',
      },
    });

    if (!isOk(userResult)) throw new Error('User creation failed');

    const verifyResult = await adapter.verifyPassword('email', 'test@example.com', 'password123');
    expect(isOk(verifyResult)).toBe(true);
    if (isOk(verifyResult)) {
      expect(verifyResult.value).toBe(true);
    }

    const wrongPasswordResult = await adapter.verifyPassword('email', 'test@example.com', 'wrong');
    if (isOk(wrongPasswordResult)) {
      expect(wrongPasswordResult.value).toBe(false);
    }
  });
});
