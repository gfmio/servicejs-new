# @servicejs/adapter-cloudflare-queues

Cloudflare Queues adapter for ServiceJS.

## Installation

```bash
bun add @servicejs/adapter-cloudflare-queues
```

## Usage

### Producer (Sending Messages)

```typescript
import { createCloudflareQueuesAdapter } from '@servicejs/adapter-cloudflare-queues';
import { isOk } from '@servicejs/result';

interface Env {
  MY_QUEUE: Queue;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const queue = createCloudflareQueuesAdapter();

    await queue.init({
      producerQueue: env.MY_QUEUE,
      queueName: 'my-queue',
    });
    await queue.start();

    // Send single message
    await queue.publish('events', { type: 'user.created', userId: '123' });

    // Send message with delay
    await queue.publish('events', { type: 'reminder' }, 300); // 5 minutes

    // Send batch of messages
    await queue.publishBatch('events', [
      { message: { type: 'user.created', userId: '123' } },
      { message: { type: 'user.updated', userId: '456' }, delaySeconds: 10 },
    ]);

    await queue.stop();
    await queue.destroy();

    return new Response('Messages queued', { status: 202 });
  }
};
```

### Consumer (Receiving Messages)

```typescript
import { createQueueConsumer, filterMessagesByTopic } from '@servicejs/adapter-cloudflare-queues';
import type { MessageBatch } from '@servicejs/adapter-cloudflare-queues';

export default {
  async queue(batch: MessageBatch<any>): Promise<void> {
    // Option 1: Filter by topic
    const userEvents = filterMessagesByTopic(batch, 'user-events');
    for (const msg of userEvents) {
      console.log('User event:', msg.body.data);
      msg.ack(); // Acknowledge successful processing
    }

    // Option 2: Use consumer helper
    const handler = createQueueConsumer(async (message) => {
      console.log('Processing:', message.body.data);

      try {
        // Process message...
        message.ack();
      } catch (error) {
        // Retry with exponential backoff
        const delaySeconds = Math.pow(2, message.attempts - 1) * 5;
        message.retry({ delaySeconds });
      }
    });

    await handler(batch);
  }
};
```

### Wrangler Configuration

#### Producer Configuration

```toml
name = "queue-producer"
main = "src/producer.ts"
compatibility_date = "2024-01-01"

[[queues.producers]]
queue = "my-queue"
binding = "MY_QUEUE"
```

#### Consumer Configuration

```toml
name = "queue-consumer"
main = "src/consumer.ts"
compatibility_date = "2024-01-01"

[[queues.consumers]]
queue = "my-queue"
max_batch_size = 10
max_batch_timeout = 5
max_retries = 3
dead_letter_queue = "my-dlq"
```

## API

### Producer API

- `init(config)` - Initialize with queue binding
- `start()` - Start the adapter
- `stop()` - Stop the adapter
- `destroy()` - Clean up resources
- `health()` - Check queue health
- `publish<T>(topic, message, delaySeconds?)` - Send single message
- `publishBatch<T>(topic, messages)` - Send batch of messages

### Consumer Helpers

- `createQueueConsumer<T>(handler)` - Create a consumer handler
- `filterMessagesByTopic<T>(batch, topic)` - Filter messages by topic

### Message Operations

- `message.ack()` - Acknowledge successful processing
- `message.retry(options?)` - Retry message with optional delay
- `batch.ackAll()` - Acknowledge all messages in batch
- `batch.retryAll(options?)` - Retry all messages in batch

## Configuration

```typescript
interface CloudflareQueuesConfig {
  producerQueue: Queue;  // Queue binding from Cloudflare Worker
  queueName: string;     // Queue name for identification
}
```

## Features

- **Topic-Based Routing** - Messages include topic for filtering
- **Delayed Messages** - Schedule messages for future delivery
- **Batch Operations** - Send multiple messages efficiently
- **Retry Logic** - Built-in retry with exponential backoff
- **Type Safety** - Full TypeScript support with generics
- **Result Types** - Rust-style error handling

## Message Format

Messages are automatically wrapped with metadata:

```typescript
{
  topic: string;        // Topic for routing
  data: T;             // Your message data
  timestamp: number;   // Message creation time
}
```

## Error Handling

```typescript
// In consumer
try {
  // Process message
  message.ack();
} catch (error) {
  // Retry with exponential backoff
  const delaySeconds = Math.min(60, Math.pow(2, message.attempts - 1) * 5);
  message.retry({ delaySeconds });
}
```

## Testing

Tests run in a real Cloudflare Workers environment using Miniflare and Vitest:

```bash
bun test
```

The tests use `@cloudflare/vitest-pool-workers` which:
- Runs tests in an actual Workers environment
- Provides a real Queue binding
- Supports all queue operations (send, sendBatch)
- No mocking required - tests against real Queue API

**Note:** Consumer tests are not included as they require the queue consumer handler to be invoked, which is not directly testable in the unit test environment. For consumer testing, use integration tests or deploy to Cloudflare Workers.

## License

MIT
