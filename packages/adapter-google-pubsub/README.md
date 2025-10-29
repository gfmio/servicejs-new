# @servicejs/adapter-google-pubsub

Google Cloud Pub/Sub adapter for messaging

## Installation

```bash
npm install @servicejs/adapter-google-pubsub @google-cloud/pubsub
```

## Features

- ✅ Topic management (create, delete, list)
- ✅ Message publishing with attributes
- ✅ Batch publishing
- ✅ Pull subscriptions (polling)
- ✅ Push subscriptions (streaming)
- ✅ Message ordering with ordering keys
- ✅ Dead letter topics
- ✅ Message filtering
- ✅ Acknowledgment and deadline modification
- ✅ Type-safe with TypeScript
- ✅ Result-based error handling
- ✅ Pub/Sub emulator support for testing

## Usage

### Basic Publishing

```typescript
import { createGooglePubSubAdapter } from '@servicejs/adapter-google-pubsub';
import { isOk } from '@servicejs/result';

const pubsub = createGooglePubSubAdapter();

await pubsub.init({
  projectId: 'my-gcp-project',
  keyFilename: '/path/to/service-account-key.json',
});

await pubsub.start();

// Create topic
await pubsub.createTopic('events');

// Publish message
const result = await pubsub.publish('events', {
  userId: '123',
  action: 'created',
  timestamp: Date.now(),
});

if (isOk(result)) {
  console.log('Message ID:', result.value.messageId);
}
```

### Pull Subscription

```typescript
// Create subscription
await pubsub.createSubscription('events', 'events-pull', {
  ackDeadlineSeconds: 30,
});

// Pull messages
const pullResult = await pubsub.pull('events-pull', {
  maxMessages: 10,
});

if (isOk(pullResult)) {
  for (const msg of pullResult.value) {
    console.log('Received:', msg.data);

    // Process message...

    // Acknowledge
    await pubsub.acknowledge('events-pull', [msg.ackId]);
  }
}
```

### Push Subscription (Streaming)

```typescript
// Create subscription
await pubsub.createSubscription('events', 'events-push');

// Subscribe with streaming
const subscribeResult = await pubsub.subscribe('events-push', async (msg) => {
  console.log('Received:', msg.data);
  console.log('Attributes:', msg.attributes);

  // Process message asynchronously
  await processMessage(msg.data);

  // Acknowledge
  msg.ack();
});

if (isOk(subscribeResult)) {
  // Unsubscribe when done
  // subscribeResult.value.unsubscribe();
}
```

### Message Attributes

```typescript
await pubsub.publish(
  'events',
  { userId: '123' },
  {
    attributes: {
      type: 'user.created',
      version: '1.0',
      source: 'api',
    },
  }
);
```

### Message Ordering

```typescript
// Create subscription with ordering
await pubsub.createSubscription('events', 'ordered-sub', {
  enableMessageOrdering: true,
});

// Publish with ordering key
await pubsub.publish(
  'events',
  { sequence: 1 },
  { orderingKey: 'user-123' }
);

await pubsub.publish(
  'events',
  { sequence: 2 },
  { orderingKey: 'user-123' }
);

// Messages with same ordering key are delivered in order
```

### Batch Publishing

```typescript
const batchResult = await pubsub.publishBatch('events', [
  { data: { msg: 'first' } },
  { data: { msg: 'second' }, options: { attributes: { priority: 'high' } } },
  { data: { msg: 'third' }, options: { orderingKey: 'batch-1' } },
]);

if (isOk(batchResult)) {
  console.log('Published messages:', batchResult.value.messageIds);
}
```

### Dead Letter Topics

```typescript
// Create dead letter topic
await pubsub.createTopic('dead-letters');

// Create subscription with DLQ
await pubsub.createSubscription('events', 'events-with-dlq', {
  deadLetterPolicy: {
    deadLetterTopic: 'dead-letters',
    maxDeliveryAttempts: 5,
  },
});

// Messages that fail 5 times go to dead-letters topic
```

## Configuration

