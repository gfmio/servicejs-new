import { describe, test, expect } from 'bun:test';
import { createSquareAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('Square Adapter', () => {
  test('init with access token', async () => {
    const adapter = createSquareAdapter();
    const result = await adapter.init({ accessToken: 'test-token' });
    expect(isOk(result)).toBe(true);
    await adapter.destroy();
  });

  test('init without token fails', async () => {
    const adapter = createSquareAdapter();
    const result = await adapter.init({ accessToken: '' });
    expect(isErr(result)).toBe(true);
  });
});
