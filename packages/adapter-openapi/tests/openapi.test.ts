import { describe, test, expect, beforeEach } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createOpenAPIAdapter } from '../src/index.js';

describe('OpenAPIAdapter', () => {
  let adapter: ReturnType<typeof createOpenAPIAdapter>;

  beforeEach(() => {
    adapter = createOpenAPIAdapter();
  });

  test('initializes with valid config', async () => {
    const result = await adapter.init({
      baseURL: 'https://api.example.com',
    });

    expect(isOk(result)).toBe(true);
  });

  test('fails to initialize without baseURL', async () => {
    const result = await adapter.init({
      baseURL: '',
    });

    expect(isOk(result)).toBe(false);
  });

  test('health check returns true when initialized', async () => {
    await adapter.init({ baseURL: 'https://api.example.com' });
    const health = await adapter.health();

    expect(isOk(health)).toBe(true);
    if (isOk(health)) {
      expect(health.value).toBe(true);
    }
  });

  test('health check returns false when not initialized', async () => {
    const health = await adapter.health();

    expect(isOk(health)).toBe(true);
    if (isOk(health)) {
      expect(health.value).toBe(false);
    }
  });

  test('get requires initialization', async () => {
    const result = await adapter.get('/users');

    expect(isOk(result)).toBe(false);
  });

  test('post requires initialization', async () => {
    const result = await adapter.post('/users', { body: { name: 'John' } });

    expect(isOk(result)).toBe(false);
  });

  test('lifecycle methods work correctly', async () => {
    await adapter.init({ baseURL: 'https://api.example.com' });

    const startResult = await adapter.start();
    expect(isOk(startResult)).toBe(true);

    const stopResult = await adapter.stop();
    expect(isOk(stopResult)).toBe(true);

    const destroyResult = await adapter.destroy();
    expect(isOk(destroyResult)).toBe(true);
  });

  test('getSpec returns null when no spec loaded', async () => {
    await adapter.init({ baseURL: 'https://api.example.com' });

    const spec = adapter.getSpec();
    expect(spec).toBeNull();
  });

  test('getSpec returns spec when provided', async () => {
    const mockSpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
    };

    await adapter.init({
      baseURL: 'https://api.example.com',
      spec: mockSpec,
    });

    const spec = adapter.getSpec();
    expect(spec).toEqual(mockSpec);
  });
});
