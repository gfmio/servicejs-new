/**
 * Cloudflare Durable Objects integration
 */

import { Result, ok, err } from '@servicejs/result';
import type { DurableObjectState, AlarmHandler, ErrorHandler, FetchHandler } from './types';

/**
 * Durable Object lifecycle handlers
 */
export interface DurableObjectHandlers<Env = unknown> {
  /**
   * Called when the Durable Object is first created
   */
  onInit?: (state: DurableObjectState, env: Env) => Promise<void> | void;

  /**
   * Called when a fetch request is received
   */
  onFetch?: FetchHandler<Env>;

  /**
   * Called when an alarm is triggered
   */
  onAlarm?: AlarmHandler<Env>;

  /**
   * Called when an error occurs
   */
  onError?: ErrorHandler;
}

/**
 * Base Durable Object class with ServiceJS patterns
 *
 * @example
 * ```typescript
 * import { ServiceDurableObject } from '@servicejs/server-cloudflare-workers';
 *
 * export class Counter extends ServiceDurableObject<Env> {
 *   constructor(state: DurableObjectState, env: Env) {
 *     super(state, env);
 *
 *     this.onInit(async (state, env) => {
 *       // Initialize state
 *       const count = await state.storage.get<number>('count') || 0;
 *       console.log('Counter initialized:', count);
 *     });
 *
 *     this.onFetch(async (request, env, ctx) => {
 *       const url = new URL(request.url);
 *
 *       if (url.pathname === '/increment') {
 *         const count = await this.state.storage.get<number>('count') || 0;
 *         const newCount = count + 1;
 *         await this.state.storage.put('count', newCount);
 *
 *         return {
 *           statusCode: 200,
 *           body: JSON.stringify({ count: newCount }),
 *           headers: { 'Content-Type': 'application/json' },
 *         };
 *       }
 *
 *       return {
 *         statusCode: 404,
 *         body: 'Not found',
 *       };
 *     });
 *   }
 * }
 * ```
 */
export class ServiceDurableObject<Env = unknown> {
  protected handlers: DurableObjectHandlers<Env> = {};
  protected initialized = false;

  constructor(
    protected state: DurableObjectState,
    protected env: Env
  ) {}

  /**
   * Register initialization handler
   */
  protected onInit(handler: NonNullable<DurableObjectHandlers<Env>['onInit']>): void {
    this.handlers.onInit = handler;
  }

  /**
   * Register fetch handler
   */
  protected onFetch(handler: NonNullable<DurableObjectHandlers<Env>['onFetch']>): void {
    this.handlers.onFetch = handler;
  }

  /**
   * Register alarm handler
   */
  protected onAlarm(handler: NonNullable<DurableObjectHandlers<Env>['onAlarm']>): void {
    this.handlers.onAlarm = handler;
  }

  /**
   * Register error handler
   */
  protected onError(handler: ErrorHandler): void {
    this.handlers.onError = handler;
  }

  /**
   * Handle fetch requests (called by Workers runtime)
   */
  async fetch(request: Request): Promise<Response> {
    try {
      // Initialize on first request
      if (!this.initialized && this.handlers.onInit) {
        await this.state.blockConcurrencyWhile(async () => {
          if (!this.initialized) {
            await Promise.resolve(this.handlers.onInit!(this.state, this.env));
            this.initialized = true;
          }
        });
      }

      if (!this.handlers.onFetch) {
        return new Response('No fetch handler registered', { status: 500 });
      }

      // Convert Request to WorkersHTTPRequest
      const url = new URL(request.url);
      const headers: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        headers[key] = value;
      });

      let body: string | ArrayBuffer | undefined;
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        const contentType = request.headers.get('content-type');
        if (contentType?.includes('application/json') || contentType?.includes('text/')) {
          body = await request.text();
        } else {
          body = await request.arrayBuffer();
        }
      }

      const workersRequest = {
        method: request.method,
        url: url.pathname + url.search,
        headers,
        body,
        cf: request.cf,
      };

      // Create execution context stub
      const ctx: ExecutionContext = {
        waitUntil: (promise: Promise<unknown>) => this.state.waitUntil(promise),
        passThroughOnException: () => {},
      };

      const response = await Promise.resolve(
        this.handlers.onFetch(workersRequest, this.env, ctx)
      );

      return new Response(response.body, {
        status: response.statusCode || 200,
        headers: response.headers,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      if (this.handlers.onError) {
        try {
          await Promise.resolve(this.handlers.onError(err));
        } catch (handlerError) {
          console.error('Error in error handler:', handlerError);
        }
      }

      return new Response(
        JSON.stringify({
          error: err.message,
          stack: err.stack,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  }

  /**
   * Handle alarm events (called by Workers runtime)
   */
  async alarm(): Promise<void> {
    try {
      if (this.handlers.onAlarm) {
        await Promise.resolve(this.handlers.onAlarm(this.env));
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      if (this.handlers.onError) {
        try {
          await Promise.resolve(this.handlers.onError(err));
        } catch (handlerError) {
          console.error('Error in error handler:', handlerError);
        }
      }

      throw error;
    }
  }

  /**
   * Schedule an alarm
   */
  async scheduleAlarm(scheduledTime: number | Date): Promise<Result<void, Error>> {
    try {
      const time = scheduledTime instanceof Date ? scheduledTime.getTime() : scheduledTime;
      await this.state.storage.setAlarm(time);
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get the current alarm time
   */
  async getAlarm(): Promise<Result<number | null, Error>> {
    try {
      const time = await this.state.storage.getAlarm();
      return ok(time);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Delete the scheduled alarm
   */
  async deleteAlarm(): Promise<Result<void, Error>> {
    try {
      await this.state.storage.deleteAlarm();
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
