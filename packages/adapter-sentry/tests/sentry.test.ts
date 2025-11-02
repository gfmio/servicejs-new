import { describe, test, expect } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createSentryAdapter } from '../src/index.js';

describe('SentryAdapter', () => {
  test('initializes with config', async () => {
    const adapter = createSentryAdapter();
    const result = await adapter.init({
      dsn: 'https://example@sentry.io/123456',
      environment: 'test',
      release: '1.0.0'
    });

    expect(isOk(result)).toBe(true);
  });

  test('captures error', async () => {
    const adapter = createSentryAdapter();
    await adapter.init({ dsn: 'https://example@sentry.io/123456' });

    const error = new Error('Test error');
    const result = await adapter.captureError(error, { component: 'test' });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(typeof result.value).toBe('string'); // Event ID
    }
  });

  test('captures message with severity', async () => {
    const adapter = createSentryAdapter();
    await adapter.init({ dsn: 'https://example@sentry.io/123456' });

    const result = await adapter.captureMessage('Test message', 'warning', { test: 'true' });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(typeof result.value).toBe('string'); // Event ID
    }
  });

  test('sets user context', async () => {
    const adapter = createSentryAdapter();
    await adapter.init({ dsn: 'https://example@sentry.io/123456' });

    const result = await adapter.setUser({
      id: '123',
      email: 'user@example.com',
      username: 'testuser'
    });

    expect(isOk(result)).toBe(true);
  });

  test('adds breadcrumbs', async () => {
    const adapter = createSentryAdapter();
    await adapter.init({ dsn: 'https://example@sentry.io/123456' });

    const result = await adapter.addBreadcrumb({
      message: 'User clicked button',
      category: 'ui',
      level: 'info'
    });

    expect(isOk(result)).toBe(true);
  });

  test('starts and finishes transaction', async () => {
    const adapter = createSentryAdapter();
    await adapter.init({ dsn: 'https://example@sentry.io/123456' });

    const txResult = await adapter.startTransaction('api.request', 'http', {
      endpoint: '/api/users'
    });

    expect(isOk(txResult)).toBe(true);
    if (isOk(txResult)) {
      const transaction = txResult.value;
      expect(transaction.name).toBe('api.request');
      expect(transaction.op).toBe('http');

      const finishResult = await adapter.finishTransaction(transaction.id);
      expect(isOk(finishResult)).toBe(true);
    }
  });

  test('starts and finishes span', async () => {
    const adapter = createSentryAdapter();
    await adapter.init({ dsn: 'https://example@sentry.io/123456' });

    const txResult = await adapter.startTransaction('db.query', 'db');
    if (!isOk(txResult)) throw txResult.error;

    const spanResult = await adapter.startSpan(txResult.value.id, 'db.query', 'SELECT * FROM users');

    expect(isOk(spanResult)).toBe(true);
    if (isOk(spanResult)) {
      const span = spanResult.value;
      expect(span.op).toBe('db.query');
      expect(span.description).toBe('SELECT * FROM users');

      const finishResult = await adapter.finishSpan(span.id);
      expect(isOk(finishResult)).toBe(true);
    }
  });

  test('retrieves events', async () => {
    const adapter = createSentryAdapter();
    await adapter.init({ dsn: 'https://example@sentry.io/123456' });

    // Capture some events
    await adapter.captureError(new Error('Error 1'));
    await adapter.captureMessage('Message 1', 'info');
    await adapter.captureError(new Error('Error 2'));

    const result = await adapter.getEvents();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.length).toBe(3);
    }
  });
});
