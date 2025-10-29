import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createPushAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('Push Adapter', () => {
  let adapter: ReturnType<typeof createPushAdapter>;

  beforeEach(() => {
    adapter = createPushAdapter();
  });

  afterEach(async () => {
    await adapter.destroy();
  });

  test('init with FCM', async () => {
    const result = await adapter.init({
      provider: 'fcm',
      fcm: { serverKey: 'test-key' },
    });
    expect(isOk(result)).toBe(true);
  });

  test('init with APNs', async () => {
    const result = await adapter.init({
      provider: 'apns',
      apns: { keyId: 'key', teamId: 'team', privateKey: 'private' },
    });
    expect(isOk(result)).toBe(true);
  });

  test('init without config fails', async () => {
    const result = await adapter.init({ provider: 'fcm' });
    expect(isErr(result)).toBe(true);
  });

  test('send without init fails', async () => {
    const result = await adapter.send({
      token: 'token',
      title: 'Test',
      body: 'Test',
    });
    expect(isErr(result)).toBe(true);
  });
});
