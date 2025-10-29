# @servicejs/adapter-rabbitmq

RabbitMQ adapter for ServiceJS integration framework. Provides reliable message queuing using RabbitMQ via AMQP protocol.

## Features

- ✅ **AMQP Protocol**: Industry-standard messaging protocol
- ✅ **Reliable Delivery**: Message persistence and acknowledgment
- ✅ **Work Queues**: Distribute tasks across multiple workers
- ✅ **Message Attributes**: Custom headers and metadata
- ✅ **Type Safe**: Full TypeScript support with strict types
- ✅ **Result-Based**: Never throws, returns `Result<T, E>` types
- ✅ **Production Ready**: Built on battle-tested amqplib

## Installation

```bash
bun add @servicejs/adapter-rabbitmq amqplib
```

## Usage

### Basic Usage

```typescript
import { createRabbitMQAdapter } from '@servicejs/adapter-rabbitmq';
import { isOk } from '@servicejs/result';

const mq = createRabbitMQAdapter();

// Connect
await mq.init({
  host: 'localhost',
  port: 5672,
  username: 'guest',
  password: 'guest',
});
await mq.start();

// Create producer
const producerResult = await mq.createProducer();
if (isOk(producerResult)) {
  const producer = producerResult.value;
  await producer.publish('my-queue', { message: 'Hello!' });
  await producer.close();
}

// Create consumer
const consumerResult = await mq.createConsumer();
if (isOk(consumerResult)) {
  const consumer = consumerResult.value;
  await consumer.subscribe('my-queue', async (msg) => {
    console.log('Received:', msg.data);
    await msg.ack();
  });
}

await mq.stop();
await mq.destroy();
```

### Work Queue Pattern

```typescript
// Multiple consumers process messages from the same queue
const consumer1 = (await mq.createConsumer()).value;
const consumer2 = (await mq.createConsumer()).value;

await consumer1.subscribe('tasks', async (msg) => {
  console.log('Worker 1:', msg.data);
  await msg.ack();
});

await consumer2.subscribe('tasks', async (msg) => {
  console.log('Worker 2:', msg.data);
  await msg.ack();
});

// Messages are distributed across both workers
const producer = (await mq.createProducer()).value;
for (let i = 0; i < 10; i++) {
  await producer.publish('tasks', { task: `Task ${i}` });
}
```

### Message Acknowledgment

```typescript
await consumer.subscribe('tasks', async (msg) => {
  try {
    // Process message
    await processTask(msg.data);

    // Acknowledge successful processing
    await msg.ack();
  } catch (error) {
    // Reject and requeue for retry
    await msg.nack(true); // true = requeue
  }
});
```

### Connection String

```typescript
await mq.init({
  url: 'amqp://user:password@localhost:5672/vhost',
});
```

## API

### `createRabbitMQAdapter()`

Creates a new RabbitMQ adapter instance.

### Configuration

```typescript
interface RabbitMQConfig {
  // Connection URL (overrides other params)
  url?: string;

  // Connection parameters
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  vhost?: string;

  // Connection options
  heartbeat?: number;
  frameMax?: number;
}
```

### Lifecycle Methods

#### `init(config: RabbitMQConfig): Promise<Result<void, Error>>`

Initialize the adapter with configuration.

#### `start(): Promise<Result<void, Error>>`

Connect to RabbitMQ server.

#### `stop(): Promise<Result<void, Error>>`

Close connection and clean up.

#### `destroy(): Promise<Result<void, Error>>`

Release all resources.

### Producer Methods

#### `createProducer(): Promise<Result<MessageQueueProducer, Error>>`

Create a message producer.

#### `publish<T>(queue: string, message: T, options?): Promise<Result<void, Error>>`

Quick publish (creates and closes producer automatically).

### Consumer Methods

#### `createConsumer(): Promise<Result<MessageQueueConsumer, Error>>`

Create a message consumer.

#### `subscribe<T>(queue: string, handler): Promise<Result<void, Error>>`

Subscribe to a queue.

#### `unsubscribe(queue: string): Promise<Result<void, Error>>`

Unsubscribe from a queue.

### Message Object

```typescript
interface Message<T> {
  id: string;
  data: T;
  attributes: ReadonlyMap<string, string>;
  timestamp: number;
  ack(): Promise<Result<void, Error>>;
  nack(requeue?: boolean): Promise<Result<void, Error>>;
}
```

## Best Practices

### 1. Always Acknowledge Messages

```typescript
await consumer.subscribe('tasks', async (msg) => {
  try {
    await processTask(msg.data);
    await msg.ack(); // Always ack or nack
  } catch (error) {
    await msg.nack(true); // Requeue on error
  }
});
```

### 2. Use Work Queues for Load Distribution

```typescript
// Create multiple consumers for the same queue
for (let i = 0; i < 3; i++) {
  const consumer = (await mq.createConsumer()).value;
  await consumer.subscribe('tasks', async (msg) => {
    await processTask(msg.data);
    await msg.ack();
  });
}
```

### 3. Handle Connection Errors

```typescript
const result = await mq.start();
if (!isOk(result)) {
  console.error('Failed to connect:', result.error);
  // Implement retry logic
}
```

### 4. Close Resources Properly

```typescript
// Always close producers and consumers
await producer.close();
await consumer.close();
await mq.stop();
await mq.destroy();
```

## RabbitMQ vs Redis Pub/Sub

**RabbitMQ** (this adapter):

- ✅ Reliable delivery with acknowledgments
- ✅ Message persistence
- ✅ Work queue distribution
- ✅ Better for task queues

**Redis Pub/Sub** (@servicejs/adapter-redis):

- ✅ Lower latency
- ✅ Simpler setup
- ✅ Fan-out broadcasting
- ✅ Better for real-time events

## Examples

See the `examples/` directory:

- `basic-usage.ts` - Producer and consumer basics

Run examples:

```bash
cd packages/adapter-rabbitmq
bun examples/basic-usage.ts
```

## Testing

Tests use Docker to run a RabbitMQ container automatically:

```bash
bun test
```

Docker must be installed and running.

## License

MIT
