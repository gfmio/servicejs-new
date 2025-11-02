import { describe, test, expect, beforeEach } from 'bun:test';
import { createReplicateAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

describe('ReplicateAdapter', () => {
  let adapter: ReturnType<typeof createReplicateAdapter>;

  beforeEach(() => {
    adapter = createReplicateAdapter();
  });

  test('should initialize', async () => {
    const result = await adapter.init({ apiToken: 'test-token' });
    expect(isOk(result)).toBe(true);
    const health = await adapter.health();
    expect(isOk(health) && health.value).toBe(false);
    await adapter.start();
    const health2 = await adapter.health();
    expect(isOk(health2) && health2.value).toBe(true);
  });

  test('should create prediction', async () => {
    await adapter.init({ apiToken: 'test' });
    const result = await adapter.createPrediction('v1', { prompt: 'test' });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.status).toBe('succeeded');
      expect(result.value.id).toBeDefined();
    }
  });

  test('should get prediction', async () => {
    await adapter.init({ apiToken: 'test' });
    const create = await adapter.createPrediction('v1', {});
    if (isOk(create)) {
      const get = await adapter.getPrediction(create.value.id);
      expect(isOk(get)).toBe(true);
    }
  });

  test('should list predictions', async () => {
    await adapter.init({ apiToken: 'test' });
    await adapter.createPrediction('v1', {});
    const list = await adapter.listPredictions();
    expect(isOk(list)).toBe(true);
    if (isOk(list)) expect(list.value.length).toBeGreaterThan(0);
  });

  test('should get model', async () => {
    await adapter.init({ apiToken: 'test' });
    const result = await adapter.getModel('owner', 'name');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.owner).toBe('owner');
      expect(result.value.name).toBe('name');
    }
  });

  test('should run model', async () => {
    await adapter.init({ apiToken: 'test' });
    const result = await adapter.runModel('owner', 'model', { input: 'test' });
    expect(isOk(result)).toBe(true);
  });
});
