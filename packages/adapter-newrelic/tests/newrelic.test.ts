import { describe, test, expect } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createNewRelicAdapter } from '../src/index.js';

describe('NewRelicAdapter', () => {
  test('initializes with config', async () => {
    const adapter = createNewRelicAdapter();
    const result = await adapter.init({
      licenseKey: 'test-license-key',
      appName: 'test-app',
      environment: 'test'
    });

    expect(isOk(result)).toBe(true);
  });

  test('starts and ends transaction', async () => {
    const adapter = createNewRelicAdapter();
    await adapter.init({ licenseKey: 'test-key', appName: 'test' });

    const txResult = await adapter.startTransaction('web', '/api/users');
    expect(isOk(txResult)).toBe(true);

    if (isOk(txResult)) {
      const tx = txResult.value;
      expect(tx.type).toBe('web');
      expect(tx.name).toBe('/api/users');

      const endResult = await adapter.endTransaction(tx.id);
      expect(isOk(endResult)).toBe(true);
    }
  });

  test('adds transaction attributes', async () => {
    const adapter = createNewRelicAdapter();
    await adapter.init({ licenseKey: 'test-key', appName: 'test' });

    const txResult = await adapter.startTransaction('web', '/api/users');
    if (!isOk(txResult)) throw txResult.error;

    const attrResult = await adapter.addTransactionAttribute(txResult.value.id, 'userId', '123');
    expect(isOk(attrResult)).toBe(true);
  });

  test('starts and ends segment', async () => {
    const adapter = createNewRelicAdapter();
    await adapter.init({ licenseKey: 'test-key', appName: 'test' });

    const txResult = await adapter.startTransaction('web', '/api/users');
    if (!isOk(txResult)) throw txResult.error;

    const segmentResult = await adapter.startSegment(txResult.value.id, 'database query', 'datastore');
    expect(isOk(segmentResult)).toBe(true);

    if (isOk(segmentResult)) {
      const endResult = await adapter.endSegment(segmentResult.value.id);
      expect(isOk(endResult)).toBe(true);
    }
  });

  test('records metrics', async () => {
    const adapter = createNewRelicAdapter();
    await adapter.init({ licenseKey: 'test-key', appName: 'test' });

    const result = await adapter.recordMetric('Custom/ResponseTime', 125, { endpoint: '/api' });
    expect(isOk(result)).toBe(true);
  });

  test('records events', async () => {
    const adapter = createNewRelicAdapter();
    await adapter.init({ licenseKey: 'test-key', appName: 'test' });

    const result = await adapter.recordEvent('UserAction', {
      action: 'click',
      button: 'submit',
      userId: '123'
    });

    expect(isOk(result)).toBe(true);
  });

  test('notices errors', async () => {
    const adapter = createNewRelicAdapter();
    await adapter.init({ licenseKey: 'test-key', appName: 'test' });

    const error = new Error('Test error');
    const result = await adapter.noticeError(error, { context: 'test' });

    expect(isOk(result)).toBe(true);
  });

  test('retrieves data', async () => {
    const adapter = createNewRelicAdapter();
    await adapter.init({ licenseKey: 'test-key', appName: 'test' });

    // Create some data
    const txResult = await adapter.startTransaction('web', '/test');
    if (isOk(txResult)) {
      await adapter.endTransaction(txResult.value.id);
    }

    await adapter.recordMetric('test.metric', 100);
    await adapter.recordEvent('TestEvent', { test: true });
    await adapter.noticeError(new Error('Test'));

    const txs = await adapter.getTransactions();
    const metrics = await adapter.getMetrics();
    const events = await adapter.getEvents();
    const errors = await adapter.getErrors();

    expect(isOk(txs) && txs.value.length).toBe(1);
    expect(isOk(metrics) && metrics.value.length).toBe(1);
    expect(isOk(events) && events.value.length).toBe(1);
    expect(isOk(errors) && errors.value.length).toBe(1);
  });
});
