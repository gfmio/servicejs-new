/**
 * Cloudflare Workers D1 Example
 *
 * This example shows how to use the D1 adapter in a Cloudflare Worker
 * Deploy with: wrangler deploy
 */

import { createD1Adapter } from '@servicejs/adapter-cloudflare-d1';
import { isOk } from '@servicejs/result';

interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const db = createD1Adapter();

    // Initialize with D1 binding
    await db.init({ database: env.DB });
    await db.start();

    try {
      // Create table if it doesn't exist
      await db.query({
        text: `
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `,
      });

      // Handle routes
      const url = new URL(request.url);

      if (url.pathname === '/users' && request.method === 'GET') {
        // Get all users
        const result = await db.query<{ id: number; name: string; email: string; created_at: string }>({
          text: 'SELECT * FROM users ORDER BY created_at DESC',
        });

        if (isOk(result)) {
          return new Response(JSON.stringify(result.value.rows), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      if (url.pathname === '/users' && request.method === 'POST') {
        // Create user
        const body = await request.json();

        const insertResult = await db.query({
          text: 'INSERT INTO users (name, email) VALUES (?, ?)',
          params: [body.name, body.email],
        });

        if (isOk(insertResult)) {
          // Get the created user
          const selectResult = await db.query<{ id: number; name: string; email: string }>({
            text: 'SELECT * FROM users WHERE email = ?',
            params: [body.email],
          });

          if (isOk(selectResult) && selectResult.value.rows.length > 0) {
            return new Response(JSON.stringify(selectResult.value.rows[0]), {
              status: 201,
              headers: { 'Content-Type': 'application/json' },
            });
          }
        }
      }

      if (url.pathname.startsWith('/users/') && request.method === 'GET') {
        // Get user by ID
        const id = url.pathname.split('/')[2];

        const result = await db.query<{ id: number; name: string; email: string }>({
          text: 'SELECT * FROM users WHERE id = ?',
          params: [id],
        });

        if (isOk(result) && result.value.rows.length > 0) {
          return new Response(JSON.stringify(result.value.rows[0]), {
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response('User not found', { status: 404 });
      }

      if (url.pathname.startsWith('/users/') && request.method === 'DELETE') {
        // Delete user
        const id = url.pathname.split('/')[2];

        const result = await db.query({
          text: 'DELETE FROM users WHERE id = ?',
          params: [id],
        });

        if (isOk(result) && result.value.rowCount > 0) {
          return new Response(null, { status: 204 });
        }

        return new Response('User not found', { status: 404 });
      }

      return new Response('Not Found', { status: 404 });
    } finally {
      await db.stop();
      await db.destroy();
    }
  },
};
