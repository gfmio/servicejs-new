import { describe, test, expect, beforeEach } from 'bun:test';
import { createOllamaAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

describe('OllamaAdapter', () => {
  let adapter: ReturnType<typeof createOllamaAdapter>;

  beforeEach(() => {
    adapter = createOllamaAdapter();
  });

  test('should initialize', async () => {
    const result = await adapter.init({});
    expect(isOk(result)).toBe(true);
  });

  test('should generate text', async () => {
    await adapter.init({});
    await adapter.start();
    const result = await adapter.generate('llama2', 'Test prompt');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) expect(result.value).toContain('llama2');
  });

  test('should chat', async () => {
    await adapter.init({});
    await adapter.start();
    const result = await adapter.chat('llama2', [{ role: 'user', content: 'Hi' }]);
    expect(isOk(result)).toBe(true);
  });

  test('should get embeddings', async () => {
    await adapter.init({});
    await adapter.start();
    const result = await adapter.embeddings('llama2', 'text');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) expect(result.value.length).toBe(384);
  });

  test('should list models', async () => {
    await adapter.init({});
    await adapter.start();
    const result = await adapter.listModels();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) expect(result.value.length).toBeGreaterThan(0);
  });

  test('should show model', async () => {
    await adapter.init({});
    await adapter.start();
    const result = await adapter.showModel('llama2');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) expect(result.value.name).toBe('llama2');
  });
});
