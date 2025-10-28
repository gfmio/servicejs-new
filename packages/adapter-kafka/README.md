# @servicejs/adapter-kafka

Apache Kafka adapter for ServiceJS integration framework. Provides event streaming and message queue capabilities using Kafka.

## Features

- ✅ **Event Streaming**: Distributed event streaming platform
- ✅ **Reliable Delivery**: Message persistence and replication
- ✅ **Consumer Groups**: Parallel processing with load balancing
- ✅ **Message Attributes**: Custom headers and metadata
- ✅ **Type Safe**: Full TypeScript support with strict types
- ✅ **Result-Based**: Never throws, returns `Result<T, E>` types
- ✅ **Production Ready**: Built on battle-tested KafkaJS

## Installation

```bash
bun add @servicejs/adapter-kafka kafkajs
```

## Usage

### Basic Usage

```typescript
import { createKafkaAdapter } from '@servicejs/adapter-kafka';
import { isOk } from '@servicejs/result';

const kafka = createKafkaAdapter();

// Connect
await kafka.init({
  brokers: ['localhost:9092'],
  clientId: 'my-app',
  groupId: 'my-group',
});
await kafka.start();

// Create producer
const producerResult = await kafka.createProducer();
if (isOk(producerResult)) {
  const producer = producerResult.value;
  await producer.publish('events', { type: 'user.created', userId: '123' });
  await producer.close();
}

// Create consumer
const consumerResult = await kafka.createConsumer();
if (isOk(consumerResult)) {
  const consumer = consumerResult.value;
  await consumer.subscribe('events', async (msg) => {
    console.log('Event:', msg.data);
    await msg.ack();
  });
}

await kafka.stop();
await kafka.destroy();
```

### Consumer Groups

```typescript
// Multiple consumers in the same group share the load
const consumer1 = await kafka.createConsumer({ consumerGroup: 'processors' });
const consumer2 = await kafka.createConsumer({ consumerGroup: 'processors' });

// Both subscribe to the same topic
await consumer1.value.subscribe('events', async (msg) => {
  console.log('Consumer 1:', msg.data);
  await msg.ack();
});

await consumer2.value.subscribe('events', async (msg) => {
  console.log('Consumer 2:', msg.data);
  await msg.ack();
});

// Messages are distributed across both consumers
```

### SASL Authentication

```typescript
await kafka.init({
  brokers: ['kafka.example.com:9092'],
  clientId: 'my-app',
  groupId: 'my-group',
  sasl: {
    mechanism: 'scram-sha-256',
    username: 'my-user',
    password: 'my-password',
  },
  ssl: true,
});
```

## API

### `createKafkaAdapter()`

Creates a new Kafka adapter instance.

### Configuration

```typescript
interface KafkaAdapterConfig {
  // Kafka brokers
  brokers: string[];

  // Client ID
  clientId?: string;

  // Consumer group ID
  groupId?: string;

  // SASL authentication
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };

  // SSL/TLS
  ssl?: boolean | {
    rejectUnauthorized?: boolean;
    ca?: string[];
    cert?: string;
    key?: string;
  };

  // Timeouts
  connectionTimeout?: number;
  requestTimeout?: number;
}
```

### Lifecycle Methods

#### `init(config: KafkaAdapterConfig): Promise<Result<void, Error>>`

Initialize the adapter with configuration.

#### `start(): Promise<Result<void, Error>>`

Start the Kafka client.

#### `stop(): Promise<Result<void, Error>>`

Stop the client.

#### `destroy(): Promise<Result<void, Error>>`

Release all resources.

### Producer Methods

#### `createProducer(): Promise<Result<QueueProducer, Error>>`

Create a message producer.

#### `publish<T>(topic: string, data: T): Promise<Result<string, Error>>`

Quick publish (creates and closes producer automatically).

### Consumer Methods

#### `createConsumer(options?): Promise<Result<QueueConsumer, Error>>`

Create a message consumer with optional consumer group.

#### `subscribe<T>(topic: string, handler): Promise<Result<void, Error>>`

Subscribe to a topic.

#### `unsubscribe(topic: string): Promise<Result<void, Error>>`

Unsubscribe from a topic.

### Message Object

```typescript
interface QueueMessage<T> {
  id: string;
  data: T;
  attributes?: ReadonlyMap<string, string>;
  timestamp: number;
  ack(): Promise<Result<void, Error>>;
  nack(): Promise<Result<void, Error>>;
}
```

## Best Practices

### 1. Always Use Consumer Groups

```typescript
// Each consumer group gets all messages
await kafka.createConsumer({ consumerGroup: 'analytics' });
await kafka.createConsumer({ consumerGroup: 'notifications' });

// Consumers in same group share the load
await kafka.createConsumer({ consumerGroup: 'processors' });
await kafka.createConsumer({ consumerGroup: 'processors' });
```

### 2. Handle Errors Gracefully

```typescript
const result = await kafka.start();
if (!isOk(result)) {
  console.error('Failed to connect:', result.error);
  // Implement retry logic
}
```

### 3. Close Resources Properly

```typescript
// Always close producers and consumers
await producer.close();
await consumer.close();
await kafka.stop();
await kafka.destroy();
```

### 4. Use Meaningful Topics

```typescript
// ✅ Good - clear topic names
await producer.publish('user.events', event);
await producer.publish('order.commands', command);

// ❌ Bad - vague topic names
await producer.publish('data', event);
await producer.publish('queue', command);
```

## Kafka vs RabbitMQ

**Kafka** (this adapter):
- ✅ High throughput event streaming
- ✅ Message replay capability
- ✅ Horizontal scalability
- ✅ Better for event sourcing

**RabbitMQ** (@servicejs/adapter-rabbitmq):
- ✅ More routing flexibility
- ✅ Simpler setup
- ✅ Better for task queues
- ✅ Lower latency for small messages

## Examples

See the `examples/` directory:

- `basic-usage.ts` - Producer and consumer basics

Run examples:

```bash
cd packages/adapter-kafka
bun examples/basic-usage.ts
```

## Testing

```bash
bun test
```

## License

MIT
