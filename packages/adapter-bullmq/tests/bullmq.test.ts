import { describe, test, expect, beforeEach } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createBullMQAdapter } from '../src/index.js';

describe('BullMQAdapter', () => {
  let adapter: ReturnType<typeof createBullMQAdapter>;

  beforeEach(() => {
    adapter = createBullMQAdapter();
  });

  test('initializes with valid config', async () => {
    const result = await adapter.init({
      redis: {
        host: 'localhost',
        port: 6379,
      },
      queueName: 'test-queue',
    });

    expect(isOk(result)).toBe(true);
  });

  test('fails to initialize without redis host', async () => {
    const result = await adapter.init({
      redis: {
        host: '',
        port: 6379,
      },
      queueName: 'test-queue',
    });

    expect(isOk(result)).toBe(false);
  });

  test('fails to initialize without queue name', async () => {
    const result = await adapter.init({
      redis: {
        host: 'localhost',
        port: 6379,
      },
      queueName: '',
    });

    expect(isOk(result)).toBe(false);
  });

  test('health check returns true when initialized and running', async () => {
    await adapter.init({
      redis: { host: 'localhost', port: 6379 },
      queueName: 'test-queue',
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

  test('can add a job', async () => {
    await adapter.init({
      redis: { host: 'localhost', port: 6379 },
      queueName: 'test-queue',
    });
    await adapter.start();

    const result = await adapter.addJob('send-email', {
      to: 'user@example.com',
      subject: 'Hello',
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.name).toBe('send-email');
      expect(result.value.data.to).toBe('user@example.com');
      expect(result.value.id).toBeDefined();
    }
  });

  test('can get job by id', async () => {
    await adapter.init({
      redis: { host: 'localhost', port: 6379 },
      queueName: 'test-queue',
    });
    await adapter.start();

    const addResult = await adapter.addJob('test-job', { value: 42 });
    expect(isOk(addResult)).toBe(true);

    if (isOk(addResult)) {
      const getResult = await adapter.getJob(addResult.value.id);

      expect(isOk(getResult)).toBe(true);
      if (isOk(getResult)) {
        expect(getResult.value?.name).toBe('test-job');
        expect(getResult.value?.data.value).toBe(42);
      }
    }
  });

  test('returns null for non-existent job', async () => {
    await adapter.init({
      redis: { host: 'localhost', port: 6379 },
      queueName: 'test-queue',
    });
    await adapter.start();

    const result = await adapter.getJob('non-existent');

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBeNull();
    }
  });

  test('can remove a job', async () => {
    await adapter.init({
      redis: { host: 'localhost', port: 6379 },
      queueName: 'test-queue',
    });
    await adapter.start();

    const addResult = await adapter.addJob('test-job', { value: 42 });
    expect(isOk(addResult)).toBe(true);

    if (isOk(addResult)) {
      const removeResult = await adapter.removeJob(addResult.value.id);
      expect(isOk(removeResult)).toBe(true);

      const getResult = await adapter.getJob(addResult.value.id);
      expect(isOk(getResult)).toBe(true);
      if (isOk(getResult)) {
        expect(getResult.value).toBeNull();
      }
    }
  });

  test('can register a job processor', async () => {
    await adapter.init({
      redis: { host: 'localhost', port: 6379 },
      queueName: 'test-queue',
    });
    await adapter.start();

    const result = await adapter.process('test-job', async (job) => {
      return { processed: true, data: job.data };
    });

    expect(isOk(result)).toBe(true);
  });

  test('can get job progress', async () => {
    await adapter.init({
      redis: { host: 'localhost', port: 6379 },
      queueName: 'test-queue',
    });
    await adapter.start();

    const addResult = await adapter.addJob('test-job', { value: 42 });
    expect(isOk(addResult)).toBe(true);

    if (isOk(addResult)) {
      const progressResult = await adapter.getJobProgress(addResult.value.id);

      expect(isOk(progressResult)).toBe(true);
      if (isOk(progressResult)) {
        expect(progressResult.value.jobId).toBe(addResult.value.id);
        expect(progressResult.value.status).toBeDefined();
      }
    }
  });

  test('can get job counts', async () => {
    await adapter.init({
      redis: { host: 'localhost', port: 6379 },
      queueName: 'test-queue',
    });
    await adapter.start();

    await adapter.addJob('job1', { value: 1 });
    await adapter.addJob('job2', { value: 2 });

    const countsResult = await adapter.getJobCounts();

    expect(isOk(countsResult)).toBe(true);
    if (isOk(countsResult)) {
      expect(countsResult.value.waiting).toBeGreaterThanOrEqual(0);
      expect(countsResult.value.active).toBeGreaterThanOrEqual(0);
      expect(countsResult.value.completed).toBeGreaterThanOrEqual(0);
      expect(countsResult.value.failed).toBeGreaterThanOrEqual(0);
      expect(countsResult.value.delayed).toBeGreaterThanOrEqual(0);
    }
  });

  test('can pause and resume queue', async () => {
    await adapter.init({
      redis: { host: 'localhost', port: 6379 },
      queueName: 'test-queue',
    });
    await adapter.start();

    const pauseResult = await adapter.pause();
    expect(isOk(pauseResult)).toBe(true);

    const resumeResult = await adapter.resume();
    expect(isOk(resumeResult)).toBe(true);
  });

  test('can clean completed jobs', async () => {
    await adapter.init({
      redis: { host: 'localhost', port: 6379 },
      queueName: 'test-queue',
    });
    await adapter.start();

    const cleanResult = await adapter.clean(60000, 'completed');

    expect(isOk(cleanResult)).toBe(true);
    if (isOk(cleanResult)) {
      expect(typeof cleanResult.value).toBe('number');
    }
  });

  test('lifecycle methods work correctly', async () => {
    await adapter.init({
      redis: { host: 'localhost', port: 6379 },
      queueName: 'test-queue',
    });

    const startResult = await adapter.start();
    expect(isOk(startResult)).toBe(true);

    const stopResult = await adapter.stop();
    expect(isOk(stopResult)).toBe(true);

    const destroyResult = await adapter.destroy();
    expect(isOk(destroyResult)).toBe(true);
  });

  test('requires initialization before operations', async () => {
    const result = await adapter.addJob('test', {});

    expect(isOk(result)).toBe(false);
  });
});
