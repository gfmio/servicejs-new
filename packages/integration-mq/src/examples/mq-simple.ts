/**
 * Simple In-Memory Message Queue Adapter Example
 *
 * Demonstrates how to implement a basic message queue adapter.
 * This is a minimal in-memory example - production adapters would use actual MQ systems.
 */

import { ok, err, type Result, isOk } from '@servicejs/result';
import {
  createMessageQueueAdapter,
  type MessageQueueAdapter,
  type QueueMessage,
  type QueueProducer,
  type QueueConsumer,
} from '../message-queue.js';

/**
 * Simple in-memory message queue (simulates RabbitMQ/Kafka)
 */
class SimpleInMemoryQueue {
  private queues: Map<string, Array<{ id: string; data: unknown; attributes?: Map<string, string> | undefined; timestamp: number }>> = new Map();
  private subscribers: Map<string, Set<(msg: unknown) => Promise<void>>> = new Map();
  private messageCounter = 0;

  async publish(queue: string, data: unknown, attributes?: Map<string, string> | undefined): Promise<string> {
    const messageId = `msg-${++this.messageCounter}`;
    const message = {
      id: messageId,
      data,
      attributes: attributes || undefined,
      timestamp: Date.now(),
    };

    // Store message
    if (!this.queues.has(queue)) {
      this.queues.set(queue, []);
    }
    this.queues.get(queue)!.push(message);

    // Notify subscribers
    const handlers = this.subscribers.get(queue);
    if (handlers && handlers.size > 0) {
      // Deliver to one subscriber (round-robin would be more realistic)
      const handler = handlers.values().next().value;
      if (handler) {
        // Deliver asynchronously
        setTimeout(() => {
          handler(message).catch(console.error);
        }, 0);
      }
    }

    return messageId;
  }

  subscribe(queue: string, handler: (msg: unknown) => Promise<void>): void {
    if (!this.subscribers.has(queue)) {
      this.subscribers.set(queue, new Set());
    }
    this.subscribers.get(queue)!.add(handler);

    // Process any existing messages
    const messages = this.queues.get(queue) || [];
    for (const message of messages) {
      setTimeout(() => {
        handler(message).catch(console.error);
      }, 0);
    }
  }

