/**
 * Batching Example
 *
 * Demonstrates message batching for improved efficiency.
 */

import { createCapability } from '@servicejs/core';
import { createBatchingCapability, type BatchMessage } from '../src/batching.js';

// Messages
interface LogMessage {
  readonly type: 'log';
  readonly level: 'info' | 'warn' | 'error';
  readonly message: string;
  readonly timestamp: number;
}

// Example 1: Basic Batching
console.log('\n=== Example 1: Basic Batching ===\n');

const batches: BatchMessage<LogMessage>[] = [];
const batchCapability = createCapability<BatchMessage<LogMessage>>((msg) => {
  batches.push(msg);
  console.log(`📦 Batch received with ${msg.messages.length} messages`);
  msg.messages.forEach((m, i) => {
    console.log(`  ${i + 1}. [${m.level}] ${m.message}`);
  });
});

const batcher = createBatchingCapability(batchCapability, {
  maxBatchSize: 3,
  maxBatchDelay: 10000,
});

console.log(`Initial batch size: ${batcher.getBatchSize()}\n`);

// Send individual messages
batcher.send({
  type: 'log',
  level: 'info',
  message: 'Application started',
  timestamp: Date.now(),
});

batcher.send({
  type: 'log',
  level: 'info',
  message: 'Database connected',
  timestamp: Date.now(),
});

console.log(`\nCurrent batch size: ${batcher.getBatchSize()}`);

// Third message triggers flush
batcher.send({
  type: 'log',
  level: 'info',
  message: 'Server listening',
  timestamp: Date.now(),
});

console.log(`Batch size after flush: ${batcher.getBatchSize()}`);

// Example 2: Time-Based Flushing
console.log('\n=== Example 2: Time-Based Flushing ===\n');

const batches2: BatchMessage<LogMessage>[] = [];
const batchCapability2 = createCapability<BatchMessage<LogMessage>>((msg) => {
  batches2.push(msg);
  console.log(
    `📦 Time-based batch (${msg.messages.length} messages) ` +
      `[${Date.now()}]`
  );
});

const batcher2 = createBatchingCapability(batchCapability2, {
  maxBatchSize: 100,
  maxBatchDelay: 500,
});

// Send messages over time
console.log('Sending messages...');
batcher2.send({
  type: 'log',
  level: 'info',
  message: 'Message 1',
  timestamp: Date.now(),
});

await new Promise((resolve) => setTimeout(resolve, 200));

batcher2.send({
  type: 'log',
  level: 'info',
  message: 'Message 2',
  timestamp: Date.now(),
});

console.log('Waiting for time-based flush (500ms)...');
await new Promise((resolve) => setTimeout(resolve, 350));

console.log('Flush should have occurred');

// Example 3: Manual Flush
console.log('\n=== Example 3: Manual Flush ===\n');

const batches3: BatchMessage<LogMessage>[] = [];
const batchCapability3 = createCapability<BatchMessage<LogMessage>>((msg) => {
  batches3.push(msg);
  console.log(`📦 Manual batch with ${msg.messages.length} messages`);
});

const batcher3 = createBatchingCapability(batchCapability3, {
  maxBatchSize: 100,
  maxBatchDelay: 60000,
});

// Add messages
batcher3.send({
  type: 'log',
  level: 'info',
  message: 'Message 1',
  timestamp: Date.now(),
});

batcher3.send({
  type: 'log',
  level: 'warn',
  message: 'Message 2',
  timestamp: Date.now(),
});

console.log(`Batch size before flush: ${batcher3.getBatchSize()}`);

// Manual flush
const flushedCount = batcher3.flush();
console.log(`Flushed ${flushedCount} messages`);
console.log(`Batch size after flush: ${batcher3.getBatchSize()}`);

// Example 4: High Throughput Batching
console.log('\n=== Example 4: High Throughput Batching ===\n');

const batches4: BatchMessage<LogMessage>[] = [];
const batchCapability4 = createCapability<BatchMessage<LogMessage>>((msg) => {
  batches4.push(msg);
  console.log(`📦 Batch ${batches4.length}: ${msg.messages.length} messages`);
});

const batcher4 = createBatchingCapability(batchCapability4, {
  maxBatchSize: 10,
  maxBatchDelay: 1000,
  onFlush: (size) => {
    console.log(`  ✓ Flushed ${size} messages`);
  },
});

console.log('Sending 25 messages rapidly...\n');

for (let i = 1; i <= 25; i++) {
  batcher4.send({
    type: 'log',
    level: i % 3 === 0 ? 'error' : 'info',
    message: `Log entry ${i}`,
    timestamp: Date.now(),
  });
}

console.log(`\nTotal batches sent: ${batches4.length}`);
console.log(`Pending messages: ${batcher4.getBatchSize()}`);

// Example 5: Database Bulk Insert Simulation
console.log('\n=== Example 5: Database Bulk Insert ===\n');

interface DBRecord {
  readonly type: 'db-insert';
  readonly table: string;
  readonly data: Record<string, unknown>;
}

const bulkInserts: BatchMessage<DBRecord>[] = [];
const dbCapability = createCapability<BatchMessage<DBRecord>>((msg) => {
  bulkInserts.push(msg);
  console.log(
    `💾 Bulk INSERT: ${msg.messages.length} rows into ${msg.messages[0]?.table}`
  );
  console.log(`  Total batches so far: ${bulkInserts.length}`);
});

const dbBatcher = createBatchingCapability(dbCapability, {
  maxBatchSize: 5,
  maxBatchDelay: 2000,
});

console.log('Inserting user records...\n');

