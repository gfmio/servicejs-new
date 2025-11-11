/**
 * Cloudflare Workers queue consumer adapter
 */

import { Result, ok, err } from '@servicejs/result';
import type { QueueMessageBatch, QueueHandler, ErrorHandler } from './types';

/**
 * Configuration for queue handler
 */
export interface QueueHandlerConfig {
  /**
   * Enable automatic error logging
   */
  autoErrorLogging?: boolean;

  /**
   * Automatically retry failed messages
   */
  autoRetry?: boolean;

  /**
   * Maximum retry attempts before sending to DLQ
   */
  maxRetries?: number;
}

/**
 * Queue handler adapter
 */
export interface QueueHandlerAdapter<Env = unknown, Body = unknown> {
  /**
   * Initialize the adapter
   */
  init(config?: QueueHandlerConfig): Promise<Result<void, Error>>;

  /**
   * Register a queue message handler
   */
  onQueue(handler: QueueHandler<Env, Body>): void;

  /**
   * Register an error handler
   */
  onError(handler: ErrorHandler): void;

  /**
   * Handle a queue batch (called by Workers runtime)
   */
  handleQueue(batch: MessageBatch<Body>, env: Env, ctx: ExecutionContext): Promise<void>;
}

/**
 * Create a queue consumer handler for Cloudflare Workers
 *
 * @example
 * ```typescript
 * import { createQueueHandler } from '@servicejs/server-cloudflare-workers';
 *
 * interface EmailMessage {
 *   to: string;
 *   subject: string;
 *   body: string;
 * }
 *
 * const handler = createQueueHandler<Env, EmailMessage>();
 * await handler.init({ maxRetries: 3 });
 *
 * handler.onQueue(async (batch, env, ctx) => {
 *   console.log(`Processing ${batch.messages.length} messages from ${batch.queue}`);
 *
 *   for (const message of batch.messages) {
 *     await sendEmail(message.body, env);
 *     message.ack(); // Acknowledge successful processing
 *   }
 * });
 *
 * export default {
 *   queue: (batch, env, ctx) => handler.handleQueue(batch, env, ctx),
 * };
 * ```
 */
export function createQueueHandler<Env = unknown, Body = unknown>(): QueueHandlerAdapter<
  Env,
  Body
> {
  let config: QueueHandlerConfig = {
    autoErrorLogging: true,
    autoRetry: false,
    maxRetries: 3,
  };

  let queueHandler: QueueHandler<Env, Body> | null = null;
  let errorHandler: ErrorHandler | null = null;

  return {
    async init(cfg?: QueueHandlerConfig): Promise<Result<void, Error>> {
      config = {
        ...config,
        ...cfg,
      };
      return ok(undefined);
    },

    onQueue(handler: QueueHandler<Env, Body>): void {
      queueHandler = handler;
    },

    onError(handler: ErrorHandler): void {
      errorHandler = handler;
    },

    async handleQueue(
      batch: MessageBatch<Body>,
      env: Env,
      ctx: ExecutionContext
    ): Promise<void> {
      try {
        if (!queueHandler) {
          throw new Error('No queue handler registered');
        }

        // Convert MessageBatch to QueueMessageBatch
        const queueBatch: QueueMessageBatch<Body> = {
          queue: batch.queue,
          messages: batch.messages.map((msg) => ({
            id: msg.id,
            timestamp: msg.timestamp,
            body: msg.body,
          })),
        };

        await Promise.resolve(queueHandler(queueBatch, env, ctx));

        // Automatically acknowledge all messages if handler completes successfully
        batch.messages.forEach((msg) => {
          try {
            msg.ack();
          } catch (error) {
            if (config.autoErrorLogging) {
              console.error('Error acknowledging message:', error);
            }
          }
        });
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
          console.error('Error in queue handler:', err);
        }

        // Handle retries
        if (config.autoRetry) {
          batch.messages.forEach((msg) => {
            try {
              msg.retry();
            } catch (retryError) {
              if (config.autoErrorLogging) {
                console.error('Error retrying message:', retryError);
              }
            }
          });
        }

        throw error;
      }
    },
  };
}
