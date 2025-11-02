import { describe, test, expect } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createWebhookAdapter } from '../src/index.js';

describe('WebhookAdapter', () => {
  test('initializes with config', async () => {
    const adapter = createWebhookAdapter();
    const result = await adapter.init({
      secret: 'test-secret',
      maxRetries: 3,
    });

    expect(isOk(result)).toBe(true);
  });

  test('generates signature', async () => {
    const adapter = createWebhookAdapter();
    await adapter.init({ secret: 'test-secret' });

    const payload = JSON.stringify({ event: 'test', data: { message: 'hello' } });
    const result = await adapter.generateSignature(payload);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.length).toBeGreaterThan(0);
    }
  });

  test('verifies signature', async () => {
    const adapter = createWebhookAdapter();
    await adapter.init({ secret: 'test-secret' });

    const payload = JSON.stringify({ event: 'test', data: { message: 'hello' } });
    const signatureResult = await adapter.generateSignature(payload);

    if (isOk(signatureResult)) {
      const verifyResult = await adapter.verifySignature(payload, signatureResult.value);
      expect(isOk(verifyResult)).toBe(true);
      if (isOk(verifyResult)) {
        expect(verifyResult.value).toBe(true);
      }
    }
  });
});
