/**
 * Basic webhook sending example
 *
 * This example demonstrates:
 * - Initializing the webhook adapter
 * - Sending webhooks with automatic retries
 * - Tracking delivery status
 */

import { createWebhookAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createWebhookAdapter();

  // Initialize with configuration
  await adapter.init({
    secret: 'your-webhook-secret-key',
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 30000
  });

  // Send a webhook
  console.log('Sending webhook...');
  const result = await adapter.send('https://webhook.site/your-unique-url', {
    event: 'user.created',
    data: {
      userId: '12345',
      email: 'user@example.com',
      name: 'John Doe',
      createdAt: Date.now()
    }
  });

  if (isOk(result)) {
    const response = result.value;
    console.log('Webhook delivered successfully!');
    console.log('  Status Code:', response.statusCode);
    console.log('  Attempts:', response.attempts);
    console.log('  Duration:', response.duration, 'ms');
    console.log('  Success:', response.success);
  } else {
    console.error('Webhook failed:', result.error);
  }

  // List all webhook events
  console.log('\nListing all webhook events...');
  const eventsResult = await adapter.listEvents();

  if (isOk(eventsResult)) {
    console.log(`Total events: ${eventsResult.value.length}`);
    eventsResult.value.forEach(event => {
      console.log(`\nEvent ${event.id}:`);
      console.log('  URL:', event.url);
      console.log('  Event Type:', event.payload.event);
      console.log('  Status:', event.status);
      console.log('  Created:', event.createdAt);
      if (event.response) {
        console.log('  Attempts:', event.response.attempts);
        console.log('  Status Code:', event.response.statusCode);
      }
    });
  }
}

main().catch(console.error);
