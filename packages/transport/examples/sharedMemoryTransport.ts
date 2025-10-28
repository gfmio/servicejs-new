/**
 * Shared Memory Transport Examples
 *
 * Demonstrates high-performance inter-worker communication using SharedArrayBuffer.
 */

import { createSharedBuffer, createSharedMemoryTransport } from '../src/sharedMemoryTransport.js';
import type { MessageEnvelope } from '../src/transport.js';

// Example 1: Basic Shared Memory Communication
console.log('\n=== Example 1: Basic Shared Memory Communication ===\n');

// Create a shared buffer (8KB ring buffer)
const buffer1 = createSharedBuffer(8192);

// Create transports for sender and receiver
const sender1 = createSharedMemoryTransport({
  urn: 'urn:worker:sender' as any,
  buffer: buffer1,
  role: 'sender',
});

const receiver1 = createSharedMemoryTransport({
  urn: 'urn:worker:receiver' as any,
  buffer: buffer1,
  role: 'receiver',
});

// Connect transports
await sender1.connect();
await receiver1.connect();

// Set up message handler
receiver1.onReceive((envelope) => {
  console.log(`Received: ${JSON.stringify(envelope.message)}`);
});

// Send message
const result1 = await sender1.send({
  from: 'urn:worker:sender' as any,
  to: 'urn:worker:receiver' as any,
  message: { type: 'hello', data: 'world' },
});

console.log(`Send result: ${result1.success ? 'Success' : 'Failed'}`);

// Clean up
await sender1.disconnect();
await receiver1.disconnect();

// Example 2: High-Frequency Messaging
console.log('\n=== Example 2: High-Frequency Messaging ===\n');

const buffer2 = createSharedBuffer(16384); // 16KB buffer for high volume

const sender2 = createSharedMemoryTransport({
  urn: 'urn:hft:sender' as any,
  buffer: buffer2,
  role: 'sender',
});

const receiver2 = createSharedMemoryTransport({
  urn: 'urn:hft:receiver' as any,
  buffer: buffer2,
  role: 'receiver',
});

await sender2.connect();
await receiver2.connect();

let receivedCount = 0;
receiver2.onReceive((envelope) => {
  receivedCount++;
  if (receivedCount % 100 === 0) {
    console.log(`Received ${receivedCount} messages`);
  }
});

// Send burst of messages
const startTime = Date.now();
const messageCount = 1000;

for (let i = 0; i < messageCount; i++) {
  await sender2.send({
    from: 'urn:hft:sender' as any,
    to: 'urn:hft:receiver' as any,
    message: { type: 'tick', price: 100 + Math.random() * 10, timestamp: Date.now() },
  });
}

// Wait for processing
await new Promise((resolve) => setTimeout(resolve, 100));

const endTime = Date.now();
const duration = endTime - startTime;
const throughput = (messageCount / duration) * 1000;

console.log(`Sent ${messageCount} messages in ${duration}ms`);
console.log(`Throughput: ${throughput.toFixed(0)} messages/second`);
console.log(`Received: ${receivedCount} messages`);

await sender2.disconnect();
await receiver2.disconnect();

// Example 3: Bidirectional Communication
console.log('\n=== Example 3: Bidirectional Communication ===\n');

const buffer3a = createSharedBuffer(8192); // Worker A -> Worker B
const buffer3b = createSharedBuffer(8192); // Worker B -> Worker A

const workerA = createSharedMemoryTransport({
  urn: 'urn:worker:a' as any,
  buffer: buffer3a,
  role: 'sender',
});

const workerB = createSharedMemoryTransport({
  urn: 'urn:worker:b' as any,
  buffer: buffer3a,
  role: 'receiver',
});

const workerBSender = createSharedMemoryTransport({
  urn: 'urn:worker:b-sender' as any,
  buffer: buffer3b,
  role: 'sender',
});

const workerAReceiver = createSharedMemoryTransport({
  urn: 'urn:worker:a-receiver' as any,
  buffer: buffer3b,
  role: 'receiver',
});

await workerA.connect();
await workerB.connect();
await workerBSender.connect();
await workerAReceiver.connect();

// Worker B receives requests and sends responses
workerB.onReceive(async (envelope) => {
  console.log(`Worker B received: ${envelope.message.type}`);

  // Send response back
  await workerBSender.send({
    from: 'urn:worker:b' as any,
    to: 'urn:worker:a' as any,
    message: { type: 'response', result: 'processed' },
  });
});

// Worker A receives responses
workerAReceiver.onReceive((envelope) => {
  console.log(`Worker A received response: ${envelope.message.result}`);
});

// Worker A sends request
await workerA.send({
  from: 'urn:worker:a' as any,
  to: 'urn:worker:b' as any,
  message: { type: 'request', task: 'compute' },
});

// Wait for processing
await new Promise((resolve) => setTimeout(resolve, 50));

await workerA.disconnect();
await workerB.disconnect();
await workerBSender.disconnect();
await workerAReceiver.disconnect();

// Example 4: Buffer Full Handling
console.log('\n=== Example 4: Buffer Full Handling ===\n');

const smallBuffer = createSharedBuffer(512); // Very small buffer

