# @servicejs/adapter-webhook

Webhook adapter for sending webhooks with retry logic, signature verification, and event tracking.

## Features

- **Automatic Retries**: Configurable retry logic with exponential backoff
- **Signature Verification**: HMAC-SHA256 signature generation and verification
- **Event Tracking**: Track webhook delivery status and history
- **Timeout Handling**: AbortController-based request cancellation
- **Type-Safe API**: Full TypeScript support with Result types
- **Custom Headers**: Add custom headers per webhook
- **Delivery Tracking**: Monitor webhook delivery attempts and outcomes

## Installation

```bash
npm install @servicejs/adapter-webhook
```

## Basic Usage

```typescript
import { createWebhookAdapter } from '@servicejs/adapter-webhook';
import { isOk } from '@servicejs/result';

const adapter = createWebhookAdapter();

// Initialize with configuration
await adapter.init({
  secret: 'your-webhook-secret',
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000
});

// Send a webhook
const result = await adapter.send('https://example.com/webhook', {
  event: 'user.created',
  data: {
    userId: '123',
    email: 'user@example.com',
    createdAt: Date.now()
  }
});

if (isOk(result)) {
  console.log('Webhook delivered:', result.value);
  console.log('Status:', result.value.statusCode);
  console.log('Attempts:', result.value.attempts);
  console.log('Duration:', result.value.duration, 'ms');
}
```

## Examples

### User Registration Webhook

```typescript
import { createWebhookAdapter } from '@servicejs/adapter-webhook';
import { isOk } from '@servicejs/result';

const adapter = createWebhookAdapter();
await adapter.init({
  secret: 'webhook-secret-key',
  maxRetries: 3
});

async function notifyUserRegistration(user: {
  id: string;
  email: string;
  name: string;
}) {
  const result = await adapter.send('https://api.example.com/webhooks/user-created', {
    event: 'user.registered',
    data: {
      userId: user.id,
      email: user.email,
      name: user.name,
      registeredAt: new Date().toISOString()
    }
  });

  if (isOk(result)) {
    console.log(`Webhook delivered in ${result.value.duration}ms`);
    return result.value;
  } else {
    console.error('Webhook failed:', result.error);
    throw result.error;
  }
}

// Usage
const newUser = {
  id: '123',
  email: 'alice@example.com',
  name: 'Alice Smith'
};

await notifyUserRegistration(newUser);
```

### Payment Webhook with Custom Headers

```typescript
import { createWebhookAdapter } from '@servicejs/adapter-webhook';
import { isOk } from '@servicejs/result';

const adapter = createWebhookAdapter();
await adapter.init({
  secret: 'payment-webhook-secret',
  maxRetries: 5, // Important payment events should retry more
  timeout: 15000
});

async function notifyPayment(payment: {
  id: string;
  amount: number;
  currency: string;
  status: string;
}) {
  const result = await adapter.send(
    'https://merchant.example.com/webhooks/payment',
    {
      event: 'payment.completed',
      data: payment
    },
    {
      headers: {
        'X-Payment-ID': payment.id,
        'X-Idempotency-Key': payment.id
      },
      retries: 5 // Override default retries for critical payment webhooks
    }
  );

  if (isOk(result)) {
    if (result.value.success) {
      console.log('Payment webhook delivered successfully');
    } else {
      console.error('Payment webhook failed with status:', result.value.statusCode);
    }
  }
}

// Usage
await notifyPayment({
  id: 'pay_123',
  amount: 99.99,
  currency: 'USD',
  status: 'completed'
});
```

### Webhook Event Tracking

