# @servicejs/adapter-redis-mq

Real Redis Pub/Sub message queue adapter for ServiceJS using ioredis.

## Overview

This adapter provides a production-ready message queue implementation using Redis Pub/Sub. It's lightweight, fast, and perfect for real-time event distribution across multiple consumers.

**Note**: Redis Pub/Sub is fire-and-forget (no message persistence or acknowledgment guarantees). For guaranteed delivery, consider using Redis Streams instead.

## Features

- **Redis Pub/Sub**: Lightweight, real-time message distribution
- **Producer/Consumer Pattern**: Separate producer and consumer interfaces
- **Multiple Consumers**: Support for fan-out messaging
- **Full Lifecycle Management**: Standard init → start → stop → destroy flow
- **Health Monitoring**: Built-in health checks with ping
- **Type Safety**: Fully typed with TypeScript

## Installation

```bash
bun add @servicejs/adapter-redis-mq
```

## Requirements

- Redis server running (default: localhost:6379)
- ioredis package (automatically installed)

## Usage

### Basic Pub/Sub

```typescript
import { createRedisMQAdapter } from '@servicejs/adapter-redis-mq';

const mq = createRedisMQAdapter();

await mq.init({ host: 'localhost', port: 6379 });
await mq.start();

// Create producer
const producerResult = await mq.createProducer();
if (producerResult.isOk()) {
  const producer = producerResult.value;

  await producer.publish('events', {
    type: 'user.created',
    userId: '123',
    timestamp: Date.now(),
  });

  await producer.close();
}

// Create consumer
const consumerResult = await mq.createConsumer();
if (consumerResult.isOk()) {
  const consumer = consumerResult.value;

  await consumer.subscribe('events', async (msg) => {
    console.log('Received event:', msg.data);
    await msg.ack(); // Always acknowledge in this adapter
  });
}

// Clean up
await mq.stop();
await mq.destroy();
```

### Quick Publish

For simple one-off messages:

```typescript
await mq.publish('notifications', {
  message: 'Hello World!',
  timestamp: Date.now(),
});
```

### Fan-Out Pattern

Multiple consumers can subscribe to the same channel:

```typescript
// Email service consumer
const emailConsumer = (await mq.createConsumer()).value;
await emailConsumer.subscribe('user.events', async (msg) => {
  if (msg.data.type === 'user.created') {
    await sendWelcomeEmail(msg.data.userId);
    await msg.ack();
  }
});

// Analytics service consumer
const analyticsConsumer = (await mq.createConsumer()).value;
await analyticsConsumer.subscribe('user.events', async (msg) => {
  if (msg.data.type === 'user.created') {
    await trackUserCreation(msg.data.userId);
    await msg.ack();
  }
});

// Both consumers receive all messages
await mq.publish('user.events', {
  type: 'user.created',
  userId: '456',
});
```

## API

### createRedisMQAdapter()

Creates a new Redis Pub/Sub message queue adapter.

Returns: `MessageQueueAdapter`

### Configuration

```typescript
interface RedisMQConfig {
  host?: string;        // Redis host (default: 'localhost')
  port?: number;        // Redis port (default: 6379)
  password?: string;    // Redis password (optional)
  db?: number;          // Redis database number (default: 0)
  keyPrefix?: string;   // Key prefix for all operations (optional)
}
```

### Lifecycle Methods

```typescript
await mq.init(config);    // Initialize Redis connections
await mq.start();         // Start accepting messages
await mq.stop();          // Stop accepting messages (connections stay open)
await mq.destroy();       // Close all connections
const health = await mq.health(); // Check Redis connection health
```

### Producer

```typescript
const producerResult = await mq.createProducer();
const producer = producerResult.value;

// Publish message
await producer.publish(channel, data, options?: {
  attributes?: Map<string, string>;  // Message metadata
  delay?: number;                     // Delay in milliseconds
});

// Close producer (optional, shares connection)
await producer.close();
```

### Consumer

```typescript
const consumerResult = await mq.createConsumer();
const consumer = consumerResult.value;

// Subscribe to channel
await consumer.subscribe(channel, async (msg) => {
  console.log('Message ID:', msg.id);
  console.log('Data:', msg.data);
  console.log('Attributes:', msg.attributes);
  console.log('Timestamp:', msg.timestamp);

  // Always acknowledge (no-op in Redis Pub/Sub)
  await msg.ack();
});

// Unsubscribe from channel
await consumer.unsubscribe(channel);

// Close consumer
await consumer.close();
```

