/**
 * Basic NATS Pub/Sub Example
 *
 * This example demonstrates basic publish-subscribe messaging with NATS.
 *
 * Prerequisites:
 * - Start NATS: docker run -d -p 4222:4222 nats:latest
 * - Run: bun run examples/basic-pubsub.ts
 */

import { createNatsAdapter } from '../src/nats.js';
import { isOk, isErr } from '@servicejs/result';

async function main() {
  console.log('=== NATS Basic Pub/Sub Example ===\n');

  // Create adapter
  const nats = createNatsAdapter();

  // Initialize and start
  console.log('1. Connecting to NATS...');
  const initResult = await nats.init({
    servers: 'nats://localhost:4222',
    name: 'basic-pubsub-example',
  });

  if (isErr(initResult)) {
    console.error('Failed to initialize:', initResult.error.message);
    return;
  }

  await nats.start();
  console.log('✓ Connected to NATS\n');

  // Check health
  console.log('2. Checking health...');
  const healthResult = await nats.health();
  if (isOk(healthResult)) {
    console.log(`✓ NATS is ${healthResult.value.status}\n`);
  }

  // Subscribe to events
  console.log('3. Subscribing to events...');
  const received: Array<any> = [];

  await nats.subscribe('events.user', async (message) => {
    console.log(`  📨 Received on ${message.subject}:`, message.data);
    received.push(message.data);
  });

  console.log('✓ Subscribed to events.user\n');

  // Wait for subscription to be ready
  await new Promise(resolve => setTimeout(resolve, 100));

  // Publish some events
  console.log('4. Publishing events...');

  await nats.publish('events.user', {
    type: 'user.created',
    userId: '123',
    name: 'Alice',
  });
  console.log('✓ Published: user.created');

  await nats.publish('events.user', {
    type: 'user.updated',
    userId: '123',
    changes: { email: 'alice@example.com' },
  });
  console.log('✓ Published: user.updated');

  await nats.publish('events.user', {
    type: 'user.deleted',
    userId: '123',
  });
  console.log('✓ Published: user.deleted\n');

  // Wait for messages to be processed
  await new Promise(resolve => setTimeout(resolve, 200));

  // Summary
  console.log('5. Summary');
  console.log(`✓ Received ${received.length} messages\n`);

  // Cleanup
  console.log('6. Cleaning up...');
  await nats.stop();
  await nats.destroy();
  console.log('✓ Disconnected from NATS\n');

  console.log('=== Example Complete ===');
}

main().catch(console.error);
