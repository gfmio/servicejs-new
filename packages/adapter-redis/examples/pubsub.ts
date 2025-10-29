/**
 * Redis Pub/Sub Example
 *
 * Simple chat demo showing real-time message distribution
 *
 * Prerequisites: Redis server running on localhost:6379
 * Run with: bun examples/pubsub.ts
 */

import { createRedisPubSub } from '../src/index.js';
import { isOk } from '@servicejs/result';

const mq = createRedisPubSub();

// Initialize
console.log('📡 Connecting to Redis...');
await mq.init({ host: 'localhost', port: 6379 });
await mq.start();
console.log('✅ Connected!\n');

// Create consumer for chat messages
const consumerResult = await mq.createConsumer();
if (!isOk(consumerResult)) {
  console.error('Failed to create consumer');
  process.exit(1);
}

const consumer = consumerResult.value;

// Subscribe to chat room
console.log('🔔 Subscribing to chat room "general"...\n');
await consumer.subscribe<{ user: string; message: string; timestamp: number }>('chat:general', async (msg) => {
  const { user, message, timestamp } = msg.data;
  const time = new Date(timestamp).toLocaleTimeString();
  console.log(`[${time}] ${user}: ${message}`);
  await msg.ack();
});

// Create producer for sending messages
const producerResult = await mq.createProducer();
if (!isOk(producerResult)) {
  console.error('Failed to create producer');
  process.exit(1);
}

const producer = producerResult.value;

// Send some demo messages
const messages = [
  { user: 'Alice', message: 'Hello everyone!' },
  { user: 'Bob', message: 'Hey Alice! 👋' },
  { user: 'Charlie', message: "What's up?" },
  { user: 'Alice', message: 'Just testing the new chat system' },
  { user: 'Bob', message: 'Looks great!' },
];

console.log('💬 Simulating chat messages...\n');

for (const msg of messages) {
  await producer.publish('chat:general', {
    ...msg,
    timestamp: Date.now(),
  });
  await new Promise((resolve) => setTimeout(resolve, 500)); // Delay for demo
}

// Wait a bit for all messages to be processed
await new Promise((resolve) => setTimeout(resolve, 1000));

// Cleanup
await consumer.close();
await producer.close();
await mq.stop();
await mq.destroy();

console.log('\n✨ Chat demo complete!');
