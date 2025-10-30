import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createStripeAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('Stripe Adapter', () => {
  let adapter: ReturnType<typeof createStripeAdapter>;

  beforeEach(() => {
    adapter = createStripeAdapter();
  });

  afterEach(async () => {
    await adapter.destroy();
  });

  test('init with API key', async () => {
    const result = await adapter.init({ apiKey: 'sk_test_123' });
    expect(isOk(result)).toBe(true);
  });

  test('init without API key fails', async () => {
    const result = await adapter.init({ apiKey: '' });
    expect(isErr(result)).toBe(true);
  });

  test('health when initialized', async () => {
    await adapter.init({ apiKey: 'sk_test_123' });
    const result = await adapter.health();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.status).toBe('healthy');
    }
  });
});
