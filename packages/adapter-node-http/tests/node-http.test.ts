/**
 * Tests for Node.js HTTP Adapter
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { createNodeHttpAdapter } from '../src/node-http.js';
import { isOk, isErr } from '@servicejs/result';
import type { ServerAdapter } from '@servicejs/integration-server';

let adapter: ServerAdapter;

describe('Node.js HTTP Adapter', () => {
  beforeAll(() => {
    adapter = createNodeHttpAdapter();
  });

  afterAll(async () => {
    if (adapter) {
      await adapter.stop();
      await adapter.destroy();
    }
  });

  describe('Lifecycle', () => {
    test('should initialize with valid config', async () => {
      const result = await adapter.init({ port: 3100, hostname: 'localhost' });
      expect(isOk(result)).toBe(true);
    });

    test('should start after initialization', async () => {
      const result = await adapter.start();
      expect(isOk(result)).toBe(true);
    });

    test('should stop after starting', async () => {
      const result = await adapter.stop();
      expect(isOk(result)).toBe(true);
    });

    test('should destroy resources', async () => {
      const result = await adapter.destroy();
      expect(isOk(result)).toBe(true);

      // Re-initialize for other tests
      await adapter.init({ port: 3100, hostname: 'localhost' });
      await adapter.start();
    });
  });

  describe('Health Checks', () => {
    test('should report healthy when running', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }
    });
  });

  describe('HTTP Methods', () => {
    test('should handle GET request', async () => {
      adapter.onRequest?.(async (req) => {
        expect(req.method).toBe('GET');
        expect(req.url).toBe('/test');
        return {
          status: 200,
          headers: new Map([['content-type', 'text/plain']]),
          body: 'Hello World',
        };
      });

      const response = await fetch('http://localhost:3100/test');
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('Hello World');
    });

    test('should handle POST request with JSON', async () => {
      adapter.onRequest?.(async (req) => {
        expect(req.method).toBe('POST');
        expect(req.body).toEqual({ name: 'test' });
        return {
          status: 201,
          headers: new Map([['content-type', 'application/json']]),
          body: { success: true },
        };
      });

      const response = await fetch('http://localhost:3100/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test' }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toEqual({ success: true });
    });

    test('should handle PUT request', async () => {
      adapter.onRequest?.(async (req) => {
        expect(req.method).toBe('PUT');
        return {
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          body: { updated: true },
        };
      });

      const response = await fetch('http://localhost:3100/api/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 1 }),
      });

      expect(response.status).toBe(200);
    });

    test('should handle DELETE request', async () => {
      adapter.onRequest?.(async (req) => {
        expect(req.method).toBe('DELETE');
        return {
          status: 204,
          headers: new Map(),
          body: null,
        };
      });

      const response = await fetch('http://localhost:3100/api/delete', {
        method: 'DELETE',
      });

      expect(response.status).toBe(204);
    });
  });

  describe('Headers', () => {
    test('should receive request headers', async () => {
      adapter.onRequest?.(async (req) => {
        expect(req.headers.get('x-custom-header')).toBe('test-value');
        return {
          status: 200,
          headers: new Map(),
          body: 'OK',
        };
      });

      await fetch('http://localhost:3100/headers', {
        headers: { 'X-Custom-Header': 'test-value' },
      });
    });

    test('should send response headers', async () => {
      adapter.onRequest?.(async (req) => {
        return {
          status: 200,
          headers: new Map([
            ['x-response-header', 'response-value'],
            ['cache-control', 'no-cache'],
          ]),
          body: 'OK',
        };
      });

      const response = await fetch('http://localhost:3100/response-headers');
      expect(response.headers.get('x-response-header')).toBe('response-value');
      expect(response.headers.get('cache-control')).toBe('no-cache');
    });
  });

  describe('Response Types', () => {
    test('should handle string response', async () => {
      adapter.onRequest?.(async (req) => {
        return {
          status: 200,
          headers: new Map([['content-type', 'text/plain']]),
          body: 'Plain text response',
        };
      });

      const response = await fetch('http://localhost:3100/string');
      expect(await response.text()).toBe('Plain text response');
    });

    test('should handle JSON response', async () => {
      adapter.onRequest?.(async (req) => {
        return {
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          body: { message: 'JSON response', data: [1, 2, 3] },
        };
      });

      const response = await fetch('http://localhost:3100/json');
      const data = await response.json();
      expect(data).toEqual({ message: 'JSON response', data: [1, 2, 3] });
    });

    test('should handle empty response', async () => {
      adapter.onRequest?.(async (req) => {
        return {
          status: 204,
          headers: new Map(),
          body: null,
        };
      });

      const response = await fetch('http://localhost:3100/empty');
      expect(response.status).toBe(204);
      expect(await response.text()).toBe('');
    });
  });

  describe('Status Codes', () => {
    test('should return 404 status', async () => {
      adapter.onRequest?.(async (req) => {
        return {
          status: 404,
          headers: new Map([['content-type', 'application/json']]),
          body: { error: 'Not Found' },
        };
      });

      const response = await fetch('http://localhost:3100/notfound');
      expect(response.status).toBe(404);
    });

    test('should return 500 status', async () => {
      adapter.onRequest?.(async (req) => {
        return {
          status: 500,
          headers: new Map([['content-type', 'application/json']]),
          body: { error: 'Internal Server Error' },
        };
      });

      const response = await fetch('http://localhost:3100/error');
      expect(response.status).toBe(500);
    });
  });

  describe('Error Handling', () => {
    test('should return 503 when no handler registered', async () => {
      const newAdapter = createNodeHttpAdapter();
      await newAdapter.init({ port: 3101, hostname: 'localhost' });
      await newAdapter.start();

      const response = await fetch('http://localhost:3101/test');
      expect(response.status).toBe(503);

      await newAdapter.stop();
      await newAdapter.destroy();
    });

    test('should fail to start without initialization', async () => {
      const newAdapter = createNodeHttpAdapter();
      const result = await newAdapter.start();
      expect(isErr(result)).toBe(true);
    });

    test('should fail to stop when not started', async () => {
      const newAdapter = createNodeHttpAdapter();
      await newAdapter.init({ port: 3102, hostname: 'localhost' });
      const result = await newAdapter.stop();
      expect(isErr(result)).toBe(true);
    });
  });

  describe('Request Body Parsing', () => {
    test('should parse JSON body', async () => {
      adapter.onRequest?.(async (req) => {
        expect(req.body).toEqual({ key: 'value', number: 42 });
        return {
          status: 200,
          headers: new Map(),
          body: 'OK',
        };
      });

      await fetch('http://localhost:3100/json-body', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'value', number: 42 }),
      });
    });

    test('should parse plain text body', async () => {
      adapter.onRequest?.(async (req) => {
        expect(req.body).toBe('plain text content');
        return {
          status: 200,
          headers: new Map(),
          body: 'OK',
        };
      });

      await fetch('http://localhost:3100/text-body', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'plain text content',
      });
    });

    test('should handle empty body for GET', async () => {
      adapter.onRequest?.(async (req) => {
        expect(req.body).toBeUndefined();
        return {
          status: 200,
          headers: new Map(),
          body: 'OK',
        };
      });

      await fetch('http://localhost:3100/get-no-body');
    });
  });

  describe('Multiple Requests', () => {
    test('should handle concurrent requests', async () => {
      let requestCount = 0;

      adapter.onRequest?.(async (req) => {
        requestCount++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          status: 200,
          headers: new Map(),
          body: { count: requestCount },
        };
      });

      const requests = Array.from({ length: 5 }, (_, i) =>
        fetch(`http://localhost:3100/concurrent/${i}`)
      );

      const responses = await Promise.all(requests);
      expect(responses.length).toBe(5);
      responses.forEach((res) => expect(res.status).toBe(200));
      expect(requestCount).toBe(5);
    });
  });
});
