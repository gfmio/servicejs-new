/**
 * RabbitMQ Adapter for ServiceJS
 *
 * Provides message queue capabilities using RabbitMQ via AMQP protocol.
 */

import * as amqp from 'amqplib';
import { ok, err, isOk, type Result } from '@servicejs/result';
import {
  createMessageQueueAdapter,
  type MessageQueueAdapter,
  type QueueMessage,
  type QueueProducer,
  type QueueConsumer,
} from '@servicejs/integration-mq';

export interface RabbitMQConfig {
  /**
   * RabbitMQ connection URL
   */
  url?: string;

  /**
   * Connection parameters (alternative to URL)
   */
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  vhost?: string;

  /**
   * Connection options
   */
  heartbeat?: number;
  frameMax?: number;
}

/**
 * Create a RabbitMQ adapter
 *
 * Uses AMQP protocol for reliable message queuing.
 *
 * @example
 * ```typescript
 * const mq = createRabbitMQAdapter();
 *
 * await mq.init({
 *   host: 'localhost',
 *   port: 5672,
 *   username: 'guest',
 *   password: 'guest',
 * });
 * await mq.start();
 *
 * const producer = await mq.createProducer();
 * if (isOk(producer)) {
 *   await producer.value.publish('my-queue', { message: 'Hello!' });
 * }
 *
 * const consumer = await mq.createConsumer();
 * if (isOk(consumer)) {
 *   await consumer.value.subscribe('my-queue', async (msg) => {
 *     console.log('Received:', msg.data);
 *     await msg.ack();
 *   });
 * }
 *
 * await mq.stop();
 * await mq.destroy();
 * ```
 */
