/**
 * Cloudflare Workers scheduled events (cron triggers) adapter
 */

import { Result, ok, err } from '@servicejs/result';
import type { ScheduledEvent, ScheduledHandler, ErrorHandler } from './types';

/**
 * Configuration for scheduled event handler
 */
export interface ScheduledHandlerConfig {
  /**
   * Enable automatic error logging
   */
  autoErrorLogging?: boolean;
}

/**
 * Scheduled event handler adapter
 */
export interface ScheduledHandlerAdapter<Env = unknown> {
  /**
   * Initialize the adapter
   */
  init(config?: ScheduledHandlerConfig): Promise<Result<void, Error>>;

  /**
   * Register a scheduled event handler
   */
  onScheduled(handler: ScheduledHandler<Env>): void;

  /**
   * Register an error handler
   */
  onError(handler: ErrorHandler): void;

  /**
   * Handle a scheduled event (called by Workers runtime)
   */
  handleScheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void>;
}

/**
 * Create a scheduled event handler for Cloudflare Workers
 *
 * @example
 * ```typescript
 * import { createScheduledHandler } from '@servicejs/server-cloudflare-workers';
 *
 * const handler = createScheduledHandler<Env>();
 * await handler.init();
 *
 * handler.onScheduled(async (event, env, ctx) => {
 *   console.log(`Cron job triggered at ${event.scheduledTime}`);
 *   console.log(`Cron pattern: ${event.cron}`);
 *
 *   // Perform scheduled task
 *   await cleanupOldData(env);
 * });
 *
 * export default {
 *   scheduled: (controller, env, ctx) => handler.handleScheduled(controller, env, ctx),
 * };
 * ```
 */
export function createScheduledHandler<Env = unknown>(): ScheduledHandlerAdapter<Env> {
  let config: ScheduledHandlerConfig = {
    autoErrorLogging: true,
  };

  let scheduledHandler: ScheduledHandler<Env> | null = null;
  let errorHandler: ErrorHandler | null = null;

  return {
    async init(cfg?: ScheduledHandlerConfig): Promise<Result<void, Error>> {
      config = {
        ...config,
        ...cfg,
      };
      return ok(undefined);
    },

    onScheduled(handler: ScheduledHandler<Env>): void {
      scheduledHandler = handler;
    },

    onError(handler: ErrorHandler): void {
      errorHandler = handler;
    },

    async handleScheduled(
      controller: ScheduledController,
      env: Env,
      ctx: ExecutionContext
    ): Promise<void> {
      try {
        if (!scheduledHandler) {
          throw new Error('No scheduled handler registered');
        }

        const event: ScheduledEvent = {
          cron: controller.cron,
          scheduledTime: controller.scheduledTime,
        };

        await Promise.resolve(scheduledHandler(event, env, ctx));
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        if (errorHandler) {
          try {
            await Promise.resolve(errorHandler(err));
          } catch (handlerError) {
            if (config.autoErrorLogging) {
              console.error('Error in error handler:', handlerError);
            }
          }
        } else if (config.autoErrorLogging) {
          console.error('Error in scheduled handler:', err);
        }

        throw error;
      }
    },
  };
}
