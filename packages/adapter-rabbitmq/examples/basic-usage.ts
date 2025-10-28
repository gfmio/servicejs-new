/**
 * Basic RabbitMQ Usage Example
 *
 * Prerequisites: RabbitMQ server running on localhost:5672
 * Run with: bun examples/basic-usage.ts
 */

import { createRabbitMQAdapter } from '../src/rabbitmq.js';
import { isOk } from '@servicejs/result';

const mq = createRabbitMQAdapter();

// Initialize
console.log('📡 Connecting to RabbitMQ...');
await mq.init({ host: 'localhost', port: 5672, username: 'guest', password: 'guest' });
await mq.start();
console.log('✅ Connected!\n');

// Create consumer for task processing
const consumerResult = await mq.createConsumer();
if (!isOk(consumerResult)) {
  console.error('Failed to create consumer');
  process.exit(1);
}

const consumer = consumerResult.value;

// Subscribe to task queue
console.log('🔔 Subscribing to task queue...\n');
await consumer.subscribe<{ task: string; priority: number }>('tasks', async (msg) => {
  const { task, priority } = msg.data;
  console.log(`[Task Received] ${task} (priority: ${priority})`);

  // Simulate processing
  await new Promise((resolve) => setTimeout(resolve, 100));

  console.log(`[Task Complete] ${task}\n`);
  await msg.ack();
});

// Create producer for sending tasks
const producerResult = await mq.createProducer();
if (!isOk(producerResult)) {
  console.error('Failed to create producer');
  process.exit(1);
}

const producer = producerResult.value;

// Send some tasks
console.log('💬 Sending tasks...\n');

const tasks = [
  { task: 'Process user signup', priority: 1 },
  { task: 'Send welcome email', priority: 2 },
  { task: 'Generate analytics report', priority: 3 },
];

for (const task of tasks) {
  await producer.publish('tasks', task);
  await new Promise((resolve) => setTimeout(resolve, 200));
}

// Wait for processing
await new Promise((resolve) => setTimeout(resolve, 1000));

// Cleanup
await consumer.close();
await producer.close();
await mq.stop();
await mq.destroy();

console.log('✨ Example complete!');