export const createRabbitMQAdapter = (): MessageQueueAdapter => {
  let connection: amqp.Connection | null = null;
  let config: RabbitMQConfig | null = null;
  let isConnected = false;

  const adapter = createMessageQueueAdapter(
    {
      name: 'rabbitmq',
      version: '1.0.0',
      type: 'message-queue',
      platforms: ['node', 'bun'],
      description: 'RabbitMQ message queue adapter using AMQP',
    },
    {
      onInit: async (cfg) => {
        config = cfg as unknown as RabbitMQConfig;

        // Validate config
        if (!config.url && !config.host) {
          return err(new Error('Either url or host must be provided'));
        }

        return ok(undefined);
      },

      onStart: async () => {
        if (!config) {
          return err(new Error('Adapter not initialized'));
        }

        try {
          // Build connection URL
          let connectionUrl: string;

          if (config.url) {
            connectionUrl = config.url;
          } else {
            const host = config.host || 'localhost';
            const port = config.port || 5672;
            const username = config.username || 'guest';
            const password = config.password || 'guest';
            const vhost = config.vhost || '/';

            connectionUrl = `amqp://${username}:${password}@${host}:${port}${vhost}`;
          }

          // Connection options
          const options: amqp.Options.Connect = {};
          if (config.heartbeat !== undefined) {
            options.heartbeat = config.heartbeat;
          }
          if (config.frameMax !== undefined) {
            options.frameMax = config.frameMax;
          }

          // Connect
          const conn = await amqp.connect(connectionUrl, options);
          connection = conn as any; // Type assertion to work around amqplib types
          isConnected = true;

          // Handle connection errors
          (connection as any).on('error', (err: Error) => {
            console.error('RabbitMQ connection error:', err);
            isConnected = false;
          });

          (connection as any).on('close', () => {
            console.log('RabbitMQ connection closed');
            isConnected = false;
          });

          return ok(undefined);
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
      },

      onStop: async () => {
        if (!connection) {
          return ok(undefined);
        }

        try {
          await (connection as any).close();
          isConnected = false;
          return ok(undefined);
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
      },

      onDestroy: async () => {
        connection = null;
        config = null;
        return ok(undefined);
      },

      onHealth: async () => {
        if (!connection || !isConnected) {
          return ok({ status: 'unhealthy', error: new Error('Not connected') });
        }

        try {
          // Verify connection is healthy by checking the connection object
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

  // Implement createProducer
  adapter.createProducer = async (): Promise<Result<QueueProducer, Error>> => {
    if (!connection) {
      return err(new Error('Not connected to RabbitMQ'));
    }

    try {
      const channel = await (connection as any).createChannel();

      const producer: QueueProducer = {
        publish: async <T = unknown>(
          queueName: string,
          data: T,
          options?: { attributes?: Map<string, string> }
        ): Promise<Result<string, Error>> => {
          try {
            // Ensure queue exists
            await channel.assertQueue(queueName, { durable: true });

            // Build message
            const content = Buffer.from(JSON.stringify(data));

            // Build headers from attributes
            const headers: Record<string, unknown> = {};
            if (options?.attributes) {
              options.attributes.forEach((value, key) => {
                headers[key] = value;
              });
            }

            // Generate message ID
            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Publish message
            channel.sendToQueue(queueName, content, {
              persistent: true,
              headers,
              messageId,
            });

            return ok(messageId);
          } catch (error) {
            return err(error instanceof Error ? error : new Error(String(error)));
          }
        },

        close: async (): Promise<Result<void, Error>> => {
          try {
            await channel.close();
            return ok(undefined);
          } catch (error) {
            return err(error instanceof Error ? error : new Error(String(error)));
          }
        },
      };

      return ok(producer);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

  // Implement createConsumer
  adapter.createConsumer = async (): Promise<Result<QueueConsumer, Error>> => {
    if (!connection) {
      return err(new Error('Not connected to RabbitMQ'));
    }

    try {
      const channel = await (connection as any).createChannel();
      const subscriptions = new Map<string, amqp.Replies.Consume>();
      const consumerId = `consumer_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const consumer: QueueConsumer = {
        id: consumerId,

        subscribe: async <T = unknown>(
          queueName: string,
          handler: (message: QueueMessage<T>) => Promise<void>
        ): Promise<Result<void, Error>> => {
          try {
            // Ensure queue exists
            await channel.assertQueue(queueName, { durable: true });

            // Set prefetch to 1 for fair dispatch
            await channel.prefetch(1);

            // Consume messages
            const consumeResult = await channel.consume(queueName, async (msg: amqp.ConsumeMessage | null) => {
              if (!msg) return;

              try {
                // Parse message
                const data = JSON.parse(msg.content.toString()) as T;

                // Build attributes from headers
                const attributes = new Map<string, string>();
                if (msg.properties.headers) {
                  for (const [key, value] of Object.entries(msg.properties.headers)) {
                    if (typeof value === 'string') {
                      attributes.set(key, value);
                    } else if (value !== null && value !== undefined) {
                      attributes.set(key, String(value));
                    }
                  }
                }

                // Create message object
                let acknowledged = false;

                const message: QueueMessage<T> = {
                  id: msg.properties.messageId || `${Date.now()}-${Math.random()}`,
                  data,
                  attributes,
                  timestamp: msg.properties.timestamp || Date.now(),

                  ack: async (): Promise<Result<void, Error>> => {
                    if (acknowledged) {
                      return err(new Error('Message already acknowledged'));
                    }

                    try {
                      channel.ack(msg);
                      acknowledged = true;
                      return ok(undefined);
                    } catch (error) {
                      return err(error instanceof Error ? error : new Error(String(error)));
                    }
                  },

                  nack: async (): Promise<Result<void, Error>> => {
                    if (acknowledged) {
                      return err(new Error('Message already acknowledged'));
                    }

                    try {
                      channel.nack(msg, false, true); // requeue by default
                      acknowledged = true;
                      return ok(undefined);
                    } catch (error) {
                      return err(error instanceof Error ? error : new Error(String(error)));
                    }
                  },
                };

                // Call handler
                await handler(message);
              } catch (error) {
                console.error('Error processing message:', error);
                // Nack and requeue on error
                channel.nack(msg, false, true);
              }
            });

            subscriptions.set(queueName, consumeResult);
            return ok(undefined);
          } catch (error) {
            return err(error instanceof Error ? error : new Error(String(error)));
          }
        },

        unsubscribe: async (queueName: string): Promise<Result<void, Error>> => {
          const subscription = subscriptions.get(queueName);
          if (!subscription) {
            return err(new Error(`Not subscribed to queue: ${queueName}`));
          }

          try {
            await channel.cancel(subscription.consumerTag);
            subscriptions.delete(queueName);
            return ok(undefined);
          } catch (error) {
            return err(error instanceof Error ? error : new Error(String(error)));
          }
        },

        close: async (): Promise<Result<void, Error>> => {
          try {
            // Cancel all subscriptions
            for (const subscription of subscriptions.values()) {
              await channel.cancel(subscription.consumerTag);
            }
            subscriptions.clear();

            await channel.close();
            return ok(undefined);
          } catch (error) {
            return err(error instanceof Error ? error : new Error(String(error)));
          }
        },
      };

      return ok(consumer);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

  // Implement quick publish
  adapter.publish = async <T = unknown>(
    queueName: string,
    data: T
  ): Promise<Result<string, Error>> => {
    const producerResult = await adapter.createProducer();
    if (!isOk(producerResult)) {
      return err(new Error('Failed to create producer'));
    }

    const producer = producerResult.value;
    const result = await producer.publish(queueName, data);
    await producer.close();

    return result;
  };

  return adapter;
};
