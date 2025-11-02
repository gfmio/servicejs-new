import { describe, test, expect } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createBunnyCDNAdapter } from '../src/index.js';

describe('BunnyCDNAdapter', () => {
  test('initializes with valid config', async () => {
    const adapter = createBunnyCDNAdapter();
    const result = await adapter.init({
      apiKey: 'test-key',
      storageZone: 'test-zone',
    });

    expect(isOk(result)).toBe(true);
  });

  test('uploads file and returns result', async () => {
    const adapter = createBunnyCDNAdapter();
    await adapter.init({ apiKey: 'test-key', storageZone: 'test-zone' });

    const file = Buffer.from('test file data');
    const result = await adapter.uploadFile('images/test.jpg', file);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.name).toBe('test.jpg');
      expect(result.value.path).toBe('images/test.jpg');
      expect(result.value.url).toContain('test-zone.b-cdn.net');
    }
  });

  test('gets CDN stats', async () => {
    const adapter = createBunnyCDNAdapter();
    await adapter.init({ apiKey: 'test-key' });

    const result = await adapter.getStats();

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.bandwidth).toBeGreaterThan(0);
      expect(result.value.cacheHitRate).toBeGreaterThan(0);
    }
  });
});
