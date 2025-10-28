# @servicejs/integration-mq

Message queue adapter interfaces for ServiceJS - AMQP, Kafka, NATS, and cloud queue integrations.

## Overview

This package provides interfaces for creating message queue adapters in ServiceJS. It defines standard patterns for message brokers with lifecycle management, producer/consumer patterns, message acknowledgment, and health monitoring.

## Features

- **Producer/Consumer Pattern**: Separate producer and consumer interfaces
- **Message Acknowledgment**: ack/nack support for reliable message processing
- **Consumer Groups**: Support for multiple consumers with load balancing
- **Standard Lifecycle**: init, start, stop, destroy
- **Health Monitoring**: Built-in health checks
- **Type Safety**: Fully typed with TypeScript

## Supported Message Queues

- AMQP (RabbitMQ)
- Kafka
- NATS
- Redis Pub/Sub
- Cloud queues (AWS SQS, Google Cloud Pub/Sub, Azure Service Bus)

## Installation

```bash
bun add @servicejs/integration-mq
```

## Usage

### Creating a Message Queue Adapter

```typescript
import { createMessageQueueAdapter, type MessageQueueAdapter } from '@servicejs/integration-mq';
import { ok, err } from '@servicejs/result';

const mq = createMessageQueueAdapter(
  {
    name: 'my-message-queue',
    version: '1.0.0',
    type: 'message-queue',
    platforms: ['node', 'bun'],
    description: 'My message queue adapter',
  },
  {
    onInit: async (config) => {
      // Initialize connection to broker
      return ok(undefined);
    },
    onStart: async () => {
      // Start accepting messages
      return ok(undefined);
    },
    onStop: async () => {
      // Stop accepting messages
      return ok(undefined);
    },
    onDestroy: async () => {
      // Close connections
      return ok(undefined);
    },
    onHealth: async () => {
      return ok({ status: 'healthy' });
    },
  }
);

// Use the message queue
await mq.init({ connection: 'amqp://localhost:5672' });
await mq.start();
```

### Example with Producer and Consumer

```typescript
import { createSimpleMQAdapter } from '@servicejs/integration-mq';

const mq = createSimpleMQAdapter();

await mq.init({ brokers: ['localhost:9092'] });
await mq.start();

// Create producer
const producerResult = await mq.createProducer();
if (producerResult.isOk()) {
  const producer = producerResult.value;

  // Publish messages
  await producer.publish('orders', {
    orderId: '123',
    amount: 100,
    customerId: 'user-456',
  });

  await producer.close();
}

// Create consumer
const consumerResult = await mq.createConsumer({ consumerGroup: 'order-processors' });
if (consumerResult.isOk()) {
  const consumer = consumerResult.value;

  await consumer.subscribe('orders', async (msg) => {
    console.log('Processing order:', msg.data);

    try {
      // Process the order...
      await processOrder(msg.data);

      // Acknowledge successful processing
      await msg.ack();
    } catch (error) {
      // Reject and requeue on error
      await msg.nack();
    }
  });
}

// Later...
await mq.stop();
await mq.destroy();
```

### Quick Publish

For simple use cases, you can publish directly:

```typescript
await mq.publish('events', {
  type: 'user.created',
  userId: '123',
  timestamp: Date.now(),
});
```

## API Reference

### QueueMessage

```typescript
interface QueueMessage<T = unknown> {
  readonly id: string;
  readonly data: T;
  readonly attributes?: ReadonlyMap<string, string>;
  readonly timestamp: number;

  ack(): Promise<Result<void, Error>>;
  nack(): Promise<Result<void, Error>>;
}
```

### QueueProducer

```typescript
interface QueueProducer {
  publish<T>(
    queue: string,
    data: T,
    options?: {
      attributes?: Map<string, string>;
      delay?: number;
    }
  ): Promise<Result<string, Error>>;

  close(): Promise<Result<void, Error>>;
}
```

### QueueConsumer

