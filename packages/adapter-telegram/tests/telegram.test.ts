import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createTelegramAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('Telegram Adapter', () => {
  let adapter: ReturnType<typeof createTelegramAdapter>;

  beforeEach(() => {
    adapter = createTelegramAdapter();
  });

  afterEach(async () => {
    await adapter.destroy();
  });

  test('init with bot token', async () => {
    const result = await adapter.init({ botToken: 'test-token' });
    expect(isOk(result)).toBe(true);
  });

  test('init without token fails', async () => {
    const result = await adapter.init({ botToken: '' });
    expect(isErr(result)).toBe(true);
  });

  test('health when not initialized', async () => {
    const result = await adapter.health();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.status).toBe('unhealthy');
    }
  });

  test('sendMessage without init fails', async () => {
    const result = await adapter.sendMessage({ chat_id: '123', text: 'Test' });
    expect(isErr(result)).toBe(true);
  });
});
