import { describe, test, expect, beforeEach } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createTRPCAdapter } from '../src/index.js';

describe('TRPCAdapter', () => {
  let adapter: ReturnType<typeof createTRPCAdapter>;

  beforeEach(() => {
    adapter = createTRPCAdapter();
  });

  test('initializes with valid config', async () => {
    const result = await adapter.init({
      url: 'http://localhost:3000/trpc',
    });

    expect(isOk(result)).toBe(true);
  });

  test('fails to initialize without URL', async () => {
    const result = await adapter.init({
      url: '',
    });

    expect(isOk(result)).toBe(false);
  });

  test('health check returns true when initialized', async () => {
    await adapter.init({ url: 'http://localhost:3000/trpc' });
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

  test('query requires initialization', async () => {
    const result = await adapter.query('user.get', { id: '123' });

    expect(isOk(result)).toBe(false);
  });

  test('mutation requires initialization', async () => {
    const result = await adapter.mutate('user.create', { name: 'John' });

    expect(isOk(result)).toBe(false);
  });

  test('subscription requires initialization', async () => {
    const result = await adapter.subscribe('user.onChange', { id: '123' }, () => {});

    expect(isOk(result)).toBe(false);
  });

  test('lifecycle methods work correctly', async () => {
    await adapter.init({ url: 'http://localhost:3000/trpc' });

    const startResult = await adapter.start();
    expect(isOk(startResult)).toBe(true);

    const stopResult = await adapter.stop();
    expect(isOk(stopResult)).toBe(true);

    const destroyResult = await adapter.destroy();
    expect(isOk(destroyResult)).toBe(true);
  });

  test('subscription unsubscribe works', async () => {
    await adapter.init({ url: 'http://localhost:3000/trpc' });

    let called = false;
    const callback = () => { called = true; };

    const subscribeResult = await adapter.subscribe('user.onChange', { id: '123' }, callback);

    expect(isOk(subscribeResult)).toBe(true);

    if (isOk(subscribeResult)) {
      const unsubscribe = subscribeResult.value;
      unsubscribe();
      expect(called).toBe(false);
    }
  });
});
