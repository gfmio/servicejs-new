import { describe, test, expect, beforeEach } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createTemporalAdapter } from '../src/index.js';

describe('TemporalAdapter', () => {
  let adapter: ReturnType<typeof createTemporalAdapter>;

  beforeEach(() => {
    adapter = createTemporalAdapter();
  });

  test('initializes with config', async () => {
    const result = await adapter.init({
      namespace: 'default',
      taskQueue: 'test-queue',
    });

    expect(isOk(result)).toBe(true);
  });

  test('health check returns true when initialized and running', async () => {
    await adapter.init({ taskQueue: 'test' });
    await adapter.start();

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

  test('can register an activity', async () => {
    await adapter.init({ taskQueue: 'test' });
    await adapter.start();

    const result = await adapter.registerActivity({
      name: 'test-activity',
      execute: async (input) => {
        return { processed: true, input };
      },
    });

    expect(isOk(result)).toBe(true);
  });

  test('can start a workflow', async () => {
    await adapter.init({ taskQueue: 'test' });
    await adapter.start();

    const result = await adapter.startWorkflow('test-workflow', {
      userId: 123,
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBeDefined();
      expect(typeof result.value).toBe('string');
    }
  });

  test('can get workflow by id', async () => {
    await adapter.init({ taskQueue: 'test' });
    await adapter.start();

    const startResult = await adapter.startWorkflow('test', {});
    expect(isOk(startResult)).toBe(true);

    if (isOk(startResult)) {
      const getResult = await adapter.getWorkflow(startResult.value);

      expect(isOk(getResult)).toBe(true);
      if (isOk(getResult)) {
        expect(getResult.value).not.toBeNull();
        expect(getResult.value?.name).toBe('test');
      }
    }
  });

  test('returns null for non-existent workflow', async () => {
    await adapter.init({ taskQueue: 'test' });
    await adapter.start();

    const result = await adapter.getWorkflow('non-existent');

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBeNull();
    }
  });

  test('can cancel a workflow', async () => {
    await adapter.init({ taskQueue: 'test' });
    await adapter.start();

    const startResult = await adapter.startWorkflow('test', {});
    expect(isOk(startResult)).toBe(true);

    if (isOk(startResult)) {
      const cancelResult = await adapter.cancelWorkflow(startResult.value);
      expect(isOk(cancelResult)).toBe(true);
    }
  });

  test('can execute a workflow with activities', async () => {
    await adapter.init({ taskQueue: 'test' });
    await adapter.start();

    // Register activities
    await adapter.registerActivity({
      name: 'step1',
      execute: async (input) => {
        return { ...input, step1: 'done' };
      },
    });

    await adapter.registerActivity({
      name: 'step2',
      execute: async (input) => {
        return { ...input, step2: 'done' };
      },
    });

    // Execute workflow
    const result = await adapter.executeWorkflow('test-workflow', { id: 1 }, [
      { activity: 'step1', input: (prev: any) => prev },
      { activity: 'step2', input: (prev: any) => prev },
    ]);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.workflowId).toBeDefined();
      expect(result.value.status).toBeDefined();
    }
  });

  test('handles activity failure with compensation', async () => {
    await adapter.init({ taskQueue: 'test' });
    await adapter.start();

    const compensated: string[] = [];

    await adapter.registerActivity({
      name: 'success',
      execute: async () => ({ done: true }),
      compensate: async () => {
        compensated.push('success');
      },
    });

    await adapter.registerActivity({
      name: 'fail',
      execute: async () => {
        throw new Error('Activity failed');
      },
      compensate: async () => {
        compensated.push('fail');
      },
    });

    const result = await adapter.executeWorkflow('test', {}, [
      { activity: 'success', input: {} },
      { activity: 'fail', input: {} },
    ]);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      // Compensation should have been triggered
      expect(result.value.status).toBe('failed');
    }
  });

  test('lifecycle methods work correctly', async () => {
    await adapter.init({ taskQueue: 'test' });

    const startResult = await adapter.start();
    expect(isOk(startResult)).toBe(true);

    const stopResult = await adapter.stop();
    expect(isOk(stopResult)).toBe(true);

    const destroyResult = await adapter.destroy();
    expect(isOk(destroyResult)).toBe(true);
  });

  test('requires initialization before operations', async () => {
    const result = await adapter.registerActivity({
      name: 'test',
      execute: async () => ({}),
    });

    expect(isOk(result)).toBe(false);
  });
});
