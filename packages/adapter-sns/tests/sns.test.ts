import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createSNSSMSAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('SNS SMS Adapter', () => {
  let adapter: ReturnType<typeof createSNSSMSAdapter>;

  beforeEach(() => {
    adapter = createSNSSMSAdapter();
  });

  afterEach(async () => {
    await adapter.destroy();
  });

  test('init with valid config', async () => {
    const result = await adapter.init({
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      region: 'us-east-1',
    });
    expect(isOk(result)).toBe(true);
  });

  test('init without required fields fails', async () => {
    const result = await adapter.init({
      accessKeyId: '',
      secretAccessKey: '',
      region: '',
    });
    expect(isErr(result)).toBe(true);
  });

  test('health when initialized', async () => {
    await adapter.init({
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      region: 'us-east-1',
    });

    const result = await adapter.health();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.status).toBe('healthy');
    }
  });

  test('send returns success', async () => {
    await adapter.init({
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      region: 'us-east-1',
    });

    const result = await adapter.send({
      to: '+1234567890',
      body: 'Test message',
    });

    if (isErr(result)) {
      console.error('Error:', result.error);
    }

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.success).toBe(true);
      expect(result.value.messageId).toBeDefined();
    }
  });
});
