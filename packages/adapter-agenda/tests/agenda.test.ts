import { describe, test, expect, beforeEach } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createAgendaAdapter } from '../src/index.js';

describe('AgendaAdapter', () => {
  let adapter: ReturnType<typeof createAgendaAdapter>;

  beforeEach(() => {
    adapter = createAgendaAdapter();
  });

  test('initializes with valid config', async () => {
    const result = await adapter.init({
      mongodb: {
        url: 'mongodb://localhost:27017/test',
      },
    });

    expect(isOk(result)).toBe(true);
  });

  test('fails to initialize without MongoDB URL', async () => {
    const result = await adapter.init({
      mongodb: {
        url: '',
      },
    });

    expect(isOk(result)).toBe(false);
  });

  test('health check returns true when initialized and running', async () => {
    await adapter.init({
      mongodb: { url: 'mongodb://localhost:27017/test' },
    });
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

  test('can define a job', async () => {
    await adapter.init({
      mongodb: { url: 'mongodb://localhost:27017/test' },
    });
    await adapter.start();

    const result = await adapter.define('send-email', async (job) => {
      console.log('Processing:', job.name);
    });

    expect(isOk(result)).toBe(true);
  });

  test('can schedule a one-time job', async () => {
    await adapter.init({
      mongodb: { url: 'mongodb://localhost:27017/test' },
    });
    await adapter.start();

    await adapter.define('test-job', async () => {});

    const result = await adapter.schedule(new Date(), 'test-job', {
      message: 'test',
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.name).toBe('test-job');
      expect(result.value.data.message).toBe('test');
    }
  });

  test('can schedule a recurring job', async () => {
    await adapter.init({
      mongodb: { url: 'mongodb://localhost:27017/test' },
    });
    await adapter.start();

    await adapter.define('recurring-job', async () => {});

    const result = await adapter.scheduleEvery('every minute', 'recurring-job');

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.name).toBe('recurring-job');
      expect(result.value.schedule).toBe('every minute');
    }
  });

  test('can schedule a job to run now', async () => {
    await adapter.init({
      mongodb: { url: 'mongodb://localhost:27017/test' },
    });
    await adapter.start();

    await adapter.define('immediate-job', async () => {});

    const result = await adapter.now('immediate-job', { data: 'value' });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.name).toBe('immediate-job');
      expect(result.value.nextRunAt).toBeDefined();
    }
  });

  test('fails to schedule undefined job', async () => {
    await adapter.init({
      mongodb: { url: 'mongodb://localhost:27017/test' },
    });
    await adapter.start();

    const result = await adapter.schedule(new Date(), 'undefined-job');

    expect(isOk(result)).toBe(false);
  });

  test('can get jobs by query', async () => {
    await adapter.init({
      mongodb: { url: 'mongodb://localhost:27017/test' },
    });
    await adapter.start();

    await adapter.define('test-job', async () => {});
    await adapter.schedule(new Date(), 'test-job');
    await adapter.schedule(new Date(), 'test-job');

    const result = await adapter.getJobs({ name: 'test-job' });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.length).toBeGreaterThanOrEqual(2);
    }
  });

  test('can cancel jobs by query', async () => {
    await adapter.init({
      mongodb: { url: 'mongodb://localhost:27017/test' },
    });
    await adapter.start();

    await adapter.define('cancel-test', async () => {});
    await adapter.schedule(new Date(), 'cancel-test');
    await adapter.schedule(new Date(), 'cancel-test');

    const cancelResult = await adapter.cancel({ name: 'cancel-test' });

    expect(isOk(cancelResult)).toBe(true);
    if (isOk(cancelResult)) {
      expect(cancelResult.value).toBeGreaterThanOrEqual(2);
    }

    const getResult = await adapter.getJobs({ name: 'cancel-test' });
    expect(isOk(getResult)).toBe(true);
    if (isOk(getResult)) {
      expect(getResult.value.length).toBe(0);
    }
  });

  test('can pause and resume scheduling', async () => {
    await adapter.init({
      mongodb: { url: 'mongodb://localhost:27017/test' },
    });
    await adapter.start();

    const pauseResult = await adapter.pause();
    expect(isOk(pauseResult)).toBe(true);

    const resumeResult = await adapter.resume();
    expect(isOk(resumeResult)).toBe(true);
  });

  test('lifecycle methods work correctly', async () => {
    await adapter.init({
      mongodb: { url: 'mongodb://localhost:27017/test' },
    });

    const startResult = await adapter.start();
    expect(isOk(startResult)).toBe(true);

    const stopResult = await adapter.stop();
    expect(isOk(stopResult)).toBe(true);

    const destroyResult = await adapter.destroy();
    expect(isOk(destroyResult)).toBe(true);
  });

  test('requires initialization before operations', async () => {
    const result = await adapter.define('test', async () => {});

    expect(isOk(result)).toBe(false);
  });
});