```typescript
import { createWebhookAdapter } from '@servicejs/adapter-webhook';
import { isOk } from '@servicejs/result';

const adapter = createWebhookAdapter();
await adapter.init({ secret: 'webhook-secret' });

// Send multiple webhooks
await adapter.send('https://example.com/webhook1', {
  event: 'test.event1',
  data: { message: 'Hello 1' }
});

await adapter.send('https://example.com/webhook2', {
  event: 'test.event2',
  data: { message: 'Hello 2' }
});

await adapter.send('https://example.com/webhook3', {
  event: 'test.event3',
  data: { message: 'Hello 3' }
});

// List all events
const allEvents = await adapter.listEvents();
if (isOk(allEvents)) {
  console.log('Total events:', allEvents.value.length);
  allEvents.value.forEach(event => {
    console.log(`Event ${event.id}:`, {
      url: event.url,
      status: event.status,
      attempts: event.response?.attempts,
      createdAt: event.createdAt
    });
  });
}

// List only successful events
const successEvents = await adapter.listEvents({ status: 'success' });
if (isOk(successEvents)) {
  console.log('Successful deliveries:', successEvents.value.length);
}

// List only failed events
const failedEvents = await adapter.listEvents({ status: 'failed' });
if (isOk(failedEvents)) {
  console.log('Failed deliveries:', failedEvents.value.length);
}
```

### Signature Verification (Receiver Side)

```typescript
import { createWebhookAdapter } from '@servicejs/adapter-webhook';
import { isOk } from '@servicejs/result';

const adapter = createWebhookAdapter();
await adapter.init({ secret: 'shared-webhook-secret' });

// Express.js webhook receiver example
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-webhook-signature'] as string;
  const payload = req.body.toString('utf8');

  // Verify the signature
  const verifyResult = await adapter.verifySignature(payload, signature);

  if (isOk(verifyResult) && verifyResult.value) {
    // Signature is valid, process the webhook
    const data = JSON.parse(payload);
    console.log('Valid webhook received:', data);

    // Process the webhook event
    await processWebhookEvent(data);

    res.status(200).json({ success: true });
  } else {
    // Invalid signature
    console.error('Invalid webhook signature');
    res.status(401).json({ error: 'Invalid signature' });
  }
});

async function processWebhookEvent(event: any) {
  console.log('Processing event:', event.event);
  // Your webhook processing logic here
}
```

### Multi-Endpoint Webhook Broadcasting

```typescript
import { createWebhookAdapter } from '@servicejs/adapter-webhook';
import { isOk } from '@servicejs/result';

class WebhookBroadcaster {
  private adapter = createWebhookAdapter();
  private endpoints: string[] = [];

  async init(secret: string, endpoints: string[]) {
    await this.adapter.init({
      secret,
      maxRetries: 3,
      retryDelay: 1000
    });
    this.endpoints = endpoints;
  }

  async broadcast(event: string, data: any) {
    const payload = {
      event,
      data,
      timestamp: Date.now(),
      id: crypto.randomUUID()
    };

    const results = await Promise.allSettled(
      this.endpoints.map(url =>
        this.adapter.send(url, payload)
      )
    );

    const summary = {
      total: results.length,
      successful: 0,
      failed: 0,
      results: [] as any[]
    };

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && isOk(result.value)) {
        summary.successful++;
        summary.results.push({
          url: this.endpoints[index],
          status: 'success',
          response: result.value.value
        });
      } else {
        summary.failed++;
        summary.results.push({
          url: this.endpoints[index],
          status: 'failed',
          error: result.status === 'rejected' ? result.reason : 'Unknown error'
        });
      }
    });

    return summary;
  }
}

// Usage
const broadcaster = new WebhookBroadcaster();
await broadcaster.init('webhook-secret', [
  'https://app1.example.com/webhook',
  'https://app2.example.com/webhook',
  'https://app3.example.com/webhook'
]);

const summary = await broadcaster.broadcast('order.completed', {
  orderId: '12345',
  amount: 150.00,
  customer: 'customer@example.com'
});

console.log(`Broadcast: ${summary.successful}/${summary.total} successful`);
summary.results.forEach(r => {
  console.log(`${r.url}: ${r.status}`);
});
```

### Rate-Limited Webhook Queue

