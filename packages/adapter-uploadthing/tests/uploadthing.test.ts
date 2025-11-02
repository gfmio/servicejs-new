import { describe, test, expect } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createUploadThingAdapter } from '../src/index.js';

describe('UploadThingAdapter', () => {
  test('initializes with valid config', async () => {
    const adapter = createUploadThingAdapter();
    const result = await adapter.init({
      apiKey: 'test-key',
      appId: 'test-app',
    });

    expect(isOk(result)).toBe(true);
  });

  test('uploads file and returns result', async () => {
    const adapter = createUploadThingAdapter();
    await adapter.init({ apiKey: 'test-key', appId: 'test-app' });

    const file = Buffer.from('test file data');
    const result = await adapter.upload(file, 'test.txt');

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.name).toBe('test.txt');
      expect(result.value.size).toBe(file.byteLength);
    }
  });
});
