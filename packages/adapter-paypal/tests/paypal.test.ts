import { describe, test, expect } from 'bun:test';
import { createPayPalAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('PayPal Adapter', () => {
  test('init with credentials', async () => {
    const adapter = createPayPalAdapter();
    const result = await adapter.init({ clientId: 'test', clientSecret: 'secret' });
    expect(isOk(result)).toBe(true);
    await adapter.destroy();
  });

  test('init without credentials fails', async () => {
    const adapter = createPayPalAdapter();
    const result = await adapter.init({ clientId: '', clientSecret: '' });
    expect(isErr(result)).toBe(true);
  });
});