```typescript
import { createWebhookAdapter } from '@servicejs/adapter-webhook';
import { isOk } from '@servicejs/result';

class WebhookQueue {
  private adapter = createWebhookAdapter();
  private queue: Array<{ url: string; payload: any }> = [];
  private processing = false;
  private rateLimit: number; // requests per second

  constructor(rateLimit: number = 10) {
    this.rateLimit = rateLimit;
  }

  async init(secret: string) {
    await this.adapter.init({
      secret,
      maxRetries: 3
    });
  }

  enqueue(url: string, payload: any) {
    this.queue.push({ url, payload });
    if (!this.processing) {
      this.process();
    }
  }

  private async process() {
    this.processing = true;
    const delayMs = 1000 / this.rateLimit;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      const result = await this.adapter.send(item.url, item.payload);

      if (isOk(result)) {
        console.log('Webhook sent:', item.payload.event);
      } else {
        console.error('Webhook failed:', result.error);
      }

      // Rate limit delay
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    this.processing = false;
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

// Usage
const queue = new WebhookQueue(5); // 5 webhooks per second
await queue.init('webhook-secret');

// Enqueue many webhooks - they'll be sent at rate-limited pace
for (let i = 0; i < 100; i++) {
  queue.enqueue('https://example.com/webhook', {
    event: 'batch.item',
    data: { index: i }
  });
}

console.log('Queue length:', queue.getQueueLength());
```

### Webhook with Retry Tracking

```typescript
import { createWebhookAdapter } from '@servicejs/adapter-webhook';
import { isOk } from '@servicejs/result';

const adapter = createWebhookAdapter();
await adapter.init({
  secret: 'webhook-secret',
  maxRetries: 5,
  retryDelay: 2000 // 2 seconds base delay
});

async function sendWebhookWithTracking(url: string, event: string, data: any) {
  console.log(`Sending webhook to ${url}...`);

  const startTime = Date.now();
  const result = await adapter.send(url, { event, data });
  const totalTime = Date.now() - startTime;

  if (isOk(result)) {
    const response = result.value;
    console.log('Webhook delivery report:', {
      success: response.success,
      statusCode: response.statusCode,
      attempts: response.attempts,
      duration: response.duration,
      totalTime: totalTime
    });

    if (!response.success) {
      console.warn(`Webhook returned error status: ${response.statusCode}`);
      console.warn('Response body:', response.responseBody);
    }

    return response;
  } else {
    console.error('Webhook failed after all retries:', result.error.message);
    throw result.error;
  }
}

// Usage
await sendWebhookWithTracking(
  'https://example.com/webhook',
  'order.shipped',
  {
    orderId: '12345',
    trackingNumber: 'TRACK123',
    carrier: 'UPS'
  }
);
```

### Bulk Webhook Sender

```typescript
import { createWebhookAdapter } from '@servicejs/adapter-webhook';
import { isOk } from '@servicejs/result';

class BulkWebhookSender {
  private adapter = createWebhookAdapter();

  async init(secret: string) {
    await this.adapter.init({
      secret,
      maxRetries: 3,
      timeout: 10000
    });
  }

  async sendBulk(webhooks: Array<{ url: string; event: string; data: any }>) {
    const results = await Promise.all(
      webhooks.map(async (webhook) => {
        const result = await this.adapter.send(webhook.url, {
          event: webhook.event,
          data: webhook.data
        });

        return {
          url: webhook.url,
          event: webhook.event,
          success: isOk(result) && result.value.success,
          result: isOk(result) ? result.value : result.error
        };
      })
    );

    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };

    return { summary, results };
  }
}

// Usage
const sender = new BulkWebhookSender();
await sender.init('webhook-secret');

const webhooks = [
  {
    url: 'https://app1.example.com/webhook',
    event: 'data.sync',
    data: { recordId: '1', status: 'updated' }
  },
  {
    url: 'https://app2.example.com/webhook',
    event: 'data.sync',
    data: { recordId: '2', status: 'updated' }
  },
  {
    url: 'https://app3.example.com/webhook',
    event: 'data.sync',
    data: { recordId: '3', status: 'updated' }
  }
];

const { summary, results } = await sender.sendBulk(webhooks);
console.log(`Sent ${summary.successful}/${summary.total} webhooks successfully`);

// Log failures
results.filter(r => !r.success).forEach(r => {
  console.error(`Failed to send to ${r.url}:`, r.result);
});
```

## API Reference

### `createWebhookAdapter()`

Creates a new webhook adapter instance.

**Returns**: `WebhookAdapter`

