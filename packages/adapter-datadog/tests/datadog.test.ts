import { describe, test, expect } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createDatadogAdapter } from '../src/index.js';

describe('DatadogAdapter', () => {
  test('initializes with config', async () => {
    const adapter = createDatadogAdapter();
    const result = await adapter.init({
      apiKey: 'test-api-key',
      appKey: 'test-app-key',
      site: 'datadoghq.com',
      service: 'test-service',
      env: 'test'
    });

    expect(isOk(result)).toBe(true);
  });

  test('sends metrics', async () => {
    const adapter = createDatadogAdapter();
    await adapter.init({ apiKey: 'test-key', service: 'test' });

    const result = await adapter.sendMetric('api.response_time', 125, 'gauge', {
      endpoint: '/api/users'
    });

    expect(isOk(result)).toBe(true);
  });

  test('increments counter', async () => {
    const adapter = createDatadogAdapter();
    await adapter.init({ apiKey: 'test-key' });

    const result = await adapter.increment('page.views', 1, { page: 'home' });

    expect(isOk(result)).toBe(true);
  });

  test('sends gauge metric', async () => {
    const adapter = createDatadogAdapter();
    await adapter.init({ apiKey: 'test-key' });

    const result = await adapter.gauge('system.cpu', 75.5);

    expect(isOk(result)).toBe(true);
  });

  test('logs messages at different levels', async () => {
    const adapter = createDatadogAdapter();
    await adapter.init({ apiKey: 'test-key', service: 'test' });

    const debugResult = await adapter.debug('Debug message', { key: 'value' });
    const infoResult = await adapter.info('Info message');
    const warnResult = await adapter.warn('Warning message');
    const errorResult = await adapter.error('Error message');

    expect(isOk(debugResult)).toBe(true);
    expect(isOk(infoResult)).toBe(true);
    expect(isOk(warnResult)).toBe(true);
    expect(isOk(errorResult)).toBe(true);
  });

  test('starts and finishes span', async () => {
    const adapter = createDatadogAdapter();
    await adapter.init({ apiKey: 'test-key' });

    const spanResult = await adapter.startSpan('db.query', 'myservice', 'SELECT *', {
      db: 'postgres'
    });

    expect(isOk(spanResult)).toBe(true);
    if (isOk(spanResult)) {
      const span = spanResult.value;
      expect(span.name).toBe('db.query');
      expect(span.service).toBe('myservice');

      const finishResult = await adapter.finishSpan(span.spanId);
      expect(isOk(finishResult)).toBe(true);
    }
  });

  test('retrieves metrics', async () => {
    const adapter = createDatadogAdapter();
    await adapter.init({ apiKey: 'test-key' });

    await adapter.gauge('metric1', 10);
    await adapter.gauge('metric2', 20);
    await adapter.increment('metric3');

    const result = await adapter.getMetrics();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.length).toBe(3);
    }
  });

  test('retrieves logs', async () => {
    const adapter = createDatadogAdapter();
    await adapter.init({ apiKey: 'test-key' });

    await adapter.info('Log 1');
    await adapter.warn('Log 2');
    await adapter.error('Log 3');

    const result = await adapter.getLogs();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.length).toBe(3);
    }
  });
});