```typescript
interface QueueConsumer {
  readonly id: string;

  subscribe<T>(
    queue: string,
    handler: (message: QueueMessage<T>) => Promise<void>
  ): Promise<Result<void, Error>>;

  unsubscribe(queue: string): Promise<Result<void, Error>>;

  close(): Promise<Result<void, Error>>;
}
```

### MessageQueueAdapter

```typescript
interface MessageQueueAdapter extends Integration {
  createProducer(): Promise<Result<QueueProducer, Error>>;
  createConsumer(options?: { consumerGroup?: string }): Promise<Result<QueueConsumer, Error>>;
  publish<T>(queue: string, data: T): Promise<Result<string, Error>>;
}
```

## Creating Custom Adapters

To create a custom message queue adapter for RabbitMQ:

```typescript
import { createMessageQueueAdapter } from '@servicejs/integration-mq';
import { ok, err } from '@servicejs/result';
import * as amqp from 'amqplib';

export const createRabbitMQAdapter = (): MessageQueueAdapter => {
  let connection: amqp.Connection | null = null;
  let channel: amqp.Channel | null = null;

  const adapter = createMessageQueueAdapter(
    {
      name: 'rabbitmq',
      version: '1.0.0',
      type: 'message-queue',
      platforms: ['node'],
      description: 'RabbitMQ adapter',
    },
    {
      onInit: async (config) => {
        const url = (config as { url: string }).url;

        try {
          connection = await amqp.connect(url);
          channel = await connection.createChannel();
          return ok(undefined);
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
      },

      onStart: async () => {
        if (!connection || !channel) {
          return err(new Error('Not initialized'));
        }
        return ok(undefined);
      },

      onStop: async () => {
        if (channel) {
          await channel.close();
        }
        return ok(undefined);
      },

      onDestroy: async () => {
        if (connection) {
          await connection.close();
          connection = null;
          channel = null;
        }
        return ok(undefined);
      },

      onHealth: async () => {
        if (!connection || !channel) {
          return ok({ status: 'unhealthy', error: new Error('Not initialized') });
        }

        // Check connection
        if (!connection || connection['connection'].stream.destroyed) {
          return ok({ status: 'unhealthy', error: new Error('Connection lost') });
        }

        return ok({ status: 'healthy' });
      },
    }
  );

  const mqAdapter = adapter as MessageQueueAdapter;

  mqAdapter.createProducer = async (): Promise<Result<QueueProducer, Error>> => {
    if (!channel) {
      return err(new Error('Channel not initialized'));
    }

    const channelRef = channel;

    const producer: QueueProducer = {
      publish: async <T>(queueName: string, data: T, options?: { attributes?: Map<string, string>; delay?: number }): Promise<Result<string, Error>> => {
        try {
          // Ensure queue exists
          await channelRef.assertQueue(queueName, { durable: true });

          const messageId = `${Date.now()}-${Math.random()}`;
          const headers: Record<string, string> = {};

          if (options?.attributes) {
            for (const [key, value] of options.attributes) {
              headers[key] = value;
            }
          }

          channelRef.sendToQueue(
            queueName,
            Buffer.from(JSON.stringify(data)),
            {
              persistent: true,
              messageId,
              headers,
            }
          );

          return ok(messageId);
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
      },

      close: async (): Promise<Result<void, Error>> => {
        // Producer doesn't need explicit close with shared channel
        return ok(undefined);
      },
    };

    return ok(producer);
  };

  mqAdapter.createConsumer = async (options?: { consumerGroup?: string }): Promise<Result<QueueConsumer, Error>> => {
    if (!channel) {
      return err(new Error('Channel not initialized'));
    }

    const channelRef = channel;
    const consumerId = `consumer-${Date.now()}`;
    const subscriptions = new Map<string, string>();

    const consumer: QueueConsumer = {
      id: consumerId,

      subscribe: async <T>(queueName: string, handler: (message: QueueMessage<T>) => Promise<void>): Promise<Result<void, Error>> => {
        try {
          // Ensure queue exists
          await channelRef.assertQueue(queueName, { durable: true });

          // Start consuming
          const { consumerTag } = await channelRef.consume(queueName, async (msg) => {
            if (!msg) return;

            const data = JSON.parse(msg.content.toString()) as T;
            const attributes = new Map<string, string>();

            if (msg.properties.headers) {
              for (const [key, value] of Object.entries(msg.properties.headers)) {
                attributes.set(key, String(value));
              }
            }

            let acked = false;
            let nacked = false;

            const queueMessage: QueueMessage<T> = {
              id: msg.properties.messageId || `${Date.now()}`,
              data,
              attributes,
              timestamp: msg.properties.timestamp || Date.now(),

              ack: async (): Promise<Result<void, Error>> => {
                if (acked || nacked) {
                  return err(new Error('Message already acknowledged'));
                }
                try {
                  channelRef.ack(msg);
                  acked = true;
                  return ok(undefined);
                } catch (error) {
                  return err(error instanceof Error ? error : new Error(String(error)));
                }
              },

              nack: async (): Promise<Result<void, Error>> => {
                if (acked || nacked) {
                  return err(new Error('Message already acknowledged'));
                }
                try {
                  channelRef.nack(msg, false, true); // Requeue
                  nacked = true;
                  return ok(undefined);
                } catch (error) {
                  return err(error instanceof Error ? error : new Error(String(error)));
                }
              },
            };

            await handler(queueMessage);
          });

          subscriptions.set(queueName, consumerTag);
          return ok(undefined);
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
      },

      unsubscribe: async (queueName: string): Promise<Result<void, Error>> => {
        const consumerTag = subscriptions.get(queueName);
        if (!consumerTag) {
          return err(new Error(`Not subscribed to queue: ${queueName}`));
        }

        try {
          await channelRef.cancel(consumerTag);
          subscriptions.delete(queueName);
          return ok(undefined);
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
      },

      close: async (): Promise<Result<void, Error>> => {
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
    if (producerResult.isErr()) {
      return err(producerResult.error);
    }

    const producer = producerResult.value;
    const result = await producer.publish(queueName, data);
    await producer.close();

    return result;
  };

  return mqAdapter;
};
```

