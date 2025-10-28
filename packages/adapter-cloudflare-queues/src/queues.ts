/**
 * Cloudflare Queues Adapter
 *
 * Implementation using Cloudflare Workers Queues
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';

/**
 * Cloudflare Queue interface
 * This represents a Queue binding in Cloudflare Workers
 */
export interface Queue<Body = unknown> {
  send(body: Body, options?: QueueSendOptions): Promise<void>;
  sendBatch(messages: Array<MessageSendRequest<Body>>): Promise<void>;
}

export interface QueueSendOptions {
  contentType?: 'text' | 'json' | 'v8';
  delaySeconds?: number;
}

export interface MessageSendRequest<Body = unknown> {
  body: Body;
  contentType?: 'text' | 'json' | 'v8';
  delaySeconds?: number;
}

export interface Message<Body = unknown> {
  readonly id: string;
  readonly timestamp: Date;
  readonly body: Body;
  readonly attempts: number;
  retry(options?: { delaySeconds?: number }): void;
  ack(): void;
}

export interface MessageBatch<Body = unknown> {
  readonly queue: string;
  readonly messages: ReadonlyArray<Message<Body>>;
  retryAll(options?: { delaySeconds?: number }): void;
  ackAll(): void;
}

export interface CloudflareQueuesConfig<T = unknown> {
  /**
   * Queue binding for sending messages
   * This is provided by Cloudflare Workers environment
   */
  producerQueue: Queue<T>;

  /**
   * Queue name for the consumer
   * Used for identification and health checks
   */
  queueName: string;
}

export interface QueueMessage<T = unknown> {
  id: string;
  data: T;
  timestamp: number;
  attempts: number;
}

export interface QueueAdapter {
  init(config: CloudflareQueuesConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  publish<T>(topic: string, message: T, delaySeconds?: number): Promise<Result<void, Error>>;
  publishBatch<T>(topic: string, messages: Array<{ message: T; delaySeconds?: number }>): Promise<Result<void, Error>>;
}

/**
 * Handler type for processing messages from queue consumer
 * This is used in the queue consumer handler function
 */
export type QueueConsumerHandler<T = unknown> = (batch: MessageBatch<T>) => Promise<void>;

/**
 * Create a Cloudflare Queues adapter
 *
 * @example
 * ```typescript
 * // Producer (sending messages)
 * const queue = createCloudflareQueuesAdapter();
 *
 * await queue.init({
 *   producerQueue: env.MY_QUEUE,
 *   queueName: 'my-queue'
 * });
 * await queue.start();
 *
 * // Publish message
 * await queue.publish('events', { type: 'user.created', userId: '123' });
 *
 * // Publish batch
 * await queue.publishBatch('events', [
 *   { message: { type: 'user.created', userId: '123' } },
 *   { message: { type: 'user.updated', userId: '456' }, delaySeconds: 10 }
 * ]);
 *
 * // Consumer (receiving messages)
 * export default {
 *   async queue(batch: MessageBatch<any>): Promise<void> {
 *     for (const message of batch.messages) {
 *       console.log('Received:', message.body);
 *       message.ack(); // Acknowledge successful processing
 *     }
 *   }
 * };
 * ```
 */
export const createCloudflareQueuesAdapter = (): QueueAdapter => {
  let producerQueue: Queue<any> | null = null;
  let queueName: string | null = null;

  return {
    init: async (config: CloudflareQueuesConfig): Promise<Result<void, Error>> => {
      try {
        producerQueue = config.producerQueue;
        queueName = config.queueName;
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!producerQueue) {
        return err(new Error('Producer queue not initialized'));
      }
      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      // Cloudflare Queues doesn't require explicit stop
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      producerQueue = null;
      queueName = null;
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!producerQueue || !queueName) {
        return ok({
          status: 'unhealthy',
          error: new Error('Producer queue not initialized'),
        });
      }

      // Cloudflare Queues doesn't provide a health check API
      // We can only verify that the queue binding exists
      return ok({ status: 'healthy' });
    },

    publish: async <T>(topic: string, message: T, delaySeconds?: number): Promise<Result<void, Error>> => {
      if (!producerQueue) {
        return err(new Error('Producer queue not initialized'));
      }

      try {
        // Wrap message with metadata
        const wrappedMessage = {
          topic,
          data: message,
          timestamp: Date.now(),
        };

        const options: QueueSendOptions = { contentType: 'json' };
        if (delaySeconds !== undefined) {
          options.delaySeconds = delaySeconds;
        }

        await producerQueue.send(wrappedMessage, options);
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    publishBatch: async <T>(
      topic: string,
      messages: Array<{ message: T; delaySeconds?: number }>
    ): Promise<Result<void, Error>> => {
      if (!producerQueue) {
        return err(new Error('Producer queue not initialized'));
      }

      try {
        const batchMessages: Array<MessageSendRequest<any>> = messages.map(({ message, delaySeconds }) => {
          const request: MessageSendRequest<any> = {
            body: {
              topic,
              data: message,
              timestamp: Date.now(),
            },
            contentType: 'json' as const,
          };
          if (delaySeconds !== undefined) {
            request.delaySeconds = delaySeconds;
          }
          return request;
        });

        await producerQueue.sendBatch(batchMessages);
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};

/**
 * Helper to create a queue consumer handler
 *
 * @example
 * ```typescript
 * export default {
 *   async queue(batch: MessageBatch<any>): Promise<void> {
 *     await createQueueConsumer<{ type: string; userId: string }>(async (message) => {
 *       console.log('Processing:', message.data);
 *       // Process message...
 *       message.ack(); // Acknowledge successful processing
 *     })(batch);
 *   }
 * };
 * ```
 */
export const createQueueConsumer = <T = unknown>(
  handler: (message: Message<{ topic: string; data: T; timestamp: number }>) => Promise<void>
): QueueConsumerHandler<{ topic: string; data: T; timestamp: number }> => {
  return async (batch: MessageBatch<{ topic: string; data: T; timestamp: number }>) => {
    // Process messages sequentially
    for (const message of batch.messages) {
      try {
        await handler(message);
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
        // Don't ack on error - message will be retried
      }
    }
  };
};

/**
 * Helper to filter messages by topic in consumer
 *
 * @example
 * ```typescript
 * export default {
 *   async queue(batch: MessageBatch<any>): Promise<void> {
 *     const userEvents = filterMessagesByTopic(batch, 'user-events');
 *     for (const msg of userEvents) {
 *       console.log('User event:', msg.body.data);
 *       msg.ack();
 *     }
 *   }
 * };
 * ```
 */
export const filterMessagesByTopic = <T>(
  batch: MessageBatch<{ topic: string; data: T; timestamp: number }>,
  topic: string
): Array<Message<{ topic: string; data: T; timestamp: number }>> => {
  return Array.from(batch.messages).filter(msg => msg.body.topic === topic);
};
