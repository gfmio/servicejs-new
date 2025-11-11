/**
 * Tests for Hono adapter
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { createHonoAdapter, createServiceHandler, parsers, middleware } from '../src';
import { ok, err, isOk, isErr } from '@servicejs/result';

describe('Hono Adapter', () => {
  describe('Basic Routes', () => {
    test('handles GET request', async () => {
      const app = createHonoAdapter();

      app.addRoute({
        method: 'GET',
        path: '/hello',
        handler: async () => ok({ message: 'Hello, World!' }),
      });

      const res = await app.getApp().request('/hello');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.message).toBe('Hello, World!');
    });

    test('handles POST request with JSON body', async () => {
      const app = createHonoAdapter();

      app.addRoute({
        method: 'POST',
        path: '/users',
        handler: async (data: { name: string; email: string }) => {
          return ok({ id: '123', ...data });
        },
        parseInput: parsers.json,
      });

      const res = await app.getApp().request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'John', email: 'john@example.com' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ id: '123', name: 'John', email: 'john@example.com' });
    });

    test('handles route parameters', async () => {
      const app = createHonoAdapter();

      app.addRoute({
        method: 'GET',
        path: '/users/:id',
        handler: async (data: { id: string }) => {
          return ok({ id: data.id, name: 'User ' + data.id });
        },
        parseInput: parsers.params,
      });

      const res = await app.getApp().request('/users/123');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toEqual({ id: '123', name: 'User 123' });
    });

    test('handles query parameters', async () => {
      const app = createHonoAdapter();

      app.addRoute({
        method: 'GET',
        path: '/search',
        handler: async (data: { q: string; limit: string }) => {
          return ok({ query: data.q, limit: parseInt(data.limit) });
        },
        parseInput: parsers.query,
      });

      const res = await app.getApp().request('/search?q=test&limit=10');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toEqual({ query: 'test', limit: 10 });
    });

    test('handles PUT request', async () => {
      const app = createHonoAdapter();

      app.addRoute({
        method: 'PUT',
        path: '/users/:id',
        handler: async (data: { id: string; name: string }) => {
          return ok({ id: data.id, name: data.name, updated: true });
        },
        parseInput: parsers.bodyAndParams,
      });

      const res = await app.getApp().request('/users/123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ id: '123', name: 'Updated Name', updated: true });
    });

    test('handles DELETE request', async () => {
      const app = createHonoAdapter();

      app.addRoute({
        method: 'DELETE',
        path: '/users/:id',
        handler: async (data: { id: string }) => {
          return ok({ id: data.id, deleted: true });
        },
        parseInput: parsers.params,
      });

      const res = await app.getApp().request('/users/123', { method: 'DELETE' });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toEqual({ id: '123', deleted: true });
    });

    test('handles PATCH request', async () => {
      const app = createHonoAdapter();

      app.addRoute({
        method: 'PATCH',
        path: '/users/:id',
        handler: async (data: { id: string; name?: string }) => {
          return ok({ id: data.id, name: data.name, patched: true });
        },
        parseInput: parsers.bodyAndParams,
      });

      const res = await app.getApp().request('/users/123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Patched Name' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ id: '123', name: 'Patched Name', patched: true });
    });
  });

  describe('Error Handling', () => {
    test('handles error result with auto error response', async () => {
      const app = createHonoAdapter({ autoErrorResponse: true, errorStatusCode: 400 });

      app.addRoute({
        method: 'GET',
        path: '/error',
        handler: async () => err(new Error('Something went wrong')),
      });

      const res = await app.getApp().request('/error');
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBe('Something went wrong');
    });

    test('handles thrown exceptions with auto error response', async () => {
      const app = createHonoAdapter({ autoErrorResponse: true });

      app.addRoute({
        method: 'GET',
        path: '/throw',
        handler: async () => {
          throw new Error('Unexpected error');
        },
      });

      const res = await app.getApp().request('/throw');
      expect(res.status).toBe(500);

      const data = await res.json();
      expect(data.error).toBe('Unexpected error');
    });

    test('uses custom error formatter', async () => {
      const app = createHonoAdapter({
        autoErrorResponse: true,
        errorFormatter: (error) => ({
          status: 'error',
          message: error.message,
          timestamp: Date.now(),
        }),
      });

      app.addRoute({
        method: 'GET',
        path: '/error',
        handler: async () => err(new Error('Custom error')),
      });

      const res = await app.getApp().request('/error');
      const data = await res.json();

      expect(data.status).toBe('error');
      expect(data.message).toBe('Custom error');
      expect(data.timestamp).toBeTypeOf('number');
    });
  });

  describe('Service Handler Helper', () => {
    test('createServiceHandler wraps function and returns ok result', async () => {
      const handler = createServiceHandler(async (input: { name: string }) => {
        return { greeting: `Hello, ${input.name}!` };
      });

      const result = await handler({ name: 'World' });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual({ greeting: 'Hello, World!' });
      }
    });

    test('createServiceHandler catches errors and returns err result', async () => {
      const handler = createServiceHandler(async () => {
        throw new Error('Handler error');
      });

      const result = await handler({});

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('Handler error');
      }
    });

    test('integrates with addRoute', async () => {
      const app = createHonoAdapter();

      const greetHandler = createServiceHandler(async (input: { name: string }) => {
        return { greeting: `Hello, ${input.name}!` };
      });

      app.addRoute({
        method: 'POST',
        path: '/greet',
        handler: greetHandler,
        parseInput: parsers.json,
      });

      const res = await app.getApp().request('/greet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'ServiceJS' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.greeting).toBe('Hello, ServiceJS!');
    });
  });

  describe('Response Formatting', () => {
    test('uses custom output formatter', async () => {
      const app = createHonoAdapter();

      app.addRoute({
        method: 'GET',
        path: '/user',
        handler: async () => ok({ id: 1, name: 'John', password: 'secret123' }),
        formatOutput: (data: { id: number; name: string; password: string }) => ({
          id: data.id,
          name: data.name,
          // Omit password from response
        }),
      });

      const res = await app.getApp().request('/user');
      const data = await res.json();

      expect(data.id).toBe(1);
      expect(data.name).toBe('John');
      expect(data.password).toBeUndefined();
    });
  });

  describe('Middleware', () => {
    test('CORS middleware adds headers', async () => {
      const app = createHonoAdapter();

      app.useGlobal(middleware.cors({ origin: 'https://example.com' }));

      app.addRoute({
        method: 'GET',
        path: '/test',
        handler: async () => ok({ message: 'test' }),
      });

      const res = await app.getApp().request('/test');

      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });

    test('CORS middleware handles preflight OPTIONS', async () => {
      const app = createHonoAdapter();

      app.useGlobal(middleware.cors());

      const res = await app.getApp().request('/test', { method: 'OPTIONS' });

      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    test('requestId middleware adds request ID header', async () => {
      const app = createHonoAdapter();

      app.useGlobal(middleware.requestId());

      app.addRoute({
        method: 'GET',
        path: '/test',
        handler: async () => ok({ message: 'test' }),
      });

      const res = await app.getApp().request('/test');

      const requestId = res.headers.get('X-Request-ID');
      expect(requestId).toBeTruthy();
      expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    test('timing middleware adds response time header', async () => {
      const app = createHonoAdapter();

      app.useGlobal(middleware.timing());

      app.addRoute({
        method: 'GET',
        path: '/test',
        handler: async () => ok({ message: 'test' }),
      });

      const res = await app.getApp().request('/test');

      const responseTime = res.headers.get('X-Response-Time');
      expect(responseTime).toBeTruthy();
      expect(responseTime).toMatch(/^\d+ms$/);
    });

    test('multiple middleware work together', async () => {
      const app = createHonoAdapter();

      app.useGlobal(middleware.cors());
      app.useGlobal(middleware.requestId());
      app.useGlobal(middleware.timing());

      app.addRoute({
        method: 'GET',
        path: '/test',
        handler: async () => ok({ message: 'test' }),
      });

      const res = await app.getApp().request('/test');

      expect(res.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
      expect(res.headers.get('X-Request-ID')).toBeTruthy();
      expect(res.headers.get('X-Response-Time')).toBeTruthy();
    });
  });

  describe('Input Parsers', () => {
    test('parsers.all combines body, params, and query', async () => {
      const app = createHonoAdapter();

      app.addRoute({
        method: 'POST',
        path: '/items/:id',
        handler: async (data: { id: string; name: string; filter: string }) => {
          return ok(data);
        },
        parseInput: parsers.all,
      });

      const res = await app.getApp().request('/items/123?filter=active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Item Name' }),
      });

      const data = await res.json();
      expect(data).toEqual({
        id: '123',
        name: 'Item Name',
        filter: 'active',
      });
    });
  });

  describe('Complex Scenarios', () => {
    test('RESTful CRUD API', async () => {
      const app = createHonoAdapter();

      const users = new Map<string, { id: string; name: string; email: string }>();

      // Create
      app.addRoute({
        method: 'POST',
        path: '/users',
        handler: async (data: { name: string; email: string }) => {
          const id = crypto.randomUUID();
          const user = { id, ...data };
          users.set(id, user);
          return ok(user);
        },
        parseInput: parsers.json,
      });

      // Read
      app.addRoute({
        method: 'GET',
        path: '/users/:id',
        handler: async (data: { id: string }) => {
          const user = users.get(data.id);
          if (!user) return err(new Error('User not found'));
          return ok(user);
        },
        parseInput: parsers.params,
      });

      // Update
      app.addRoute({
        method: 'PUT',
        path: '/users/:id',
        handler: async (data: { id: string; name: string; email: string }) => {
          const user = users.get(data.id);
          if (!user) return err(new Error('User not found'));
          const updated = { id: data.id, name: data.name, email: data.email };
          users.set(data.id, updated);
          return ok(updated);
        },
        parseInput: parsers.bodyAndParams,
      });

      // Delete
      app.addRoute({
        method: 'DELETE',
        path: '/users/:id',
        handler: async (data: { id: string }) => {
          const deleted = users.delete(data.id);
          if (!deleted) return err(new Error('User not found'));
          return ok({ deleted: true });
        },
        parseInput: parsers.params,
      });

      // Test Create
      const createRes = await app.getApp().request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'John', email: 'john@example.com' }),
      });
      const created = await createRes.json();
      expect(created.name).toBe('John');

      // Test Read
      const readRes = await app.getApp().request(`/users/${created.id}`);
      const read = await readRes.json();
      expect(read).toEqual(created);

      // Test Update
      const updateRes = await app.getApp().request(`/users/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'John Updated', email: 'john.updated@example.com' }),
      });
      const updated = await updateRes.json();
      expect(updated.name).toBe('John Updated');

      // Test Delete
      const deleteRes = await app.getApp().request(`/users/${created.id}`, { method: 'DELETE' });
      const deleted = await deleteRes.json();
      expect(deleted.deleted).toBe(true);

      // Verify deleted
      const notFoundRes = await app.getApp().request(`/users/${created.id}`);
      expect(notFoundRes.status).toBe(500); // Error due to not found
    });
  });
});