```typescript
interface GooglePubSubConfig {
  projectId: string;                 // GCP project ID
  credentials?: {
    client_email: string;
    private_key: string;
  };
  keyFilename?: string;              // Path to service account key file
  apiEndpoint?: string;              // For testing with emulator
}
```

## API Reference

### Topic Operations

```typescript
await pubsub.createTopic(topicName: string): Promise<Result<{ name: string }, Error>>
await pubsub.deleteTopic(topicName: string): Promise<Result<void, Error>>
await pubsub.listTopics(): Promise<Result<string[], Error>>
await pubsub.topicExists(topicName: string): Promise<Result<boolean, Error>>
```

### Publishing

```typescript
await pubsub.publish(
  topicName: string,
  data: any,
  options?: {
    orderingKey?: string;
    attributes?: Record<string, string>;
  }
): Promise<Result<{ messageId: string }, Error>>

await pubsub.publishBatch(
  topicName: string,
  messages: Array<{ data: any; options?: PublishOptions }>
): Promise<Result<{ messageIds: string[] }, Error>>
```

### Subscription Operations

```typescript
await pubsub.createSubscription(
  topicName: string,
  subscriptionName: string,
  config?: {
    ackDeadlineSeconds?: number;
    enableMessageOrdering?: boolean;
    filter?: string;
    deadLetterPolicy?: {
      deadLetterTopic: string;
      maxDeliveryAttempts: number;
    };
  }
): Promise<Result<{ name: string }, Error>>

await pubsub.deleteSubscription(subscriptionName: string): Promise<Result<void, Error>>
await pubsub.listSubscriptions(topicName?: string): Promise<Result<string[], Error>>
await pubsub.subscriptionExists(subscriptionName: string): Promise<Result<boolean, Error>>
```

### Pull-based Consumption

```typescript
await pubsub.pull(
  subscriptionName: string,
  options?: {
    maxMessages?: number;
    returnImmediately?: boolean;
  }
): Promise<Result<Array<{
  id: string;
  data: any;
  attributes: Record<string, string>;
  publishTime: Date;
  ackId: string;
}>, Error>>

await pubsub.acknowledge(
  subscriptionName: string,
  ackIds: string[]
): Promise<Result<void, Error>>

await pubsub.modifyAckDeadline(
  subscriptionName: string,
  ackIds: string[],
  seconds: number
): Promise<Result<void, Error>>
```

### Push-based Consumption

```typescript
await pubsub.subscribe(
  subscriptionName: string,
  handler: (message: {
    id: string;
    data: any;
    attributes: Record<string, string>;
    publishTime: Date;
    ack: () => void;
    nack: () => void;
  }) => void | Promise<void>
): Promise<Result<{ unsubscribe: () => void }, Error>>
```

## Use Cases

### Event-Driven Microservices

```typescript
// Service A publishes events
await pubsub.createTopic('user-events');
await pubsub.publish('user-events', {
  type: 'user.created',
  userId: '123',
  email: 'user@example.com',
});

// Service B subscribes
await pubsub.createSubscription('user-events', 'email-service');
await pubsub.subscribe('email-service', async (msg) => {
  if (msg.data.type === 'user.created') {
    await sendWelcomeEmail(msg.data.email);
  }
  msg.ack();
});
```

### Real-Time Analytics

```typescript
// Publish analytics events
await pubsub.publish('analytics', {
  event: 'page_view',
  page: '/products',
  userId: '123',
  timestamp: Date.now(),
});

// Multiple analytics services subscribe
await pubsub.createSubscription('analytics', 'dashboard-service');
await pubsub.createSubscription('analytics', 'reporting-service');
await pubsub.createSubscription('analytics', 'ml-service');
```

### Task Queue Processing

```typescript
// Add tasks to queue
await pubsub.publish('tasks', {
  type: 'image.resize',
  imageUrl: 's3://bucket/image.jpg',
  sizes: [100, 200, 400],
});

// Workers pull tasks
while (true) {
  const result = await pubsub.pull('task-workers', { maxMessages: 10 });

  if (isOk(result)) {
    for (const msg of result.value) {
      try {
        await processTask(msg.data);
        await pubsub.acknowledge('task-workers', [msg.ackId]);
      } catch (error) {
        // Extend deadline to retry
        await pubsub.modifyAckDeadline('task-workers', [msg.ackId], 60);
      }
    }
  }

  await sleep(1000);
}
```

