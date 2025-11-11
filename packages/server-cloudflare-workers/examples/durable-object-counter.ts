/**
 * Example: Durable Object Counter
 *
 * This example shows a stateful counter Durable Object with
 * alarms, persistence, and multiple operations.
 */

import { ServiceDurableObject } from '../src/durable-object';
import { createFetchHandler } from '../src/fetch-handler';

interface Env {
  COUNTER: DurableObjectNamespace;
}

/**
 * Counter Durable Object
 * Maintains a persistent counter with auto-reset via alarms
 */
export class Counter extends ServiceDurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);

    // Initialize counter on first request
    this.onInit(async (state, env) => {
      const count = await state.storage.get<number>('count');
      if (count === undefined) {
        await state.storage.put('count', 0);
        console.log('Counter initialized to 0');
      } else {
        console.log('Counter loaded from storage:', count);
      }

      // Schedule daily reset alarm if not already scheduled
      const alarmTime = await state.storage.getAlarm();
      if (alarmTime === null) {
        // Reset daily at midnight
        const tomorrow = new Date();
        tomorrow.setUTCHours(24, 0, 0, 0);
        await state.storage.setAlarm(tomorrow.getTime());
        console.log('Scheduled daily reset alarm');
      }
    });

    // Handle HTTP requests
    this.onFetch(async (request, env, ctx) => {
      const url = new URL(request.url);

      // GET /increment - Increment counter
      if (url.pathname === '/increment') {
        const count = await this.state.storage.get<number>('count') || 0;
        const amount = parseInt(url.searchParams.get('amount') || '1');
        const newCount = count + amount;

        await this.state.storage.put('count', newCount);

        return {
          statusCode: 200,
          body: JSON.stringify({
            count: newCount,
            incremented: amount,
          }),
          headers: { 'Content-Type': 'application/json' },
        };
      }

      // GET /decrement - Decrement counter
      if (url.pathname === '/decrement') {
        const count = await this.state.storage.get<number>('count') || 0;
        const amount = parseInt(url.searchParams.get('amount') || '1');
        const newCount = Math.max(0, count - amount);

        await this.state.storage.put('count', newCount);

        return {
          statusCode: 200,
          body: JSON.stringify({
            count: newCount,
            decremented: amount,
          }),
          headers: { 'Content-Type': 'application/json' },
        };
      }

      // GET /get - Get current count
      if (url.pathname === '/get') {
        const count = await this.state.storage.get<number>('count') || 0;

        return {
          statusCode: 200,
          body: JSON.stringify({ count }),
          headers: { 'Content-Type': 'application/json' },
        };
      }

      // POST /reset - Reset counter
      if (url.pathname === '/reset') {
        await this.state.storage.put('count', 0);

        return {
          statusCode: 200,
          body: JSON.stringify({ count: 0, reset: true }),
          headers: { 'Content-Type': 'application/json' },
        };
      }

      // GET /alarm - Get next alarm time
      if (url.pathname === '/alarm') {
        const alarmTime = await this.state.storage.getAlarm();

        return {
          statusCode: 200,
          body: JSON.stringify({
            alarmScheduled: alarmTime !== null,
            alarmTime: alarmTime ? new Date(alarmTime).toISOString() : null,
          }),
          headers: { 'Content-Type': 'application/json' },
        };
      }

      return {
        statusCode: 404,
        body: 'Not found',
      };
    });

    // Handle alarm - Reset counter daily
    this.onAlarm(async (env) => {
      console.log('Alarm triggered - resetting counter');

      const oldCount = await this.state.storage.get<number>('count') || 0;
      await this.state.storage.put('count', 0);

      // Schedule next alarm (tomorrow)
      const tomorrow = new Date();
      tomorrow.setUTCHours(24, 0, 0, 0);
      await this.state.storage.setAlarm(tomorrow.getTime());

      console.log(`Counter reset from ${oldCount} to 0, next alarm: ${tomorrow.toISOString()}`);
    });

    // Handle errors
    this.onError((error) => {
      console.error('Counter error:', error);
    });
  }
}

// Worker entry point
const handler = createFetchHandler<Env>();

handler.onFetch(async (request, env, ctx) => {
  const url = new URL(request.url);

  // Route to appropriate counter instance
  if (url.pathname.startsWith('/counter/')) {
    const counterId = url.pathname.split('/')[2] || 'default';

    // Get Durable Object stub
    const id = env.COUNTER.idFromName(counterId);
    const stub = env.COUNTER.get(id);

    // Forward request to Durable Object
    const doUrl = new URL(request.url);
    doUrl.pathname = url.pathname.replace(`/counter/${counterId}`, '');

    return await stub.fetch(new Request(doUrl.toString(), request));
  }

  return {
    statusCode: 404,
    body: JSON.stringify({
      error: 'Not found',
      usage: {
        increment: '/counter/{id}/increment?amount=1',
        decrement: '/counter/{id}/decrement?amount=1',
        get: '/counter/{id}/get',
        reset: '/counter/{id}/reset',
        alarm: '/counter/{id}/alarm',
      },
    }),
    headers: { 'Content-Type': 'application/json' },
  };
});

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) =>
    handler.handleFetch(request, env, ctx),
};
