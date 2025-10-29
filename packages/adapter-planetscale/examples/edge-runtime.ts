/**
 * PlanetScale Edge Runtime Example
 *
 * Demonstrates usage in edge environments (Cloudflare Workers, Vercel Edge, etc.)
 */

import { createPlanetScaleAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

// Example handler for Cloudflare Workers or similar edge runtime
export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const adapter = createPlanetScaleAdapter();

    // Initialize with environment variables
    await adapter.init({
      host: env.PLANETSCALE_HOST,
      username: env.PLANETSCALE_USERNAME,
      password: env.PLANETSCALE_PASSWORD,
      fetch: fetch, // Use the global fetch from edge runtime
    });

    await adapter.start();

    try {
      // Parse request URL
      const url = new URL(request.url);

      if (url.pathname === '/users') {
        // Query users
        const result = await adapter.execute(
          'SELECT id, name, email FROM users LIMIT 10'
        );

        if (isOk(result)) {
          return new Response(JSON.stringify(result.value.rows), {
            headers: { 'Content-Type': 'application/json' },
          });
        } else {
          return new Response(JSON.stringify({ error: result.error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      if (url.pathname === '/users/create' && request.method === 'POST') {
        // Create user
        const body = await request.json();

        const result = await adapter.execute(
          'INSERT INTO users (name, email) VALUES (?, ?)',
          [body.name, body.email]
        );

        if (isOk(result)) {
          return new Response(
            JSON.stringify({
              id: result.value.insertId,
              name: body.name,
              email: body.email,
            }),
            {
              status: 201,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        } else {
          return new Response(JSON.stringify({ error: result.error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response('Not Found', { status: 404 });
    } finally {
      await adapter.stop();
      await adapter.destroy();
    }
  },
};

// For local development/testing
if (import.meta.url === `file://${process.argv[1]}`) {
  const handler = {
    async fetch(request: Request): Promise<Response> {
      const env = {
        PLANETSCALE_HOST: process.env.PLANETSCALE_HOST,
        PLANETSCALE_USERNAME: process.env.PLANETSCALE_USERNAME,
        PLANETSCALE_PASSWORD: process.env.PLANETSCALE_PASSWORD,
      };

      return await (default as any).fetch(request, env);
    },
  };

  // Test query
  const response = await handler.fetch(new Request('http://localhost/users'));
  const data = await response.json();
  console.log('Users:', data);
}
