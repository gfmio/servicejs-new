/**
 * NATS Wildcard Subscriptions Example
 *
 * This example demonstrates using wildcards for flexible topic matching.
 *
 * NATS supports two wildcards:
 * - * (asterisk) matches a single token
 * - > (greater than) matches one or more tokens
 *
 * Prerequisites:
 * - Start NATS: docker run -d -p 4222:4222 nats:latest
 * - Run: bun run examples/wildcards.ts
 */

import { createNatsAdapter } from '../src/nats.js';

async function main() {
  console.log('=== NATS Wildcard Subscriptions Example ===\n');

  // Create adapter
  const nats = createNatsAdapter();

  // Initialize and start
  console.log('1. Connecting to NATS...');
  await nats.init({
    servers: 'nats://localhost:4222',
    name: 'wildcards-example',
  });
  await nats.start();
  console.log('✓ Connected to NATS\n');

  // Subscribe with different wildcard patterns
  console.log('2. Setting up wildcard subscriptions...\n');

  // Pattern 1: Single token wildcard (*)
  // Matches: events.user, events.order, events.payment
  // Does NOT match: events.user.created, events
  await nats.subscribe('events.*', async (message) => {
    console.log(`  [events.*] ${message.subject}:`, message.data);
  });
  console.log('✓ Subscribed to: events.*');

  // Pattern 2: Multi-token wildcard (>)
  // Matches: events.user.created, events.user.updated, events.user.deleted.soft, etc.
  await nats.subscribe('events.user.>', async (message) => {
    console.log(`  [events.user.>] ${message.subject}:`, message.data);
  });
  console.log('✓ Subscribed to: events.user.>');

  // Pattern 3: Combination of wildcards
  // Matches: system.service1.status, system.service2.status, etc.
  await nats.subscribe('system.*.status', async (message) => {
    console.log(`  [system.*.status] ${message.subject}:`, message.data);
  });
  console.log('✓ Subscribed to: system.*.status');

  // Pattern 4: Catch-all
  // Matches: EVERYTHING (use carefully!)
  await nats.subscribe('>', async (message) => {
    console.log(`  [>] ${message.subject}:`, message.data);
  });
  console.log('✓ Subscribed to: >\n');

  // Wait for subscriptions to be ready
  await new Promise(resolve => setTimeout(resolve, 100));

  // Publish messages to demonstrate wildcard matching
  console.log('3. Publishing messages...\n');

  console.log('Publishing to: events.user');
  await nats.publish('events.user', { type: 'general user event' });
  await new Promise(resolve => setTimeout(resolve, 50));
  console.log();

  console.log('Publishing to: events.order');
  await nats.publish('events.order', { type: 'general order event' });
  await new Promise(resolve => setTimeout(resolve, 50));
  console.log();

  console.log('Publishing to: events.user.created');
  await nats.publish('events.user.created', { userId: '123', name: 'Alice' });
  await new Promise(resolve => setTimeout(resolve, 50));
  console.log();

  console.log('Publishing to: events.user.updated');
  await nats.publish('events.user.updated', { userId: '123', changes: { email: 'alice@example.com' } });
  await new Promise(resolve => setTimeout(resolve, 50));
  console.log();

  console.log('Publishing to: events.user.deleted.soft');
  await nats.publish('events.user.deleted.soft', { userId: '123' });
  await new Promise(resolve => setTimeout(resolve, 50));
  console.log();

  console.log('Publishing to: system.service1.status');
  await nats.publish('system.service1.status', { status: 'healthy', uptime: 3600 });
  await new Promise(resolve => setTimeout(resolve, 50));
  console.log();

  console.log('Publishing to: system.service2.status');
  await nats.publish('system.service2.status', { status: 'degraded', uptime: 1800 });
  await new Promise(resolve => setTimeout(resolve, 50));
  console.log();

  console.log('Publishing to: metrics.cpu');
  await nats.publish('metrics.cpu', { usage: 45.2 });
  await new Promise(resolve => setTimeout(resolve, 50));
  console.log();

  // Wait for all messages to be processed
  await new Promise(resolve => setTimeout(resolve, 200));

  console.log('4. Wildcard Pattern Summary:\n');
  console.log('  events.*           - Matches single token after "events"');
  console.log('  events.user.>      - Matches any depth under "events.user"');
  console.log('  system.*.status    - Matches any service status');
  console.log('  >                  - Matches EVERYTHING (use carefully!)\n');

  // Cleanup
  console.log('5. Cleaning up...');
  await nats.stop();
  await nats.destroy();
  console.log('✓ Disconnected from NATS\n');

  console.log('=== Example Complete ===');
}

main().catch(console.error);