### Lifecycle Methods

#### `init(config: WebhookConfig): Promise<Result<void, Error>>`

Initialize the adapter with configuration.

**Config**:
- `secret?: string` - Shared secret for HMAC signature generation
- `maxRetries?: number` - Maximum retry attempts (default: 3)
- `retryDelay?: number` - Base delay between retries in ms (default: 1000)
- `timeout?: number` - Request timeout in ms (default: 30000)

#### `start(): Promise<Result<void, Error>>`

Start the adapter (no-op for webhooks).

#### `stop(): Promise<Result<void, Error>>`

Stop the adapter (no-op for webhooks).

#### `destroy(): Promise<Result<void, Error>>`

Destroy the adapter and clean up resources.

#### `health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>`

Check adapter health status.

### Webhook Methods

#### `send(url: string, payload: WebhookPayload, options?: WebhookOptions): Promise<Result<WebhookResponse, Error>>`

Send a webhook to the specified URL.

**Parameters**:
- `url` - Target webhook URL
- `payload` - Webhook payload with event and data
- `options` - Optional headers, retries, and timeout overrides

**Returns**: `WebhookResponse` with delivery status, attempts, and duration.

#### `verifySignature(payload: string, signature: string): Promise<Result<boolean, Error>>`

Verify a webhook signature (receiver side).

**Parameters**:
- `payload` - Raw payload string
- `signature` - Signature to verify

**Returns**: `true` if signature is valid, `false` otherwise.

#### `generateSignature(payload: string): Promise<Result<string, Error>>`

Generate a signature for a payload.

**Parameters**:
- `payload` - Payload string to sign

**Returns**: HMAC-SHA256 signature.

#### `listEvents(options?: { limit?: number; status?: 'pending' | 'success' | 'failed' }): Promise<Result<WebhookEvent[], Error>>`

List webhook events with optional filtering.

**Parameters**:
- `limit` - Maximum number of events to return (default: 100)
- `status` - Filter by delivery status

**Returns**: Array of webhook events with delivery information.

### Types

#### `WebhookPayload`

```typescript
interface WebhookPayload {
  event: string;        // Event name (e.g., 'user.created')
  data: any;           // Event data
  timestamp?: number;  // Unix timestamp (auto-generated)
  id?: string;        // Unique event ID (auto-generated)
}
```

#### `WebhookResponse`

```typescript
interface WebhookResponse {
  success: boolean;       // True if webhook delivered successfully
  statusCode: number;     // HTTP status code
  responseBody?: any;     // Response body from webhook receiver
  attempts: number;       // Number of delivery attempts
  duration: number;       // Total delivery time in ms
}
```

#### `WebhookEvent`

```typescript
interface WebhookEvent {
  id: string;             // Unique event ID
  url: string;            // Target URL
  payload: WebhookPayload; // Webhook payload
  response?: WebhookResponse; // Delivery response
  status: 'pending' | 'success' | 'failed';
  createdAt: Date;        // When event was created
  completedAt?: Date;     // When delivery completed
}
```

## Best Practices

1. **Always check Result types**:
   ```typescript
   const result = await adapter.send(url, payload);
   if (isOk(result)) {
     console.log('Success:', result.value);
   } else {
     console.error('Error:', result.error);
   }
   ```

2. **Use secrets for signature verification**:
   ```typescript
   await adapter.init({
     secret: 'your-secure-random-secret'
   });
   ```

3. **Set appropriate retry counts**:
   ```typescript
   // Critical events: more retries
   await adapter.send(url, payload, { retries: 5 });

   // Non-critical events: fewer retries
   await adapter.send(url, payload, { retries: 1 });
   ```

4. **Add idempotency keys for critical webhooks**:
   ```typescript
   await adapter.send(url, payload, {
     headers: {
       'X-Idempotency-Key': uniqueId
     }
   });
   ```

5. **Track webhook events for debugging**:
   ```typescript
   const events = await adapter.listEvents({ status: 'failed' });
   if (isOk(events)) {
     events.value.forEach(event => {
       console.log('Failed webhook:', event.url, event.response);
     });
   }
   ```

## License

MIT
