import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createDiscordAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('Discord Adapter', () => {
  let adapter: ReturnType<typeof createDiscordAdapter>;

  beforeEach(() => {
    adapter = createDiscordAdapter();
  });

  afterEach(async () => {
    await adapter.destroy();
  });

  test('init with bot token', async () => {
    const result = await adapter.init({
      botToken: 'test-bot-token',
    });
    expect(isOk(result)).toBe(true);
  });

  test('init with webhook URL', async () => {
    const result = await adapter.init({
      webhookUrl: 'https://discord.com/api/webhooks/123/test',
    });
    expect(isOk(result)).toBe(true);
  });

  test('init without credentials fails', async () => {
    const result = await adapter.init({});
    expect(isErr(result)).toBe(true);
  });

  test('health check when not initialized', async () => {
    const result = await adapter.health();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.status).toBe('unhealthy');
    }
  });

  test('health check when initialized', async () => {
    await adapter.init({ webhookUrl: 'https://discord.com/test' });
    const result = await adapter.health();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.status).toBe('healthy');
    }
  });

  test('sendMessage without init fails', async () => {
    const result = await adapter.sendMessage('123456789', { content: 'Test' });
    expect(isErr(result)).toBe(true);
  });

  test('editMessage without init fails', async () => {
    const result = await adapter.editMessage('123456789', '987654321', 'Updated');
    expect(isErr(result)).toBe(true);
  });

  test('deleteMessage without init fails', async () => {
    const result = await adapter.deleteMessage('123456789', '987654321');
    expect(isErr(result)).toBe(true);
  });

  test('addReaction without init fails', async () => {
    const result = await adapter.addReaction('123456789', '987654321', '👍');
    expect(isErr(result)).toBe(true);
  });

  test('removeReaction without init fails', async () => {
    const result = await adapter.removeReaction('123456789', '987654321', '👍');
    expect(isErr(result)).toBe(true);
  });

  test('getChannel without init fails', async () => {
    const result = await adapter.getChannel('123456789');
    expect(isErr(result)).toBe(true);
  });

  test('getGuild without init fails', async () => {
    const result = await adapter.getGuild('123456789');
    expect(isErr(result)).toBe(true);
  });

  test('listGuildChannels without init fails', async () => {
    const result = await adapter.listGuildChannels('123456789');
    expect(isErr(result)).toBe(true);
  });

  test('getUser without init fails', async () => {
    const result = await adapter.getUser('123456789');
    expect(isErr(result)).toBe(true);
  });

  test('getCurrentUser without init fails', async () => {
    const result = await adapter.getCurrentUser();
    expect(isErr(result)).toBe(true);
  });

  test('sendWebhook without webhook URL fails', async () => {
    await adapter.init({ botToken: 'test' });
    const result = await adapter.sendWebhook({ content: 'Test' });
    expect(isErr(result)).toBe(true);
  });

  test('createInvite without init fails', async () => {
    const result = await adapter.createInvite('123456789');
    expect(isErr(result)).toBe(true);
  });

  test('start and stop lifecycle', async () => {
    await adapter.init({ webhookUrl: 'https://discord.com/test' });

    const startResult = await adapter.start();
    expect(isOk(startResult)).toBe(true);

    const stopResult = await adapter.stop();
    expect(isOk(stopResult)).toBe(true);
  });

  test('destroy clears config', async () => {
    await adapter.init({ botToken: 'test' });
    await adapter.destroy();

    const result = await adapter.health();
    if (isOk(result)) {
      expect(result.value.status).toBe('unhealthy');
    }
  });
});