  unsubscribe(queue: string, handler: (msg: unknown) => Promise<void>): void {
    const handlers = this.subscribers.get(queue);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  clear(queue: string): void {
    this.queues.delete(queue);
    this.subscribers.delete(queue);
  }

  close(): void {
    this.queues.clear();
    this.subscribers.clear();
  }
}

/**
 * Create a simple in-memory message queue adapter
 *
 * This is an example implementation using in-memory storage.
 * Real implementations would use RabbitMQ, Kafka, NATS, etc.
 *
 * @example
 * ```typescript
 * const mq = createSimpleMQAdapter();
 *
 * await mq.init({ brokers: ['localhost:9092'] });
 * await mq.start();
 *
 * // Create producer
 * const producerResult = await mq.createProducer();
 * if (producerResult.isOk()) {
 *   const producer = producerResult.value;
 *   await producer.publish('orders', { orderId: '123', amount: 100 });
 * }
 *
 * // Create consumer
 * const consumerResult = await mq.createConsumer({ consumerGroup: 'order-processors' });
 * if (consumerResult.isOk()) {
 *   const consumer = consumerResult.value;
 *   await consumer.subscribe('orders', async (msg) => {
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
export const createSimpleMQAdapter = (): MessageQueueAdapter => {
  let queue: SimpleInMemoryQueue | null = null;
  let producerCounter = 0;
  let consumerCounter = 0;

  const adapter = createMessageQueueAdapter(
    {
      name: 'simple-mq',
      version: '1.0.0',
      type: 'message-queue',
      platforms: ['node', 'bun'],
      description: 'Simple in-memory message queue example adapter',
    },
    {
      onInit: async (_config) => {
        // In a real implementation, you would connect to the broker here
        // For example: client = new KafkaClient(config.brokers)

        queue = new SimpleInMemoryQueue();
        return ok(undefined);
      },

      onStart: async () => {
        if (!queue) {
          return err(new Error('Queue not initialized'));
        }
        return ok(undefined);
      },

      onStop: async () => {
        // In a real implementation, you might flush pending messages
        return ok(undefined);
      },

      onDestroy: async () => {
        if (queue) {
          queue.close();
          queue = null;
        }
        return ok(undefined);
      },

      onHealth: async () => {
        if (!queue) {
          return ok({ status: 'unhealthy', error: new Error('Queue not initialized') });
        }

        // In a real implementation, you might check broker connectivity
        // For example: await client.ping()

        return ok({ status: 'healthy' });
      },
    }
  );

  // Implement message queue-specific methods
  const mqAdapter = adapter as MessageQueueAdapter;

  mqAdapter.createProducer = async (): Promise<Result<QueueProducer, Error>> => {
    if (!queue) {
      return err(new Error('Queue not initialized'));
    }

    producerCounter++;
    const queueRef = queue;
    let closed = false;

    const producer: QueueProducer = {
      publish: async <T>(queueName: string, data: T, options?: { attributes?: Map<string, string>; delay?: number }): Promise<Result<string, Error>> => {
        if (closed) {
          return err(new Error('Producer is closed'));
        }

        try {
          // In a real implementation, you would handle delays
          if (options?.delay) {
            await new Promise(resolve => setTimeout(resolve, options.delay));
          }

          const messageId = await queueRef.publish(queueName, data, options?.attributes);
          return ok(messageId);
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
      },

      close: async (): Promise<Result<void, Error>> => {
        if (closed) {
          return err(new Error('Producer already closed'));
        }

        // In a real implementation, you might flush pending messages
        closed = true;
        return ok(undefined);
      },
    };

    return ok(producer);
  };

  mqAdapter.createConsumer = async (_options?: { consumerGroup?: string }): Promise<Result<QueueConsumer, Error>> => {
    if (!queue) {
      return err(new Error('Queue not initialized'));
    }

    const consumerId = `consumer-${++consumerCounter}`;
    const queueRef = queue;
    const subscriptions = new Map<string, (msg: unknown) => Promise<void>>();
    let closed = false;

    const consumer: QueueConsumer = {
      id: consumerId,

      subscribe: async <T>(queueName: string, handler: (message: QueueMessage<T>) => Promise<void>): Promise<Result<void, Error>> => {
        if (closed) {
          return err(new Error('Consumer is closed'));
        }

        if (subscriptions.has(queueName)) {
          return err(new Error(`Already subscribed to queue: ${queueName}`));
        }

        try {
          const internalHandler = async (msg: unknown) => {
            const typedMsg = msg as { id: string; data: T; attributes?: Map<string, string> | undefined; timestamp: number };
            let acked = false;
            let nacked = false;

            const ackFn = async (): Promise<Result<void, Error>> => {
              if (acked) {
                return err(new Error('Message already acknowledged'));
              }
              if (nacked) {
                return err(new Error('Message already rejected'));
              }

              // In a real implementation, you would ack to the broker
              acked = true;
              return ok(undefined);
            };

            const nackFn = async (): Promise<Result<void, Error>> => {
              if (acked) {
                return err(new Error('Message already acknowledged'));
              }
              if (nacked) {
                return err(new Error('Message already rejected'));
              }

              // In a real implementation, you would nack to the broker
              // This might requeue the message
              nacked = true;
              return ok(undefined);
            };

            const queueMessage: QueueMessage<T> = typedMsg.attributes
              ? {
                  id: typedMsg.id,
                  data: typedMsg.data,
                  attributes: typedMsg.attributes as ReadonlyMap<string, string>,
                  timestamp: typedMsg.timestamp,
                  ack: ackFn,
                  nack: nackFn,
                }
              : {
                  id: typedMsg.id,
                  data: typedMsg.data,
                  timestamp: typedMsg.timestamp,
                  ack: ackFn,
                  nack: nackFn,
                };

            await handler(queueMessage);
          };

          subscriptions.set(queueName, internalHandler);
          queueRef.subscribe(queueName, internalHandler);

          return ok(undefined);
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
      },

      unsubscribe: async (queueName: string): Promise<Result<void, Error>> => {
        if (closed) {
          return err(new Error('Consumer is closed'));
        }

        const handler = subscriptions.get(queueName);
        if (!handler) {
          return err(new Error(`Not subscribed to queue: ${queueName}`));
        }

        queueRef.unsubscribe(queueName, handler);
        subscriptions.delete(queueName);

        return ok(undefined);
      },

      close: async (): Promise<Result<void, Error>> => {
        if (closed) {
          return err(new Error('Consumer already closed'));
        }

        // Unsubscribe from all queues
        for (const [queueName, handler] of subscriptions.entries()) {
          queueRef.unsubscribe(queueName, handler);
        }
        subscriptions.clear();

        closed = true;
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

/**
 * Example: Create a message queue with producer/consumer
 *
 * @example
 * ```typescript
 * const mq = createSimpleMQAdapter();
 * await mq.init({ brokers: ['localhost:9092'] });
 * await mq.start();
 *
 * // Create producer
 * const producerResult = await mq.createProducer();
 * if (producerResult.isOk()) {
 *   const producer = producerResult.value;
 *
 *   // Publish messages
 *   await producer.publish('orders', {
 *     orderId: '123',
 *     amount: 100,
 *     customerId: 'user-456',
 *   });
 *
 *   await producer.publish('orders', {
 *     orderId: '124',
 *     amount: 200,
 *     customerId: 'user-789',
 *   });
 *
 *   await producer.close();
 * }
 *
 * // Create consumer
 * const consumerResult = await mq.createConsumer({ consumerGroup: 'order-processors' });
 * if (consumerResult.isOk()) {
 *   const consumer = consumerResult.value;
 *
 *   await consumer.subscribe('orders', async (msg) => {
 *     console.log('Processing order:', msg.data);
 *
 *     // Process the order...
 *     try {
 *       // If successful, acknowledge
 *       await msg.ack();
 *     } catch (error) {
 *       // If failed, reject and requeue
 *       await msg.nack();
 *     }
 *   });
 * }
 * ```
 */
export const exampleMQUsage = async () => {
  const mq = createSimpleMQAdapter();

  await mq.init({ brokers: ['localhost:9092'] });
  await mq.start();

  // Create producer
  const producerResult = await mq.createProducer();
  if (!isOk(producerResult)) {
    throw new Error('Failed to create producer');
  }

  const producer = producerResult.value;

  // Publish messages
  await producer.publish('orders', { orderId: '123', amount: 100 });
  await producer.publish('orders', { orderId: '124', amount: 200 });

  // Create consumer
  const consumerResult = await mq.createConsumer({ consumerGroup: 'processors' });
  if (!isOk(consumerResult)) {
    throw new Error('Failed to create consumer');
  }

  const consumer = consumerResult.value;

  const received: unknown[] = [];

  await consumer.subscribe<{ orderId: string; amount: number }>('orders', async (msg) => {
    received.push(msg.data);
    await msg.ack();
  });

  // Give time for messages to be processed
  await new Promise(resolve => setTimeout(resolve, 100));

  return { mq, producer, consumer, received };
};