## Message Processing Patterns

### At-Least-Once Delivery

```typescript
await consumer.subscribe('orders', async (msg) => {
  try {
    await processOrder(msg.data);
    await msg.ack(); // Only ack after successful processing
  } catch (error) {
    console.error('Failed to process order:', error);
    await msg.nack(); // Requeue for retry
  }
});
```

### Dead Letter Queue

```typescript
const MAX_RETRIES = 3;

await consumer.subscribe('orders', async (msg) => {
  const retryCount = parseInt(msg.attributes?.get('retry-count') || '0');

  try {
    await processOrder(msg.data);
    await msg.ack();
  } catch (error) {
    if (retryCount >= MAX_RETRIES) {
      // Move to dead letter queue
      await mq.publish('orders-dlq', {
        original: msg.data,
        error: String(error),
        retries: retryCount,
      });
      await msg.ack(); // Remove from main queue
    } else {
      // Increment retry count and requeue
      await msg.nack();
    }
  }
});
```

### Fan-Out Pattern

```typescript
// Publisher
await producer.publish('events', {
  type: 'user.created',
  userId: '123',
});

// Multiple consumers can subscribe to the same queue
// Each consumer in different consumer groups receives a copy

// Email service
await emailConsumer.subscribe('events', async (msg) => {
  if (msg.data.type === 'user.created') {
    await sendWelcomeEmail(msg.data.userId);
    await msg.ack();
  }
});

// Analytics service
await analyticsConsumer.subscribe('events', async (msg) => {
  if (msg.data.type === 'user.created') {
    await trackUserCreation(msg.data.userId);
    await msg.ack();
  }
});
```

## Related Packages

- **[@servicejs/integrations](../integrations)**: Base integration framework
- **[@servicejs/integration-server](../integration-server)**: Server adapters
- **[@servicejs/integration-database](../integration-database)**: Database adapters

## Testing

Run tests:

```bash
bun test
```

## License

MIT
