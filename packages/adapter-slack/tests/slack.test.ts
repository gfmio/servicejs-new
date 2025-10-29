import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createSlackAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('Slack Adapter', () => {
  let adapter: ReturnType<typeof createSlackAdapter>;

  beforeEach(() => {
    adapter = createSlackAdapter();
  });

  afterEach(async () => {
    await adapter.destroy();
  });

  test('init with bot token', async () => {
    const result = await adapter.init({
      botToken: 'xoxb-test-token',
    });
    expect(isOk(result)).toBe(true);
  });

  test('init with webhook URL', async () => {
    const result = await adapter.init({
      webhookUrl: 'https://hooks.slack.com/services/TEST/WEBHOOK',
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
    await adapter.init({ webhookUrl: 'https://hooks.slack.com/test' });
    const result = await adapter.health();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.status).toBe('healthy');
    }
  });

  test('postMessage without init fails', async () => {
    const result = await adapter.postMessage({
      channel: 'C1234567890',
      text: 'Hello World',
    });
    expect(isErr(result)).toBe(true);
  });

  test('updateMessage without init fails', async () => {
    const result = await adapter.updateMessage('C1234567890', '1234567890.123456', 'Updated');
    expect(isErr(result)).toBe(true);
  });

  test('deleteMessage without init fails', async () => {
    const result = await adapter.deleteMessage('C1234567890', '1234567890.123456');
    expect(isErr(result)).toBe(true);
  });

  test('addReaction without init fails', async () => {
    const result = await adapter.addReaction('C1234567890', '1234567890.123456', 'thumbsup');
    expect(isErr(result)).toBe(true);
  });

  test('removeReaction without init fails', async () => {
    const result = await adapter.removeReaction('C1234567890', '1234567890.123456', 'thumbsup');
    expect(isErr(result)).toBe(true);
  });

  test('getChannel without init fails', async () => {
    const result = await adapter.getChannel('C1234567890');
    expect(isErr(result)).toBe(true);
  });

  test('listChannels without init fails', async () => {
    const result = await adapter.listChannels();
    expect(isErr(result)).toBe(true);
  });

  test('createChannel without init fails', async () => {
    const result = await adapter.createChannel('test-channel');
    expect(isErr(result)).toBe(true);
  });

  test('archiveChannel without init fails', async () => {
    const result = await adapter.archiveChannel('C1234567890');
    expect(isErr(result)).toBe(true);
  });

  test('inviteToChannel without init fails', async () => {
    const result = await adapter.inviteToChannel('C1234567890', ['U1234567890']);
    expect(isErr(result)).toBe(true);
  });

  test('getUser without init fails', async () => {
    const result = await adapter.getUser('U1234567890');
    expect(isErr(result)).toBe(true);
  });

  test('listUsers without init fails', async () => {
    const result = await adapter.listUsers();
    expect(isErr(result)).toBe(true);
  });

  test('postWebhook without webhook URL fails', async () => {
    await adapter.init({ botToken: 'xoxb-test' });
    const result = await adapter.postWebhook({ text: 'Hello' });
    expect(isErr(result)).toBe(true);
  });

  test('start and stop lifecycle', async () => {
    await adapter.init({ webhookUrl: 'https://hooks.slack.com/test' });

    const startResult = await adapter.start();
    expect(isOk(startResult)).toBe(true);

    const stopResult = await adapter.stop();
    expect(isOk(stopResult)).toBe(true);
  });

  test('destroy clears config', async () => {
    await adapter.init({ botToken: 'xoxb-test' });
    await adapter.destroy();

    const result = await adapter.health();
    if (isOk(result)) {
      expect(result.value.status).toBe('unhealthy');
    }
  });
});
