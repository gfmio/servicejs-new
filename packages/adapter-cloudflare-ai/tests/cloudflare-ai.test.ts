import { describe, test, expect, beforeEach } from 'bun:test';
import { createCloudflareAIAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

describe('CloudflareAIAdapter', () => {
  let adapter: ReturnType<typeof createCloudflareAIAdapter>;

  beforeEach(() => {
    adapter = createCloudflareAIAdapter();
  });

  test('should initialize', async () => {
    const result = await adapter.init({ accountId: 'test', apiToken: 'test' });
    expect(isOk(result)).toBe(true);
  });

  test('should generate text', async () => {
    await adapter.init({ accountId: 'test', apiToken: 'test' });
    await adapter.start();
    const result = await adapter.textGeneration('llama-2', 'test');
    expect(isOk(result)).toBe(true);
  });

  test('should classify text', async () => {
    await adapter.init({ accountId: 'test', apiToken: 'test' });
    await adapter.start();
    const result = await adapter.textClassification('I love this!');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) expect(result.value.length).toBeGreaterThan(0);
  });

  test('should translate', async () => {
    await adapter.init({ accountId: 'test', apiToken: 'test' });
    await adapter.start();
    const result = await adapter.translation('Hello', 'en', 'fr');
    expect(isOk(result)).toBe(true);
  });

  test('should get embeddings', async () => {
    await adapter.init({ accountId: 'test', apiToken: 'test' });
    await adapter.start();
    const result = await adapter.embeddings('test');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) expect(result.value.length).toBe(768);
  });
});
