/**
 * Tests for Bun HTTP Server Adapter
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createBunHttpAdapter } from '../src/bun-http.js';
import type { ServerAdapter } from '@servicejs/integration-server';

describe('Bun HTTP Adapter', () => {
  let adapter: ServerAdapter;

  beforeEach(() => {
    adapter = createBunHttpAdapter();
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.stop();
      await adapter.destroy();
    }
  });

  describe('Lifecycle', () => {
    test('should initialize with valid config', async () => {
      const result = await adapter.init({ port: 3000 });
      expect(result.isOk()).toBe(true);
    });

    test('should fail to initialize without port', async () => {
      const result = await adapter.init({} as any);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Port is required');
      }
    });

    test('should fail to initialize with invalid port', async () => {
      const result = await adapter.init({ port: 99999 });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Port must be between 1 and 65535');
      }
    });

    test('should start after initialization', async () => {
      await adapter.init({ port: 3001 });
      const result = await adapter.start();
      expect(result.isOk()).toBe(true);
    });

    test('should stop after starting', async () => {
      await adapter.init({ port: 3002 });
      await adapter.start();
      const result = await adapter.stop();
      expect(result.isOk()).toBe(true);
    });

    test('should destroy resources', async () => {
      await adapter.init({ port: 3003 });
      await adapter.start();
      await adapter.stop();
      const result = await adapter.destroy();
      expect(result.isOk()).toBe(true);
    });
  });

  describe('Health Checks', () => {
    test('should report degraded when not running', async () => {
      const result = await adapter.health();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe('degraded');
      }
    });

    test('should report degraded when no request handler registered', async () => {
      await adapter.init({ port: 3004 });
      await adapter.start();
      const result = await adapter.health();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe('degraded');
      }
    });

    test('should report healthy when running with handler', async () => {
      await adapter.init({ port: 3005 });
      await adapter.start();
      adapter.onRequest?.(async () => ({
        status: 200,
        headers: new Map(),
        body: 'ok',
      }));
      const result = await adapter.health();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe('healthy');
      }
    });
  });

  describe('HTTP Requests', () => {
    test('should handle GET request', async () => {
      await adapter.init({ port: 3006, hostname: 'localhost' });
      await adapter.start();

      adapter.onRequest?.(async (req) => {
        expect(req.method).toBe('GET');
        expect(req.url).toBe('/test');
        return {
          status: 200,
          headers: new Map([['content-type', 'text/plain']]),
          body: 'Hello World',
        };
      });

      const response = await fetch('http://localhost:3006/test');
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('Hello World');
    });

    test('should handle POST request with JSON body', async () => {
      await adapter.init({ port: 3007, hostname: 'localhost' });
      await adapter.start();

      adapter.onRequest?.(async (req) => {
        expect(req.method).toBe('POST');
        expect(req.body).toEqual({ name: 'Alice', age: 30 });
        return {
          status: 201,
          headers: new Map([['content-type', 'application/json']]),
          body: { id: '123', ...req.body },
        };
      });

      const response = await fetch('http://localhost:3007/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Alice', age: 30 }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toEqual({ id: '123', name: 'Alice', age: 30 });
    });

    test('should handle request headers', async () => {
      await adapter.init({ port: 3008, hostname: 'localhost' });
      await adapter.start();

      adapter.onRequest?.(async (req) => {
        expect(req.headers.get('x-custom-header')).toBe('test-value');
        return {
          status: 200,
          headers: new Map(),
          body: 'ok',
        };
      });

      await fetch('http://localhost:3008/test', {
        headers: { 'x-custom-header': 'test-value' },
      });
    });

    test('should set response headers', async () => {
      await adapter.init({ port: 3009, hostname: 'localhost' });
      await adapter.start();

      adapter.onRequest?.(async () => ({
        status: 200,
        headers: new Map([
          ['x-custom-header', 'custom-value'],
          ['content-type', 'application/json'],
        ]),
        body: { message: 'test' },
      }));

      const response = await fetch('http://localhost:3009/test');
      expect(response.headers.get('x-custom-header')).toBe('custom-value');
      expect(response.headers.get('content-type')).toContain('application/json');
    });

    test('should handle query parameters', async () => {
      await adapter.init({ port: 3010, hostname: 'localhost' });
      await adapter.start();

      adapter.onRequest?.(async (req) => {
        expect(req.url).toContain('?search=test&limit=10');
        return {
          status: 200,
          headers: new Map(),
          body: 'ok',
        };
      });

      await fetch('http://localhost:3010/api?search=test&limit=10');
    });

    test('should handle different HTTP methods', async () => {
      await adapter.init({ port: 3011, hostname: 'localhost' });
      await adapter.start();

      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        adapter.onRequest?.(async (req) => {
          expect(req.method).toBe(method);
          return { status: 200, headers: new Map(), body: 'ok' };
        });

        await fetch('http://localhost:3011/test', { method });
      }
    });

    test('should return 500 when no handler registered', async () => {
      await adapter.init({ port: 3012, hostname: 'localhost' });
      await adapter.start();

      const response = await fetch('http://localhost:3012/test');
      expect(response.status).toBe(500);
      expect(await response.text()).toBe('No request handler registered');
    });

    test('should handle JSON response without explicit content-type', async () => {
      await adapter.init({ port: 3013, hostname: 'localhost' });
      await adapter.start();

      adapter.onRequest?.(async () => ({
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        body: { message: 'test', count: 42 },
      }));

      const response = await fetch('http://localhost:3013/test');
      const data = await response.json();
      expect(data).toEqual({ message: 'test', count: 42 });
    });

    test('should handle text response', async () => {
      await adapter.init({ port: 3014, hostname: 'localhost' });
      await adapter.start();

      adapter.onRequest?.(async () => ({
        status: 200,
        headers: new Map([['content-type', 'text/plain']]),
        body: 'Plain text response',
      }));

      const response = await fetch('http://localhost:3014/test');
      expect(await response.text()).toBe('Plain text response');
    });
  });

  describe('Error Handling', () => {
    test('should handle handler errors gracefully', async () => {
      await adapter.init({ port: 3015, hostname: 'localhost' });
      await adapter.start();

      adapter.onRequest?.(async () => {
        throw new Error('Handler error');
      });

      const response = await fetch('http://localhost:3015/test');
      expect(response.status).toBe(500);
      expect(await response.text()).toBe('Internal Server Error');
    });
  });
});
