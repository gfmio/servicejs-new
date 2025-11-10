import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createHTTPServer, type HTTPServerAdapter } from '../src/index';

const TEST_PORT = 9002;

describe('HTTP Server (Bun)', () => {
  let server: HTTPServerAdapter;

  beforeEach(() => {
    server = createHTTPServer();
  });

  afterEach(async () => {
    await server.destroy();
    await new Promise((resolve) => setTimeout(resolve, 200)); // Allow port to be released
  });

  test('initializes with configuration', async () => {
    const result = await server.init({ port: TEST_PORT });
    expect(isOk(result)).toBe(true);
  });

  test('starts and stops successfully', async () => {
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

    server.onRequest((request) => ({
      statusCode: 200,
      body: `Hello, ${request.method}`,
    }));

    await server.start();

    const response = await fetch(`http://localhost:${TEST_PORT}/test`);
    expect(response.status).toBe(200);

    const text = await response.text();
    expect(text).toBe('Hello, GET');
  });

  test('handles POST requests with body', async () => {
    await server.init({ port: TEST_PORT });

    server.onRequest((request) => ({
      statusCode: 200,
      body: `Received: ${request.body}`,
    }));

    await server.start();

    const response = await fetch(`http://localhost:${TEST_PORT}/test`, {
      method: 'POST',
      body: 'test data',
    });

    const text = await response.text();
    expect(text).toBe('Received: test data');
  });

  test('parses query parameters', async () => {
    await server.init({ port: TEST_PORT });

    server.onRequest((request) => ({
      statusCode: 200,
      body: JSON.stringify(request.query),
    }));

    await server.start();

    const response = await fetch(`http://localhost:${TEST_PORT}/test?foo=bar&baz=qux`);
    const json = await response.json();

    expect(json.foo).toBe('bar');
    expect(json.baz).toBe('qux');
  });

  test('handles custom headers', async () => {
    await server.init({ port: TEST_PORT });

    server.onRequest((request) => ({
      statusCode: 200,
      headers: {
        'X-Custom-Header': 'custom-value',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ headerReceived: request.headers['x-test-header'] }),
    }));

    await server.start();

    const response = await fetch(`http://localhost:${TEST_PORT}/test`, {
      headers: {
        'X-Test-Header': 'test-value',
      },
    });

    expect(response.headers.get('X-Custom-Header')).toBe('custom-value');

    const json = await response.json();
    expect(json.headerReceived).toBe('test-value');
  });

  test('handles different status codes', async () => {
    await server.init({ port: TEST_PORT });

    server.onRequest((request) => {
      if (request.url === '/not-found') {
        return {
          statusCode: 404,
          body: 'Not Found',
        };
      }

      return {
        statusCode: 200,
        body: 'OK',
      };
    });

    await server.start();

    const response1 = await fetch(`http://localhost:${TEST_PORT}/test`);
    expect(response1.status).toBe(200);

    const response2 = await fetch(`http://localhost:${TEST_PORT}/not-found`);
    expect(response2.status).toBe(404);
  });

  test('handles errors gracefully', async () => {
    await server.init({ port: TEST_PORT });

    let errorCaught = false;
    server.onError((error) => {
      errorCaught = true;
    });

    server.onRequest(() => {
      throw new Error('Test error');
    });

    await server.start();

    const response = await fetch(`http://localhost:${TEST_PORT}/test`);
    expect(response.status).toBe(500);
    expect(errorCaught).toBe(true);
  });

  test('handles JSON responses', async () => {
    await server.init({ port: TEST_PORT });

    server.onRequest((request) => ({
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ method: request.method, url: request.url }),
    }));

    await server.start();

    const response = await fetch(`http://localhost:${TEST_PORT}/api/test`);
    const json = await response.json();

    expect(json.method).toBe('GET');
    expect(json.url).toBe('/api/test');
  });
});
