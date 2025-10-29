/**
 * Redis Pub/Sub Message Queue Adapter
 *
 * Real implementation using ioredis
 */

import Redis from 'ioredis';
import { ok, err, isOk } from '@servicejs/result';
import {
  createMessageQueueAdapter,
  type MessageQueueAdapter,
  type QueueMessage,
  type QueueProducer,
  type QueueConsumer,
} from '@servicejs/integration-mq';
import type { Result } from '@servicejs/result';

export interface RedisPubSubConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
}

/**
 * Create a Redis Pub/Sub message queue adapter
 *
 * Uses Redis Pub/Sub for lightweight message distribution.
 * Note: Redis Pub/Sub is fire-and-forget (no persistence or acknowledgment).
 * For guaranteed delivery, consider using Redis Streams instead.
 *
 * @example
 * ```typescript
 * const mq = createRedisPubSub();
 *
 * await mq.init({ host: 'localhost', port: 6379 });
 * await mq.start();
 *
 * // Create producer
 * const producerResult = await mq.createProducer();
 * if (producerResult.isOk()) {
 *   const producer = producerResult.value;
 *   await producer.publish('events', {
 *     type: 'user.created',
 *     userId: '123',
 *   });
 *   await producer.close();
 * }
 *
 * // Create consumer
 * const consumerResult = await mq.createConsumer();
 * if (consumerResult.isOk()) {
 *   const consumer = consumerResult.value;
 *   await consumer.subscribe('events', async (msg) => {
 *     console.log('Received:', msg.data);
 *     await msg.ack();
 *   });
 * }
 *
 * // Later...
 * await mq.stop();
 * await mq.destroy();
 * ```
 */
