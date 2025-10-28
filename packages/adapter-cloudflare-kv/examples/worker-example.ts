/**
 * Cloudflare Worker KV Cache Example
 *
 * This example demonstrates using the Cloudflare KV adapter in a Cloudflare Worker.
 *
 * Setup:
 * 1. Create wrangler.toml:
 *    ```toml
 *    name = "kv-cache-worker"
 *    main = "examples/worker-example.ts"
 *    compatibility_date = "2024-01-01"
 *
 *    [[kv_namespaces]]
 *    binding = "CACHE"
 *    id = "your-kv-namespace-id"
 *    ```
 *
 * 2. Deploy: wrangler deploy
 */

import { createCloudflareKVAdapter } from '../src/kv.js';
import { isOk, isErr } from '@servicejs/result';

interface Env {
  CACHE: KVNamespace;
}

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Create and initialize cache adapter
    const cache = createCloudflareKVAdapter();
    await cache.init({ namespace: env.CACHE, defaultTTL: 3600 }); // 1 hour default TTL
    await cache.start();

    try {
      // GET /users/:id - Get user from cache
      if (request.method === 'GET' && path.startsWith('/users/')) {
        const userId = path.split('/')[2];

        const result = await cache.get<User>(`user:${userId}`);
        if (isErr(result)) {
          return new Response(JSON.stringify({ error: result.error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (result.value === null) {
          return new Response(JSON.stringify({ error: 'User not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify(result.value), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // POST /users - Create user in cache
      if (request.method === 'POST' && path === '/users') {
        const body = await request.json() as { name: string; email: string };

        const user: User = {
          id: crypto.randomUUID(),
          name: body.name,
          email: body.email,
          createdAt: new Date().toISOString(),
        };

        const result = await cache.set(`user:${user.id}`, user, 3600); // 1 hour TTL
        if (isErr(result)) {
          return new Response(JSON.stringify({ error: result.error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify(user), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // DELETE /users/:id - Delete user from cache
      if (request.method === 'DELETE' && path.startsWith('/users/')) {
        const userId = path.split('/')[2];

        const result = await cache.delete(`user:${userId}`);
        if (isErr(result)) {
          return new Response(JSON.stringify({ error: result.error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (!result.value) {
          return new Response(JSON.stringify({ error: 'User not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ message: 'User deleted' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // GET /users - List all users
      if (request.method === 'GET' && path === '/users') {
        const listResult = await cache.list('user:');
        if (isErr(listResult)) {
          return new Response(JSON.stringify({ error: listResult.error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const users: User[] = [];
        for (const key of listResult.value) {
          const userResult = await cache.get<User>(key);
          if (isOk(userResult) && userResult.value) {
            users.push(userResult.value);
          }
        }

        return new Response(JSON.stringify(users), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // GET /health - Health check
      if (request.method === 'GET' && path === '/health') {
        const healthResult = await cache.health();
        if (isErr(healthResult)) {
          return new Response(JSON.stringify({ error: healthResult.error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify(healthResult.value), {
          status: healthResult.value.status === 'healthy' ? 200 : 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // POST /cache/flush - Flush all users from cache
      if (request.method === 'POST' && path === '/cache/flush') {
        const result = await cache.flush('user:');
        if (isErr(result)) {
          return new Response(JSON.stringify({ error: result.error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ message: 'Cache flushed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response('Not Found', { status: 404 });
    } finally {
      await cache.stop();
      await cache.destroy();
    }
  },
};
