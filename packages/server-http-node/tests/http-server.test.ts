import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createHTTPServer } from '../src/index.js';

describe('HTTPServerAdapter', () => {
  let server: ReturnType<typeof createHTTPServer>;
  const TEST_PORT = 9878;

  beforeEach(() => {
    server = createHTTPServer();
  });

  afterEach(async () => {
    await server.destroy();
  });

  test('initializes with valid config', async () => {
    const result = await server.init({ port: TEST_PORT });
    expect(isOk(result)).toBe(true);
  });

  test('fails to initialize without port', async () => {
    const result = await server.init({ port: 0 });
    expect(isOk(result)).toBe(false);
  });

  test('starts and stops server', async () => {
    await server.init({ port: TEST_PORT });

    const startResult = await server.start();
    expect(isOk(startResult)).toBe(true);

    const healthResult = await server.health();
    expect(isOk(healthResult)).toBe(true);
    if (isOk(healthResult)) {
      expect(healthResult.value).toBe(true);
    }

    const stopResult = await server.stop();
    expect(isOk(stopResult)).toBe(true);
  });

  test('handles GET requests', async () => {
    await server.init({ port: TEST_PORT });

    server.onRequest((request) => {
      expect(request.method).toBe('GET');
      expect(request.url).toBe('/test');
      return {
        statusCode: 200,
        body: 'Hello World',
      };
    });

    await server.start();

    const response = await fetch(`http://localhost:${TEST_PORT}/test`);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('Hello World');
  });

  test('handles POST requests with body', async () => {
    await server.init({ port: TEST_PORT });

    server.onRequest((request) => {
      expect(request.method).toBe('POST');
      expect(request.body.toString()).toBe('test data');
      return {
        statusCode: 201,
        body: 'Created',
      };
    });

    await server.start();

    const response = await fetch(`http://localhost:${TEST_PORT}/test`, {
      method: 'POST',
      body: 'test data',
    });
    expect(response.status).toBe(201);
    expect(await response.text()).toBe('Created');
  });

  test('handles query parameters', async () => {
    await server.init({ port: TEST_PORT });

    server.onRequest((request) => {
      expect(request.query.name).toBe('test');
      expect(request.query.value).toBe('123');
      return {
        statusCode: 200,
        body: JSON.stringify(request.query),
      };
    });

    await server.start();

    const response = await fetch(`http://localhost:${TEST_PORT}/test?name=test&value=123`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.name).toBe('test');
    expect(data.value).toBe('123');
  });

  test('handles custom headers', async () => {
    await server.init({ port: TEST_PORT });

    server.onRequest((request) => {
      expect(request.headers['x-custom']).toBe('test');
      return {
        statusCode: 200,
        headers: {
          'x-response': 'custom',
          'content-type': 'text/plain',
        },
        body: 'OK',
      };
    });

    await server.start();

    const response = await fetch(`http://localhost:${TEST_PORT}/test`, {
      headers: {
        'x-custom': 'test',
      },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('x-response')).toBe('custom');
  });

  test('handles JSON responses', async () => {
    await server.init({ port: TEST_PORT });

    server.onRequest(() => {
      return {
        statusCode: 200,
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ message: 'Hello', value: 42 }),
      };
    });

    await server.start();

    const response = await fetch(`http://localhost:${TEST_PORT}/test`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe('Hello');
    expect(data.value).toBe(42);
  });

  test('returns 404 when no handler is set', async () => {
    await server.init({ port: TEST_PORT });
    await server.start();

    const response = await fetch(`http://localhost:${TEST_PORT}/test`);
    expect(response.status).toBe(404);
  });

  test('tracks active requests', async () => {
    await server.init({ port: TEST_PORT });

    server.onRequest(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        statusCode: 200,
        body: 'OK',
      };
    });

    await server.start();

    // Start request but don't wait
    fetch(`http://localhost:${TEST_PORT}/test`);

    // Check active requests shortly after
    await new Promise(resolve => setTimeout(resolve, 10));
    const activeResult = await server.getActiveRequests();
    expect(isOk(activeResult)).toBe(true);

    // Wait for request to complete
    await new Promise(resolve => setTimeout(resolve, 200));
  });
});
