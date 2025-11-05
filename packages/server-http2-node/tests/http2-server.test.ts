import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createHTTP2Server } from '../src/index.js';
import * as http2 from 'http2';

describe('HTTP2ServerAdapter', () => {
  let server: ReturnType<typeof createHTTP2Server>;
  const TEST_PORT = 9880;

  beforeEach(() => {
    server = createHTTP2Server();
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

  test('handles HTTP/2 requests', async (done) => {
    await server.init({ port: TEST_PORT });

    server.onRequest((request) => {
      expect(request.method).toBe('GET');
      expect(request.url).toBe('/test');
      return {
        statusCode: 200,
        body: 'Hello HTTP/2',
      };
    });

    await server.start();

    // Connect with HTTP/2 client
    const client = http2.connect(`http://localhost:${TEST_PORT}`);

    const req = client.request({
      ':path': '/test',
      ':method': 'GET',
    });

    let data = '';
    req.on('data', (chunk) => {
      data += chunk.toString();
    });

    req.on('end', () => {
      expect(data).toBe('Hello HTTP/2');
      client.close();
      done();
    });

    req.end();

    setTimeout(() => done(), 1000);
  });

  test('handles POST requests with body', async (done) => {
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

    const client = http2.connect(`http://localhost:${TEST_PORT}`);

    const req = client.request({
      ':path': '/test',
      ':method': 'POST',
    });

    req.write('test data');

    let data = '';
    req.on('data', (chunk) => {
      data += chunk.toString();
    });

    req.on('end', () => {
      expect(data).toBe('Created');
      client.close();
      done();
    });

    req.end();

    setTimeout(() => done(), 1000);
  });

  test('handles JSON responses', async (done) => {
    await server.init({ port: TEST_PORT });

    server.onRequest(() => {
      return {
        statusCode: 200,
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ message: 'Hello', version: 2 }),
      };
    });

    await server.start();

    const client = http2.connect(`http://localhost:${TEST_PORT}`);

    const req = client.request({
      ':path': '/test',
      ':method': 'GET',
    });

    let data = '';
    req.on('data', (chunk) => {
      data += chunk.toString();
    });

    req.on('end', () => {
      const parsed = JSON.parse(data);
      expect(parsed.message).toBe('Hello');
      expect(parsed.version).toBe(2);
      client.close();
      done();
    });

    req.end();

    setTimeout(() => done(), 1000);
  });

  test('handles query parameters', async (done) => {
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

    const client = http2.connect(`http://localhost:${TEST_PORT}`);

    const req = client.request({
      ':path': '/test?name=test&value=123',
      ':method': 'GET',
    });

    let data = '';
    req.on('data', (chunk) => {
      data += chunk.toString();
    });

    req.on('end', () => {
      const parsed = JSON.parse(data);
      expect(parsed.name).toBe('test');
      expect(parsed.value).toBe('123');
      client.close();
      done();
    });

    req.end();

    setTimeout(() => done(), 1000);
  });

  test('handles multiple concurrent streams', async (done) => {
    await server.init({ port: TEST_PORT });

    let requestCount = 0;
    server.onRequest((request) => {
      requestCount++;
      return {
        statusCode: 200,
        body: `Request ${requestCount}`,
      };
    });

    await server.start();

    const client = http2.connect(`http://localhost:${TEST_PORT}`);

    let completedRequests = 0;
    const totalRequests = 3;

    for (let i = 0; i < totalRequests; i++) {
      const req = client.request({
        ':path': `/test${i}`,
        ':method': 'GET',
      });

      req.on('end', () => {
        completedRequests++;
        if (completedRequests === totalRequests) {
          expect(requestCount).toBe(totalRequests);
          client.close();
          done();
        }
      });

      req.on('data', () => {}); // Consume data
      req.end();
    }

    setTimeout(() => done(), 1000);
  });

  test('tracks active streams', async () => {
    await server.init({ port: TEST_PORT });

    server.onRequest(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        statusCode: 200,
        body: 'OK',
      };
    });

    await server.start();

    const client = http2.connect(`http://localhost:${TEST_PORT}`);

    const req = client.request({
      ':path': '/test',
      ':method': 'GET',
    });

    // Check active streams shortly after request starts
    await new Promise(resolve => setTimeout(resolve, 10));
    const activeResult = await server.getActiveStreams();
    expect(isOk(activeResult)).toBe(true);

    req.on('data', () => {});
    req.on('end', () => {
      client.close();
    });
    req.end();

    // Wait for request to complete
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  test('returns 404 when no handler is set', async (done) => {
    await server.init({ port: TEST_PORT });
    await server.start();

    const client = http2.connect(`http://localhost:${TEST_PORT}`);

    const req = client.request({
      ':path': '/test',
      ':method': 'GET',
    });

    req.on('response', (headers) => {
      expect(headers[':status']).toBe(404);
      client.close();
      done();
    });

    req.on('data', () => {});
    req.end();

    setTimeout(() => done(), 1000);
  });
});
