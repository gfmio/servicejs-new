import { describe, test, expect } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createHTTPAdapter } from '../src/index.js';

describe('HTTPAdapter', () => {
  test('initializes with config', async () => {
    const adapter = createHTTPAdapter();
    const result = await adapter.init({
      baseURL: 'https://api.example.com',
      timeout: 5000,
    });

    expect(isOk(result)).toBe(true);
  });

  test('adds request interceptor', async () => {
    const adapter = createHTTPAdapter();
    await adapter.init({});

    let interceptorCalled = false;
    adapter.addRequestInterceptor((url, options) => {
      interceptorCalled = true;
      return { url, options };
    });

    expect(interceptorCalled).toBe(false); // Not called yet
  });
});