// Simulate inserting user records
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
  { id: 3, name: 'Charlie', email: 'charlie@example.com' },
  { id: 4, name: 'Diana', email: 'diana@example.com' },
  { id: 5, name: 'Eve', email: 'eve@example.com' },
  { id: 6, name: 'Frank', email: 'frank@example.com' },
  { id: 7, name: 'Grace', email: 'grace@example.com' },
];

users.forEach((user) => {
  dbBatcher.send({
    type: 'db-insert',
    table: 'users',
    data: user,
  });
  console.log(`  Queued: ${user.name}`);
});

console.log(`\nPending inserts: ${dbBatcher.getBatchSize()}`);

// Example 6: Network Request Batching
console.log('\n=== Example 6: Network Request Batching ===\n');

interface APIRequest {
  readonly type: 'api-request';
  readonly method: string;
  readonly path: string;
  readonly body?: unknown;
}

const networkBatches: BatchMessage<APIRequest>[] = [];
const networkCapability = createCapability<BatchMessage<APIRequest>>((msg) => {
  networkBatches.push(msg);
  console.log(`🌐 Batch API request with ${msg.messages.length} operations`);
  msg.messages.forEach((req, i) => {
    console.log(`  ${i + 1}. ${req.method} ${req.path}`);
  });
});

const networkBatcher = createBatchingCapability(networkCapability, {
  maxBatchSize: 3,
  maxBatchDelay: 1000,
});

networkBatcher.send({
  type: 'api-request',
  method: 'POST',
  path: '/api/users',
  body: { name: 'Alice' },
});

networkBatcher.send({
  type: 'api-request',
  method: 'PUT',
  path: '/api/users/1',
  body: { name: 'Alice Updated' },
});

networkBatcher.send({
  type: 'api-request',
  method: 'DELETE',
  path: '/api/users/2',
});

// Example 7: Stop and Flush
console.log('\n=== Example 7: Stop and Flush ===\n');

const batches7: BatchMessage<LogMessage>[] = [];
const batchCapability7 = createCapability<BatchMessage<LogMessage>>((msg) => {
  batches7.push(msg);
  console.log(`📦 Final batch: ${msg.messages.length} messages`);
});

const batcher7 = createBatchingCapability(batchCapability7, {
  maxBatchSize: 100,
  maxBatchDelay: 60000,
});

batcher7.send({
  type: 'log',
  level: 'info',
  message: 'Starting shutdown',
  timestamp: Date.now(),
});

batcher7.send({
  type: 'log',
  level: 'info',
  message: 'Cleaning up resources',
  timestamp: Date.now(),
});

batcher7.send({
  type: 'log',
  level: 'info',
  message: 'Shutdown complete',
  timestamp: Date.now(),
});

console.log(`Pending messages before stop: ${batcher7.getBatchSize()}`);

// Stop will flush pending messages
batcher7.stop();

console.log(`Messages after stop: ${batcher7.getBatchSize()}`);

// Example 8: Multiple Batch Types
console.log('\n=== Example 8: Multiple Batch Types ===\n');

const errorBatches: BatchMessage<LogMessage>[] = [];
const infoBatches: BatchMessage<LogMessage>[] = [];

const errorBatchCap = createCapability<BatchMessage<LogMessage>>((msg) => {
  errorBatches.push(msg);
  console.log(`❌ Error batch: ${msg.messages.length} errors`);
});

const infoBatchCap = createCapability<BatchMessage<LogMessage>>((msg) => {
  infoBatches.push(msg);
  console.log(`ℹ️  Info batch: ${msg.messages.length} info messages`);
});

const errorBatcher = createBatchingCapability(errorBatchCap, {
  maxBatchSize: 2,
  maxBatchDelay: 10000,
});

const infoBatcher = createBatchingCapability(infoBatchCap, {
  maxBatchSize: 5,
  maxBatchDelay: 10000,
});

// Send different types
errorBatcher.send({
  type: 'log',
  level: 'error',
  message: 'Database connection failed',
  timestamp: Date.now(),
});

infoBatcher.send({
  type: 'log',
  level: 'info',
  message: 'Request processed',
  timestamp: Date.now(),
});

infoBatcher.send({
  type: 'log',
  level: 'info',
  message: 'Cache updated',
  timestamp: Date.now(),
});

errorBatcher.send({
  type: 'log',
  level: 'error',
  message: 'Authentication failed',
  timestamp: Date.now(),
});

// Example 9: Monitoring Batch Efficiency
console.log('\n=== Example 9: Batch Efficiency Monitoring ===\n');

let totalMessages = 0;
let totalBatches = 0;
const batchSizes: number[] = [];

const monitoredCap = createCapability<BatchMessage<LogMessage>>((msg) => {
  totalMessages += msg.messages.length;
  totalBatches++;
  batchSizes.push(msg.messages.length);
  console.log(`📊 Batch ${totalBatches}: ${msg.messages.length} messages`);
});

const monitoredBatcher = createBatchingCapability(monitoredCap, {
  maxBatchSize: 5,
  maxBatchDelay: 500,
  onFlush: (size) => {
    const avgSize = totalMessages / totalBatches;
    console.log(`  Average batch size: ${avgSize.toFixed(2)}`);
  },
});

// Send messages
for (let i = 1; i <= 12; i++) {
  monitoredBatcher.send({
    type: 'log',
    level: 'info',
    message: `Message ${i}`,
    timestamp: Date.now(),
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
}

// Wait for final flush
await new Promise((resolve) => setTimeout(resolve, 600));

console.log(`\n📈 Statistics:`);
console.log(`  Total messages: ${totalMessages}`);
console.log(`  Total batches: ${totalBatches}`);
console.log(`  Average batch size: ${(totalMessages / totalBatches).toFixed(2)}`);
console.log(`  Batch sizes: ${batchSizes.join(', ')}`);

console.log('\n✓ All batching examples completed');
