import { describe, test, expect, beforeEach } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createGraphQLAdapter } from '../src/index.js';

describe('GraphQLAdapter', () => {
  let adapter: ReturnType<typeof createGraphQLAdapter>;

  beforeEach(() => {
    adapter = createGraphQLAdapter();
  });

  test('initializes with valid config', async () => {
    const result = await adapter.init({
      endpoint: 'https://api.example.com/graphql',
    });

    expect(isOk(result)).toBe(true);
  });

  test('fails to initialize without endpoint', async () => {
    const result = await adapter.init({
      endpoint: '',
    });

    expect(isOk(result)).toBe(false);
  });

  test('health check returns false when not initialized', async () => {
    const health = await adapter.health();

    expect(isOk(health)).toBe(true);
    if (isOk(health)) {
      expect(health.value).toBe(false);
    }
  });

  test('query requires initialization', async () => {
    const result = await adapter.query('{ __typename }');

    expect(isOk(result)).toBe(false);
  });

  test('mutation requires initialization', async () => {
    const result = await adapter.mutate('mutation { test }');

    expect(isOk(result)).toBe(false);
  });

  test('subscription requires initialization', async () => {
    const result = await adapter.subscribe(
      'subscription { test }',
      {},
      () => {}
    );

    expect(isOk(result)).toBe(false);
  });

  test('lifecycle methods work correctly', async () => {
    await adapter.init({ endpoint: 'https://api.example.com/graphql' });

    const startResult = await adapter.start();
    expect(isOk(startResult)).toBe(true);

    const stopResult = await adapter.stop();
    expect(isOk(stopResult)).toBe(true);

    const destroyResult = await adapter.destroy();
    expect(isOk(destroyResult)).toBe(true);
  });

  test('subscription unsubscribe works', async () => {
    await adapter.init({ endpoint: 'https://api.example.com/graphql' });

    let called = false;
    const callback = () => { called = true; };

    const subscribeResult = await adapter.subscribe(
      'subscription { test }',
      {},
      callback
    );

    expect(isOk(subscribeResult)).toBe(true);

    if (isOk(subscribeResult)) {
      const unsubscribe = subscribeResult.value;
      unsubscribe();
      expect(called).toBe(false);
    }
  });
});