## Examples

### Event-Driven Microservices

```typescript
import { createRedisMQAdapter } from '@servicejs/adapter-redis-mq';

// Service 1: User Service
const userServiceMQ = createRedisMQAdapter();
await userServiceMQ.init({ host: 'localhost' });
await userServiceMQ.start();

async function createUser(email: string, name: string) {
  // ... save user to database ...

  // Publish event
  await userServiceMQ.publish('user.events', {
    type: 'user.created',
    userId: '123',
    email,
    name,
  });
}

// Service 2: Email Service
const emailServiceMQ = createRedisMQAdapter();
await emailServiceMQ.init({ host: 'localhost' });
await emailServiceMQ.start();

const emailConsumer = (await emailServiceMQ.createConsumer()).value;
await emailConsumer.subscribe('user.events', async (msg) => {
  if (msg.data.type === 'user.created') {
    await sendWelcomeEmail(msg.data.email, msg.data.name);
    await msg.ack();
  }
});

// Service 3: Analytics Service
const analyticsServiceMQ = createRedisMQAdapter();
await analyticsServiceMQ.init({ host: 'localhost' });
await analyticsServiceMQ.start();

const analyticsConsumer = (await analyticsServiceMQ.createConsumer()).value;
await analyticsConsumer.subscribe('user.events', async (msg) => {
  if (msg.data.type === 'user.created') {
    await trackSignup(msg.data.userId);
    await msg.ack();
  }
});
```

### Real-Time Notifications

```typescript
const mq = createRedisMQAdapter();
await mq.init({ host: 'localhost' });
await mq.start();

// Backend: Publish notifications
async function notifyUser(userId: string, message: string) {
  await mq.publish(`notifications:${userId}`, {
    message,
    timestamp: Date.now(),
  });
}

// Frontend WebSocket handler: Subscribe to user's notifications
const consumer = (await mq.createConsumer()).value;
await consumer.subscribe(`notifications:${userId}`, async (msg) => {
  // Forward to WebSocket client
  ws.send(JSON.stringify(msg.data));
  await msg.ack();
});
```

### Chat Application

```typescript
const mq = createRedisMQAdapter();
await mq.init({ host: 'localhost' });
await mq.start();

// Send message to room
async function sendChatMessage(roomId: string, userId: string, text: string) {
  await mq.publish(`chat:${roomId}`, {
    userId,
    text,
    timestamp: Date.now(),
  });
}

// Subscribe to room messages
const consumer = (await mq.createConsumer()).value;
await consumer.subscribe(`chat:${roomId}`, async (msg) => {
  // Display message in chat UI
  displayMessage(msg.data);
  await msg.ack();
});
```

## Performance

- **High Throughput**: Redis Pub/Sub is extremely fast (~100k msgs/sec)
- **Low Latency**: Sub-millisecond message delivery
- **Scalable**: Supports thousands of concurrent subscribers
- **Lightweight**: Minimal memory overhead

## Limitations

### No Message Persistence

Messages are only delivered to **currently connected** subscribers. If no subscribers are listening, the message is lost.

**Solution**: Use Redis Streams for guaranteed delivery, or implement your own persistence layer.

### No Acknowledgment Guarantees

The `ack()` and `nack()` methods are no-ops in this adapter (they exist for interface compatibility).

**Solution**: Use Redis Streams or RabbitMQ for guaranteed processing.

### No Message Ordering Guarantees

Messages may arrive out of order if there are network issues or multiple publishers.

**Solution**: Add sequence numbers to your message payload.

## When to Use Redis Pub/Sub

✅ **Good for:**
- Real-time notifications
- Chat applications
- Live updates/dashboards
- Event broadcasting
- Cache invalidation

❌ **Not good for:**
- Task queues (use Redis Streams or RabbitMQ)
- Guaranteed message delivery
- Message persistence
- Complex routing (use RabbitMQ)

## Related Packages

- **[@servicejs/integration-mq](../integration-mq)**: Base message queue adapter interfaces
- **[@servicejs/integrations](../integrations)**: Base integration framework

## License

MIT
