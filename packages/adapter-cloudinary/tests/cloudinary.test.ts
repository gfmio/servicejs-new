import { describe, test, expect } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createCloudinaryAdapter } from '../src/index.js';

describe('CloudinaryAdapter', () => {
  test('initializes with valid config', async () => {
    const adapter = createCloudinaryAdapter();
    const result = await adapter.init({
      cloudName: 'test-cloud',
      apiKey: 'test-key',
      apiSecret: 'test-secret',
    });

    expect(isOk(result)).toBe(true);
  });

  test('uploads file and returns result', async () => {
    const adapter = createCloudinaryAdapter();
    await adapter.init({
      cloudName: 'test-cloud',
      apiKey: 'test-key',
      apiSecret: 'test-secret',
    });

    const file = Buffer.from('test image data');
    const result = await adapter.upload(file, { publicId: 'test-image' });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.publicId).toBe('test-image');
      expect(result.value.url).toContain('test-cloud');
      expect(result.value.bytes).toBeGreaterThan(0);
    }
  });

  test('generates URL with transformations', () => {
    const adapter = createCloudinaryAdapter();
    adapter.init({
      cloudName: 'test-cloud',
      apiKey: 'test-key',
      apiSecret: 'test-secret',
    });

    const url = adapter.generateUrl('test-image', {
      width: 300,
      height: 200,
      crop: 'fill',
      quality: 'auto',
    });

    expect(url).toContain('test-cloud');
    expect(url).toContain('w_300');
    expect(url).toContain('h_200');
    expect(url).toContain('c_fill');
    expect(url).toContain('q_auto');
  });
});
