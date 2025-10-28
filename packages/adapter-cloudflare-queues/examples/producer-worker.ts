/**
 * Cloudflare Worker Queue Producer Example
 *
 * This example demonstrates sending messages to a Cloudflare Queue.
 *
 * Setup:
 * 1. Create wrangler.toml:
 *    ```toml
 *    name = "queue-producer"
 *    main = "examples/producer-worker.ts"
 *    compatibility_date = "2024-01-01"
 *
 *    [[queues.producers]]
 *    queue = "my-queue"
 *    binding = "MY_QUEUE"
 *    ```
 *
 * 2. Deploy: wrangler deploy
 */

import { createCloudflareQueuesAdapter } from '../src/queues.js';
import { isOk, isErr } from '@servicejs/result';

interface Env {
  MY_QUEUE: Queue;
}

interface UserEvent {
  type: 'created' | 'updated' | 'deleted';
  userId: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Create and initialize queue adapter
    const queue = createCloudflareQueuesAdapter();
    await queue.init({
      producerQueue: env.MY_QUEUE,
      queueName: 'my-queue',
    });
    await queue.start();

    try {
      // POST /events/user - Send single user event
      if (request.method === 'POST' && path === '/events/user') {
        const body = await request.json() as UserEvent;

        const event: UserEvent = {
          type: body.type,
          userId: body.userId,
          timestamp: Date.now(),
          data: body.data,
        };

        const result = await queue.publish('user-events', event);
        if (isErr(result)) {
          return new Response(JSON.stringify({ error: result.error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ message: 'Event queued', event }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // POST /events/user/delayed - Send delayed user event
      if (request.method === 'POST' && path === '/events/user/delayed') {
        const body = await request.json() as UserEvent & { delaySeconds: number };

        const event: UserEvent = {
          type: body.type,
          userId: body.userId,
          timestamp: Date.now(),
          data: body.data,
        };

        const result = await queue.publish('user-events', event, body.delaySeconds);
        if (isErr(result)) {
          return new Response(JSON.stringify({ error: result.error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(
          JSON.stringify({ message: 'Event queued with delay', event, delaySeconds: body.delaySeconds }),
          {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // POST /events/batch - Send batch of events
      if (request.method === 'POST' && path === '/events/batch') {
        const body = await request.json() as {
          events: Array<UserEvent & { delaySeconds?: number }>;
        };

        const messages = body.events.map(event => ({
          message: {
            type: event.type,
            userId: event.userId,
            timestamp: Date.now(),
            data: event.data,
          },
          delaySeconds: event.delaySeconds,
        }));

        const result = await queue.publishBatch('user-events', messages);
        if (isErr(result)) {
          return new Response(JSON.stringify({ error: result.error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(
          JSON.stringify({ message: 'Events queued', count: messages.length }),
          {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // GET /health - Health check
      if (request.method === 'GET' && path === '/health') {
        const healthResult = await queue.health();
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

      return new Response('Not Found', { status: 404 });
    } finally {
      await queue.stop();
      await queue.destroy();
    }
  },
};