const sender4 = createSharedMemoryTransport({
  urn: 'urn:sender:overflow' as any,
  buffer: smallBuffer,
  role: 'sender',
});

const receiver4 = createSharedMemoryTransport({
  urn: 'urn:receiver:overflow' as any,
  buffer: smallBuffer,
  role: 'receiver',
});

await sender4.connect();
await receiver4.connect();

// Don't process messages immediately to fill buffer
const receivedMessages: any[] = [];
receiver4.onReceive((envelope) => {
  receivedMessages.push(envelope.message);
});

// Try to overfill the buffer
let successCount = 0;
let failCount = 0;

for (let i = 0; i < 100; i++) {
  const result = await sender4.send({
    from: 'urn:sender:overflow' as any,
    to: 'urn:receiver:overflow' as any,
    message: { type: 'data', index: i, payload: 'x'.repeat(100) },
  });

  if (result.success) {
    successCount++;
  } else {
    failCount++;
  }
}

console.log(`Sent ${successCount} messages successfully`);
console.log(`Failed to send ${failCount} messages (buffer full)`);
console.log(`Received ${receivedMessages.length} messages`);

await sender4.disconnect();
await receiver4.disconnect();

// Example 5: Zero-Copy Performance Test
console.log('\n=== Example 5: Zero-Copy Performance Test ===\n');

const buffer5 = createSharedBuffer(32768); // 32KB buffer

const sender5 = createSharedMemoryTransport({
  urn: 'urn:perf:sender' as any,
  buffer: buffer5,
  role: 'sender',
});

const receiver5 = createSharedMemoryTransport({
  urn: 'urn:perf:receiver' as any,
  buffer: buffer5,
  role: 'receiver',
});

await sender5.connect();
await receiver5.connect();

const latencies: number[] = [];

receiver5.onReceive((envelope) => {
  const receiveTime = performance.now();
  const sendTime = envelope.message.timestamp;
  const latency = receiveTime - sendTime;
  latencies.push(latency);
});

// Send messages with timestamps
const perfMessageCount = 100;

for (let i = 0; i < perfMessageCount; i++) {
  await sender5.send({
    from: 'urn:perf:sender' as any,
    to: 'urn:perf:receiver' as any,
    message: {
      type: 'perf-test',
      index: i,
      timestamp: performance.now(),
    },
  });

  // Small delay between messages
  await new Promise((resolve) => setTimeout(resolve, 1));
}

// Wait for all messages to be processed
await new Promise((resolve) => setTimeout(resolve, 100));

// Calculate statistics
const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
const minLatency = Math.min(...latencies);
const maxLatency = Math.max(...latencies);

console.log(`Processed ${latencies.length} messages`);
console.log(`Average latency: ${avgLatency.toFixed(3)}ms`);
console.log(`Min latency: ${minLatency.toFixed(3)}ms`);
console.log(`Max latency: ${maxLatency.toFixed(3)}ms`);

await sender5.disconnect();
await receiver5.disconnect();

// Example 6: Multi-Producer Single-Consumer
console.log('\n=== Example 6: Multi-Producer Single-Consumer ===\n');

const buffer6 = createSharedBuffer(16384);

const producer1 = createSharedMemoryTransport({
  urn: 'urn:producer:1' as any,
  buffer: buffer6,
  role: 'sender',
});

const producer2 = createSharedMemoryTransport({
  urn: 'urn:producer:2' as any,
  buffer: buffer6,
  role: 'sender',
});

const consumer = createSharedMemoryTransport({
  urn: 'urn:consumer:main' as any,
  buffer: buffer6,
  role: 'receiver',
});

await producer1.connect();
await producer2.connect();
await consumer.connect();

const consumerMessages: any[] = [];
consumer.onReceive((envelope) => {
  consumerMessages.push({
    from: envelope.from,
    data: envelope.message,
  });
});

// Both producers send messages concurrently
const sends = [
  producer1.send({
    from: 'urn:producer:1' as any,
    to: 'urn:consumer:main' as any,
    message: { type: 'data', source: 'producer1', value: 100 },
  }),
  producer2.send({
    from: 'urn:producer:2' as any,
    to: 'urn:consumer:main' as any,
    message: { type: 'data', source: 'producer2', value: 200 },
  }),
  producer1.send({
    from: 'urn:producer:1' as any,
    to: 'urn:consumer:main' as any,
    message: { type: 'data', source: 'producer1', value: 101 },
  }),
  producer2.send({
    from: 'urn:producer:2' as any,
    to: 'urn:consumer:main' as any,
    message: { type: 'data', source: 'producer2', value: 201 },
  }),
];

await Promise.all(sends);

// Wait for processing
await new Promise((resolve) => setTimeout(resolve, 50));

console.log(`Consumer received ${consumerMessages.length} messages from multiple producers:`);
consumerMessages.forEach((msg) => {
  console.log(`  From ${msg.from}: ${JSON.stringify(msg.data)}`);
});

await producer1.disconnect();
await producer2.disconnect();
await consumer.disconnect();

console.log('\n=== All Shared Memory Transport Examples Complete ===\n');