### IoT Data Ingestion

```typescript
// IoT devices publish sensor data
await pubsub.publish(
  'sensor-data',
  {
    deviceId: 'device-001',
    temperature: 22.5,
    humidity: 65,
    timestamp: Date.now(),
  },
  {
    attributes: {
      location: 'warehouse-a',
      deviceType: 'temperature-sensor',
    },
  }
);

// Processing pipeline subscribes
await pubsub.subscribe('sensor-data-sub', async (msg) => {
  // Store in time-series database
  await storeMetric(msg.data);

  // Check thresholds
  if (msg.data.temperature > 30) {
    await sendAlert(msg.data.deviceId);
  }

  msg.ack();
});
```

## Testing with Pub/Sub Emulator

```bash
# Install and start emulator
gcloud components install pubsub-emulator
gcloud beta emulators pubsub start --host-port=localhost:8085
```

```typescript
import { GenericContainer } from 'testcontainers';

const container = await new GenericContainer('gcr.io/google.com/cloudsdktool/google-cloud-cli:emulators')
  .withCommand(['gcloud', 'beta', 'emulators', 'pubsub', 'start', '--host-port=0.0.0.0:8085'])
  .withExposedPorts(8085)
  .start();

const pubsub = createGooglePubSubAdapter();
await pubsub.init({
  projectId: 'test-project',
  apiEndpoint: `${container.getHost()}:${container.getMappedPort(8085)}`,
});
```

## Pull vs Push Subscriptions

### Pull Subscriptions

**Pros:**
- Application controls message flow
- Better for batch processing
- Lower latency for high-throughput scenarios
- Explicit acknowledgment control

**Cons:**
- Application must poll for messages
- More complex error handling

**Use When:**
- You need flow control
- Processing messages in batches
- Variable processing times
- Need to control concurrency

### Push Subscriptions (Streaming)

**Pros:**
- Real-time message delivery
- Simpler code (event-driven)
- Automatic connection management
- Built-in retry logic

**Cons:**
- Less control over flow
- Higher memory usage for high volumes

**Use When:**
- Real-time processing required
- Low to medium message volume
- Simpler processing logic
- Want automatic delivery

## Best Practices

1. **Use Message Attributes**: Tag messages for filtering and routing
2. **Enable Message Ordering**: Use ordering keys for sequenced events
3. **Set Appropriate Ack Deadlines**: Match your processing time
4. **Implement Dead Letter Topics**: Handle poison messages
5. **Use Batch Publishing**: Reduce API calls and improve throughput
6. **Monitor Unacked Messages**: Track subscription health
7. **Use Filters**: Reduce unnecessary message delivery
8. **Handle Nacks Carefully**: Understand redelivery behavior

## Error Handling

```typescript
const result = await pubsub.publish('topic', data);

if (isErr(result)) {
  console.error('Failed to publish:', result.error);
  // Handle error (retry, log, etc.)
}

// Pull with error handling
const pullResult = await pubsub.pull('subscription');

if (isOk(pullResult)) {
  for (const msg of pullResult.value) {
    try {
      await processMessage(msg.data);
      await pubsub.acknowledge('subscription', [msg.ackId]);
    } catch (error) {
      console.error('Processing failed:', error);
      // Nack by not acknowledging (message will be redelivered)
      // Or extend deadline to retry later
      await pubsub.modifyAckDeadline('subscription', [msg.ackId], 60);
    }
  }
}
```

## Examples

- `examples/basic.ts` - Topic management, publishing, pull and push subscriptions

## Related GCP Services

- **Cloud Functions**: Serverless event handlers
- **Cloud Run**: Containerized event processors
- **Dataflow**: Stream and batch data processing
- **BigQuery**: Analytics and data warehousing

## License

MIT
