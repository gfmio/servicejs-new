/**
 * Tests for fetch handler
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { createFetchHandler } from '../src/fetch-handler';
import { isOk } from '@servicejs/result';

interface MockEnv {
  TEST_VAR: string;
}

describe('Fetch Handler', () => {
  let handler: ReturnType<typeof createFetchHandler<MockEnv>>;

  beforeEach(async () => {
    handler = createFetchHandler<MockEnv>();
    await handler.init();
  });

  test('initializes successfully', async () => {
    const result = await handler.init();
    expect(isOk(result)).toBe(true);
  });

  test('handles fetch requests', async () => {
    handler.onFetch(async (request) => {
      return {
        statusCode: 200,
        body: 'Hello, World!',
        headers: { 'Content-Type': 'text/plain' },
      };
    });

    const request = new Request('https://example.com/');
    const env: MockEnv = { TEST_VAR: 'test' };
    const ctx: ExecutionContext = {
      waitUntil: () => {},
      passThroughOnException: () => {},
    };

    const response = await handler.handleFetch(request, env, ctx);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('Hello, World!');
    expect(response.headers.get('Content-Type')).toBe('text/plain');
  });

  test('parses URL correctly', async () => {
    handler.onFetch(async (request) => {
      // request.url contains pathname + search from WorkersHTTPRequest
      const [pathname, search] = request.url.split('?');
      return {
        statusCode: 200,
        body: JSON.stringify({
          pathname,
          search: search ? `?${search}` : '',
        }),
        headers: { 'Content-Type': 'application/json' },
      };
    });

    const request = new Request('https://example.com/api/users?id=123');
    const env: MockEnv = { TEST_VAR: 'test' };
    const ctx: ExecutionContext = {
      waitUntil: () => {},
      passThroughOnException: () => {},
    };

    const response = await handler.handleFetch(request, env, ctx);
    const data = await response.json();

    expect(data.pathname).toBe('/api/users');
    expect(data.search).toBe('?id=123');
  });

  test('handles request headers', async () => {
    handler.onFetch(async (request) => {
      return {
        statusCode: 200,
        body: JSON.stringify({
          authorization: request.headers.authorization,
          contentType: request.headers['content-type'],
        }),
        headers: { 'Content-Type': 'application/json' },
      };
    });

    const request = new Request('https://example.com/', {
      headers: {
        'Authorization': 'Bearer token',
        'Content-Type': 'application/json',
      },
    });

    const env: MockEnv = { TEST_VAR: 'test' };
    const ctx: ExecutionContext = {
      waitUntil: () => {},
      passThroughOnException: () => {},
    };

    const response = await handler.handleFetch(request, env, ctx);
    const data = await response.json();

    expect(data.authorization).toBe('Bearer token');
    expect(data.contentType).toBe('application/json');
  });

  test('handles request body', async () => {
    handler.onFetch(async (request) => {
      const body = JSON.parse(request.body as string);
      return {
        statusCode: 200,
        body: JSON.stringify({ received: body }),
        headers: { 'Content-Type': 'application/json' },
      };
    });

    const request = new Request('https://example.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    });

    const env: MockEnv = { TEST_VAR: 'test' };
    const ctx: ExecutionContext = {
      waitUntil: () => {},
      passThroughOnException: () => {},
    };

    const response = await handler.handleFetch(request, env, ctx);
    const data = await response.json();

    expect(data.received.name).toBe('Test');
  });

  test('handles errors with auto error response', async () => {
    await handler.init({ autoErrorResponse: true, errorStatusCode: 500 });

    handler.onFetch(async () => {
      throw new Error('Test error');
    });

    const request = new Request('https://example.com/');
    const env: MockEnv = { TEST_VAR: 'test' };
    const ctx: ExecutionContext = {
      waitUntil: () => {},
      passThroughOnException: () => {},
    };

    const response = await handler.handleFetch(request, env, ctx);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Test error');
  });

  test('calls error handler on errors', async () => {
    let errorCaught: Error | null = null;

    handler.onFetch(async () => {
      throw new Error('Test error');
    });

    handler.onError((error) => {
      errorCaught = error;
    });

    const request = new Request('https://example.com/');
    const env: MockEnv = { TEST_VAR: 'test' };
    const ctx: ExecutionContext = {
      waitUntil: () => {},
      passThroughOnException: () => {},
    };

    await handler.handleFetch(request, env, ctx);

    expect(errorCaught).toBeInstanceOf(Error);
    expect(errorCaught?.message).toBe('Test error');
  });

  test('provides access to environment', async () => {
    handler.onFetch(async (request, env) => {
      return {
        statusCode: 200,
        body: JSON.stringify({ testVar: env.TEST_VAR }),
        headers: { 'Content-Type': 'application/json' },
      };
    });

    const request = new Request('https://example.com/');
    const env: MockEnv = { TEST_VAR: 'my-value' };
    const ctx: ExecutionContext = {
      waitUntil: () => {},
      passThroughOnException: () => {},
    };

    const response = await handler.handleFetch(request, env, ctx);
    const data = await response.json();

    expect(data.testVar).toBe('my-value');
  });

  test('handles different HTTP methods', async () => {
    handler.onFetch(async (request) => {
      return {
        statusCode: 200,
        body: JSON.stringify({ method: request.method }),
        headers: { 'Content-Type': 'application/json' },
      };
    });

    const env: MockEnv = { TEST_VAR: 'test' };
    const ctx: ExecutionContext = {
      waitUntil: () => {},
      passThroughOnException: () => {},
    };

    for (const method of ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']) {
      const request = new Request('https://example.com/', { method });
      const response = await handler.handleFetch(request, env, ctx);
      const data = await response.json();

      expect(data.method).toBe(method);
    }
  });

  test('returns error when no handler registered', async () => {
    const request = new Request('https://example.com/');
    const env: MockEnv = { TEST_VAR: 'test' };
    const ctx: ExecutionContext = {
      waitUntil: () => {},
      passThroughOnException: () => {},
    };

    const response = await handler.handleFetch(request, env, ctx);

    expect(response.status).toBe(500);
    expect(await response.text()).toBe('No fetch handler registered');
  });
});
