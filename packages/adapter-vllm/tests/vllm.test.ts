import { describe, test, expect, beforeEach } from 'bun:test';
import { createVLLMAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

describe('VLLMAdapter', () => {
  let adapter: ReturnType<typeof createVLLMAdapter>;

  beforeEach(() => {
    adapter = createVLLMAdapter();
  });

  test('should initialize', async () => {
    const result = await adapter.init({ baseURL: 'http://localhost:8000' });
    expect(isOk(result)).toBe(true);
  });

  test('should complete', async () => {
    await adapter.init({ baseURL: 'http://localhost:8000' });
    await adapter.start();
    const result = await adapter.complete('Test prompt');
    expect(isOk(result)).toBe(true);
  });

  test('should chat', async () => {
    await adapter.init({ baseURL: 'http://localhost:8000' });
    await adapter.start();
    const result = await adapter.chat([{ role: 'user', content: 'Hi' }]);
    expect(isOk(result)).toBe(true);
  });

  test('should get embeddings', async () => {
    await adapter.init({ baseURL: 'http://localhost:8000' });
    await adapter.start();
    const result = await adapter.embeddings('test');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) expect(result.value.length).toBe(4096);
  });
});
