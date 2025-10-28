/**
 * Cloudflare Worker Queue Consumer Example
 *
 * This example demonstrates consuming messages from a Cloudflare Queue.
 *
 * Setup:
 * 1. Create wrangler.toml:
 *    ```toml
 *    name = "queue-consumer"
 *    main = "examples/consumer-worker.ts"
 *    compatibility_date = "2024-01-01"
 *
 *    [[queues.consumers]]
 *    queue = "my-queue"
 *    max_batch_size = 10
 *    max_batch_timeout = 5
 *    max_retries = 3
 *    dead_letter_queue = "my-dlq"
 *    ```
 *
 * 2. Deploy: wrangler deploy
 */

import { createQueueConsumer, filterMessagesByTopic } from '../src/queues.js';
import type { MessageBatch } from '../src/queues.js';

interface UserEvent {
  type: 'created' | 'updated' | 'deleted';
  userId: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

interface OrderEvent {
  type: 'created' | 'completed' | 'cancelled';
  orderId: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export default {
  /**
   * Queue consumer handler
   * This is called automatically by Cloudflare Workers when messages are available
   */
  async queue(batch: MessageBatch<any>): Promise<void> {
    console.log(`Processing batch of ${batch.messages.length} messages from queue: ${batch.queue}`);

    // Process user events
    await processUserEvents(batch);

    // Process order events
    await processOrderEvents(batch);

    // Example: Process messages with custom handler
    await processWithCustomHandler(batch);
  },
};

/**
 * Process user events
 */
async function processUserEvents(batch: MessageBatch<any>): Promise<void> {
  const userEvents = filterMessagesByTopic<UserEvent>(batch, 'user-events');

  for (const message of userEvents) {
    const event = message.body.data;

    try {
      console.log(`Processing user event: ${event.type} for user ${event.userId}`);

      switch (event.type) {
        case 'created':
          await handleUserCreated(event);
          break;
        case 'updated':
          await handleUserUpdated(event);
          break;
        case 'deleted':
          await handleUserDeleted(event);
          break;
      }

      // Acknowledge successful processing
      message.ack();
      console.log(`✓ User event processed: ${message.id}`);
    } catch (error) {
      console.error(`✗ Failed to process user event ${message.id}:`, error);

      // Retry with exponential backoff
      const delaySeconds = Math.min(60, Math.pow(2, message.attempts - 1) * 5);
      message.retry({ delaySeconds });
      console.log(`  Retrying in ${delaySeconds} seconds (attempt ${message.attempts})`);
    }
  }
}

/**
 * Process order events
 */
async function processOrderEvents(batch: MessageBatch<any>): Promise<void> {
  const orderEvents = filterMessagesByTopic<OrderEvent>(batch, 'order-events');

  for (const message of orderEvents) {
    const event = message.body.data;

    try {
      console.log(`Processing order event: ${event.type} for order ${event.orderId}`);

      switch (event.type) {
        case 'created':
          await handleOrderCreated(event);
          break;
        case 'completed':
          await handleOrderCompleted(event);
          break;
        case 'cancelled':
          await handleOrderCancelled(event);
          break;
      }

      message.ack();
      console.log(`✓ Order event processed: ${message.id}`);
    } catch (error) {
      console.error(`✗ Failed to process order event ${message.id}:`, error);
      message.retry();
    }
  }
}

/**
 * Process messages with custom consumer handler
 */
async function processWithCustomHandler(batch: MessageBatch<any>): Promise<void> {
  const handler = createQueueConsumer<any>(async (message) => {
    const event = message.body.data;

    console.log(`Custom handler processing: ${message.id}`);
    console.log(`  Topic: ${message.body.topic}`);
    console.log(`  Attempts: ${message.attempts}`);
    console.log(`  Data:`, event);

    // Custom processing logic
    // ...

    message.ack();
  });

  await handler(batch);
}

/**
 * User event handlers
 */
async function handleUserCreated(event: UserEvent): Promise<void> {
  // Send welcome email
  console.log(`  → Sending welcome email to user ${event.userId}`);

  // Create user profile
  console.log(`  → Creating user profile for ${event.userId}`);

  // Add to analytics
  console.log(`  → Recording user creation in analytics`);
}

async function handleUserUpdated(event: UserEvent): Promise<void> {
  console.log(`  → Updating user profile for ${event.userId}`);
  console.log(`  → Changes:`, event.data);
}

async function handleUserDeleted(event: UserEvent): Promise<void> {
  console.log(`  → Deleting user data for ${event.userId}`);
  console.log(`  → Removing from mailing lists`);
}

/**
 * Order event handlers
 */
async function handleOrderCreated(event: OrderEvent): Promise<void> {
  console.log(`  → Processing payment for order ${event.orderId}`);
  console.log(`  → Notifying warehouse`);
}

async function handleOrderCompleted(event: OrderEvent): Promise<void> {
  console.log(`  → Sending confirmation email for order ${event.orderId}`);
  console.log(`  → Updating inventory`);
}

async function handleOrderCancelled(event: OrderEvent): Promise<void> {
  console.log(`  → Refunding payment for order ${event.orderId}`);
  console.log(`  → Restoring inventory`);
}