export const createRedisPubSub = (): MessageQueueAdapter => {
  let publishClient: Redis | null = null;
  let subscribeClient: Redis | null = null;
  let config: RedisPubSubConfig | null = null;
  let producerCounter = 0;
  let consumerCounter = 0;

  const adapter = createMessageQueueAdapter(
    {
      name: 'redis-pubsub',
      version: '1.0.0',
      type: 'message-queue',
      platforms: ['node', 'bun'],
      description: 'Redis Pub/Sub message queue adapter',
    },
    {
      onInit: async (cfg) => {
        config = cfg as unknown as RedisPubSubConfig;

        try {
          const redisOptions: {
            host: string;
            port: number;
            password?: string;
            db: number;
            keyPrefix?: string;
          } = {
            host: config.host || 'localhost',
            port: config.port || 6379,
            db: config.db || 0,
          };

          if (config.password !== undefined) {
            redisOptions.password = config.password;
          }

          if (config.keyPrefix !== undefined) {
            redisOptions.keyPrefix = config.keyPrefix;
          }

          publishClient = new Redis(redisOptions);
          subscribeClient = new Redis(redisOptions);

          // Wait for connections
          await Promise.all([
            new Promise((resolve, reject) => {
              publishClient!.once('ready', resolve);
              publishClient!.once('error', reject);
            }),
            new Promise((resolve, reject) => {
              subscribeClient!.once('ready', resolve);
              subscribeClient!.once('error', reject);
            }),
          ]);

          return ok(undefined);
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
      },

      onStart: async () => {
        if (!publishClient || !subscribeClient) {
          return err(new Error('Redis clients not initialized'));
        }
        return ok(undefined);
      },

      onStop: async () => {
        // Clients stay connected, just stop processing
        return ok(undefined);
      },

      onDestroy: async () => {
        if (publishClient) {
          await publishClient.quit();
          publishClient = null;
        }
        if (subscribeClient) {
          await subscribeClient.quit();
          subscribeClient = null;
        }
        config = null;
        return ok(undefined);
      },

      onHealth: async () => {
        if (!publishClient || !subscribeClient) {
          return ok({ status: 'unhealthy', error: new Error('Redis clients not initialized') });
        }

        try {
          await publishClient.ping();
          return ok({ status: 'healthy' });
        } catch (error) {
          return ok({
            status: 'unhealthy',
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      },
    }
  );

  const mqAdapter = adapter as MessageQueueAdapter;

  mqAdapter.createProducer = async (): Promise<Result<QueueProducer, Error>> => {
    if (!publishClient) {
      return err(new Error('Redis clients not initialized'));
    }

    producerCounter++;
    const clientRef = publishClient;

    const producer: QueueProducer = {
      publish: async <T>(
        queueName: string,
        data: T,
        options?: { attributes?: Map<string, string>; delay?: number }
      ): Promise<Result<string, Error>> => {
        try {
          const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          const message = {
            id: messageId,
            data,
            attributes: options?.attributes ? Object.fromEntries(options.attributes) : undefined,
            timestamp: Date.now(),
          };

          // Handle delay if specified
          if (options?.delay) {
            await new Promise((resolve) => setTimeout(resolve, options.delay));
          }

          // Publish to Redis channel
          await clientRef.publish(queueName, JSON.stringify(message));

          return ok(messageId);
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
      },

      close: async (): Promise<Result<void, Error>> => {
        // Producer shares the client, no need to close
        return ok(undefined);
      },
    };

    return ok(producer);
  };

  mqAdapter.createConsumer = async (_options?: { consumerGroup?: string }): Promise<Result<QueueConsumer, Error>> => {
    if (!subscribeClient) {
      return err(new Error('Redis clients not initialized'));
    }

    const consumerId = `consumer-${++consumerCounter}`;
    const clientRef = subscribeClient;
    const subscriptions = new Map<string, (channel: string, message: string) => Promise<void>>();

    const consumer: QueueConsumer = {
      id: consumerId,

      subscribe: async <T>(
        queueName: string,
        handler: (message: QueueMessage<T>) => Promise<void>
      ): Promise<Result<void, Error>> => {
        if (subscriptions.has(queueName)) {
          return err(new Error(`Already subscribed to queue: ${queueName}`));
        }

        try {
          const messageHandler = async (channel: string, message: string) => {
            if (channel !== queueName) return;

            try {
              const parsed = JSON.parse(message) as {
                id: string;
                data: T;
                attributes?: Record<string, string>;
                timestamp: number;
              };

              let acked = false;
              let nacked = false;

              const queueMessage: QueueMessage<T> = parsed.attributes
                ? {
                    id: parsed.id,
                    data: parsed.data,
                    attributes: new Map(Object.entries(parsed.attributes)) as ReadonlyMap<string, string>,
                    timestamp: parsed.timestamp,

                    ack: async (): Promise<Result<void, Error>> => {
                      if (acked || nacked) {
                        return err(new Error('Message already acknowledged'));
                      }
                      acked = true;
                      return ok(undefined);
                    },

                    nack: async (): Promise<Result<void, Error>> => {
                      if (acked || nacked) {
                        return err(new Error('Message already acknowledged'));
                      }
                      nacked = true;
                      return ok(undefined);
                    },
                  }
                : {
                    id: parsed.id,
                    data: parsed.data,
                    timestamp: parsed.timestamp,

                    ack: async (): Promise<Result<void, Error>> => {
                      if (acked || nacked) {
                        return err(new Error('Message already acknowledged'));
                      }
                      acked = true;
                      return ok(undefined);
                    },

                    nack: async (): Promise<Result<void, Error>> => {
                      if (acked || nacked) {
                        return err(new Error('Message already acknowledged'));
                      }
                      nacked = true;
                      return ok(undefined);
                    },
                  };

              await handler(queueMessage);
            } catch (error) {
              console.error(`Error handling message on channel ${channel}:`, error);
            }
          };

          subscriptions.set(queueName, messageHandler);

          // Subscribe to Redis channel
          clientRef.on('message', messageHandler);
          await clientRef.subscribe(queueName);

          return ok(undefined);
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
      },

      unsubscribe: async (queueName: string): Promise<Result<void, Error>> => {
        const handler = subscriptions.get(queueName);
        if (!handler) {
          return err(new Error(`Not subscribed to queue: ${queueName}`));
        }

        try {
          clientRef.off('message', handler);
          await clientRef.unsubscribe(queueName);
          subscriptions.delete(queueName);
          return ok(undefined);
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
      },

      close: async (): Promise<Result<void, Error>> => {
        // Unsubscribe from all channels
        for (const [queueName] of subscriptions) {
          await consumer.unsubscribe(queueName);
        }
        return ok(undefined);
      },
    };

    return ok(consumer);
  };

  mqAdapter.publish = async <T>(queueName: string, data: T): Promise<Result<string, Error>> => {
    const producerResult = await mqAdapter.createProducer();
    if (!isOk(producerResult)) {
      return err(new Error('Failed to create producer'));
    }

    const producer = producerResult.value;
    const result = await producer.publish(queueName, data);
    await producer.close();

    return result;
  };

  return mqAdapter;
};
