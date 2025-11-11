/**
 * Example: HTTP/Fetch Handler with environment bindings
 *
 * This example shows how to use the fetch handler with various
 * Cloudflare environment bindings (KV, D1, etc.)
 */

import { createFetchHandler } from '../src/fetch-handler';
import { isOk } from '@servicejs/result';

interface Env {
  KV: KVNamespace;
  DB: D1Database;
  BUCKET: R2Bucket;
}

const handler = createFetchHandler<Env>();

// Initialize with custom config
await handler.init({
  autoErrorResponse: true,
  errorStatusCode: 500,
});

// Register fetch handler
handler.onFetch(async (request, env, ctx) => {
  const url = new URL(request.url);

  // GET /api/users - List users from D1
  if (url.pathname === '/api/users' && request.method === 'GET') {
    try {
      const result = await env.DB.prepare('SELECT * FROM users').all();

      return {
        statusCode: 200,
        body: JSON.stringify(result.results),
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
        },
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Database error' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }
  }

  // GET /api/kv/:key - Get value from KV
  if (url.pathname.startsWith('/api/kv/') && request.method === 'GET') {
    const key = url.pathname.split('/').pop();
    if (!key) {
      return {
        statusCode: 400,
        body: 'Missing key',
      };
    }

    const value = await env.KV.get(key);

    if (!value) {
      return {
        statusCode: 404,
        body: 'Key not found',
      };
    }

    return {
      statusCode: 200,
      body: value,
      headers: { 'Content-Type': 'text/plain' },
    };
  }

  // PUT /api/kv/:key - Set value in KV
  if (url.pathname.startsWith('/api/kv/') && request.method === 'PUT') {
    const key = url.pathname.split('/').pop();
    if (!key || !request.body) {
      return {
        statusCode: 400,
        body: 'Missing key or body',
      };
    }

    await env.KV.put(key, request.body as string);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  // GET /api/r2/:key - Get object from R2
  if (url.pathname.startsWith('/api/r2/') && request.method === 'GET') {
    const key = url.pathname.split('/').pop();
    if (!key) {
      return {
        statusCode: 400,
        body: 'Missing key',
      };
    }

    const object = await env.BUCKET.get(key);

    if (!object) {
      return {
        statusCode: 404,
        body: 'Object not found',
      };
    }

    return {
      statusCode: 200,
      body: object.body,
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'ETag': object.httpEtag,
      },
    };
  }

  // POST /api/users - Create user
  if (url.pathname === '/api/users' && request.method === 'POST') {
    try {
      const body = JSON.parse(request.body as string);
      const { name, email } = body;

      if (!name || !email) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing name or email' }),
          headers: { 'Content-Type': 'application/json' },
        };
      }

      const result = await env.DB.prepare(
        'INSERT INTO users (name, email) VALUES (?, ?) RETURNING *'
      )
        .bind(name, email)
        .first();

      return {
        statusCode: 201,
        body: JSON.stringify(result),
        headers: { 'Content-Type': 'application/json' },
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create user' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }
  }

  // Default 404
  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'Not found' }),
    headers: { 'Content-Type': 'application/json' },
  };
});

// Register error handler
handler.onError((error) => {
  console.error('Request error:', error);
});

// Export for Workers runtime
export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) =>
    handler.handleFetch(request, env, ctx),
};
