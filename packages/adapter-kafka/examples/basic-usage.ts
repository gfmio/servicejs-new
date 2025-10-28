/**
 * Basic Kafka Usage Example
 *
 * Prerequisites: Kafka server running on localhost:9092
 * Run with: bun examples/basic-usage.ts
 */

import { createKafkaAdapter } from '../src/kafka.js';
import { isOk } from '@servicejs/result';

const kafka = createKafkaAdapter();

// Initialize
console.log('📡 Connecting to Kafka...');
await kafka.init({
  brokers: ['localhost:9092'],
  clientId: 'servicejs-example',
  groupId: 'example-group',
});
await kafka.start();
console.log('✅ Connected!\n');

// Create consumer first
const consumerResult = await kafka.createConsumer();
if (!isOk(consumerResult)) {
  console.error('Failed to create consumer');
  process.exit(1);
}

const consumer = consumerResult.value;

// Subscribe to events
console.log('🔔 Subscribing to events topic...\n');
await consumer.subscribe<{ type: string; data: unknown }>('events', async (msg) => {
  console.log(`[Event Received] ${msg.data.type}`);
  console.log('Data:', msg.data.data);
  await msg.ack();
  console.log();
});

// Give consumer time to start
await new Promise((resolve) => setTimeout(resolve, 1000));

// Create producer
const producerResult = await kafka.createProducer();
if (!isOk(producerResult)) {
  console.error('Failed to create producer');
  process.exit(1);
}

const producer = producerResult.value;

// Publish events
console.log('💬 Publishing events...\n');

const events = [
  { type: 'user.created', data: { userId: '123', name: 'Alice' } },
  { type: 'order.placed', data: { orderId: '456', amount: 99.99 } },
  { type: 'payment.completed', data: { paymentId: '789', status: 'success' } },
];

for (const event of events) {
  await producer.publish('events', event);
  await new Promise((resolve) => setTimeout(resolve, 500));
}

// Wait for processing
await new Promise((resolve) => setTimeout(resolve, 2000));

// Cleanup
await consumer.close();
await producer.close();
await kafka.stop();
await kafka.destroy();

console.log('✨ Example complete!');
