/**
 * Backpressure Example
 *
 * Demonstrates async capability with backpressure for flow control.
 */

import { createComponent, createCapability } from '@servicejs/core';
import { createFIFOMailbox } from '@servicejs/mailbox';
import { createAsyncCapability } from '../src/asyncCapability.js';

// Messages
type WorkMessage =
  | { readonly type: 'work'; readonly id: number; readonly data: string }
  | { readonly type: 'status' };

// State
interface WorkerState {
  readonly processed: number;
}

// Example 1: Basic Backpressure
console.log('\n=== Example 1: Basic Backpressure ===\n');

const mailbox = createFIFOMailbox<WorkMessage>();
const { component, capability } = createComponent<WorkerState, WorkMessage>(
  'urn:example:worker',
  { processed: 0 },
  (state, message) => {
    switch (message.type) {
      case 'work':
        console.log(`Processing work ${message.id}: ${message.data}`);
        return {
          state: { processed: state.processed + 1 },
          reducer: (s, m) => ({ state: s, effects: [] }),
          effects: [],
        };

      case 'status':
        console.log(`Status: ${state.processed} items processed`);
        return {
          state,
          reducer: (s, m) => ({ state: s, effects: [] }),
          effects: [],
        };
    }
  }
);

const asyncCap = createAsyncCapability(
  createCapability((msg) => mailbox.enqueue(msg)),
  () => mailbox.size(),
  {
    maxQueueSize: 5,
    pollInterval: 10,
  }
);

console.log(`Initial queue size: ${asyncCap.queueSize()}`);
console.log(`Queue is full: ${asyncCap.isFull()}\n`);

// Send messages asynchronously
await asyncCap.sendAsync({ type: 'work', id: 1, data: 'Task 1' });
await asyncCap.sendAsync({ type: 'work', id: 2, data: 'Task 2' });
await asyncCap.sendAsync({ type: 'work', id: 3, data: 'Task 3' });

console.log(`\nQueue size after 3 messages: ${asyncCap.queueSize()}`);
console.log(`Queue is full: ${asyncCap.isFull()}`);

// Example 2: Producer-Consumer with Backpressure
console.log('\n=== Example 2: Producer-Consumer with Backpressure ===\n');

const mailbox2 = createFIFOMailbox<WorkMessage>();
const asyncCap2 = createAsyncCapability(
  createCapability((msg) => mailbox2.enqueue(msg)),
  () => mailbox2.size(),
  {
    maxQueueSize: 3,
    pollInterval: 5,
  }
);

// Fast producer
const producer = async () => {
  console.log('[Producer] Starting to send 10 messages...');

  for (let i = 1; i <= 10; i++) {
    console.log(`[Producer] Sending message ${i}, queue size: ${asyncCap2.queueSize()}`);

    if (asyncCap2.isFull()) {
      console.log(`[Producer] Queue full! Waiting for space...`);
    }

    await asyncCap2.sendAsync({
      type: 'work',
      id: i,
      data: `Message ${i}`,
    });
  }

  console.log('[Producer] Finished sending all messages');
};

// Slow consumer
const consumer = async () => {
  console.log('[Consumer] Starting to process messages...\n');

  for (let i = 0; i < 10; i++) {
    // Wait a bit to simulate slow processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    const msg = mailbox2.dequeue();
    if (msg.type === 'Some') {
      console.log(`[Consumer] Processed: ${(msg.value as WorkMessage).type === 'work' ? (msg.value as any).data : 'unknown'}`);
    }
  }

  console.log('\n[Consumer] Finished processing');
};

// Run producer and consumer concurrently
await Promise.all([producer(), consumer()]);

// Example 3: Multiple Producers with Shared Queue
console.log('\n=== Example 3: Multiple Producers ===\n');

const sharedMailbox = createFIFOMailbox<WorkMessage>();
const sharedAsyncCap = createAsyncCapability(
  createCapability((msg) => sharedMailbox.enqueue(msg)),
  () => sharedMailbox.size(),
  {
    maxQueueSize: 5,
    pollInterval: 5,
  }
);

const producer1 = async () => {
  for (let i = 1; i <= 3; i++) {
    console.log(`[Producer 1] Sending message ${i}`);
    await sharedAsyncCap.sendAsync({
      type: 'work',
      id: i,
      data: `P1-Message${i}`,
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};

const producer2 = async () => {
  for (let i = 1; i <= 3; i++) {
    console.log(`[Producer 2] Sending message ${i}`);
    await sharedAsyncCap.sendAsync({
      type: 'work',
      id: i + 100,
      data: `P2-Message${i}`,
    });
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
};

const consumer2 = async () => {
  for (let i = 0; i < 6; i++) {
    await new Promise((resolve) => setTimeout(resolve, 30));
    const msg = sharedMailbox.dequeue();
    if (msg.type === 'Some') {
      const workMsg = msg.value as any;
      console.log(`[Consumer] Processed: ${workMsg.data}`);
    }
  }
};

await Promise.all([producer1(), producer2(), consumer2()]);

// Example 4: Monitoring Queue State
console.log('\n=== Example 4: Queue Monitoring ===\n');

const monitoredMailbox = createFIFOMailbox<WorkMessage>();
const monitoredCap = createAsyncCapability(
  createCapability((msg) => monitoredMailbox.enqueue(msg)),
  () => monitoredMailbox.size(),
  {
    maxQueueSize: 10,
    pollInterval: 10,
  }
);

// Send messages and monitor state
for (let i = 1; i <= 5; i++) {
  await monitoredCap.sendAsync({ type: 'work', id: i, data: `Work ${i}` });

  console.log(
    `Sent message ${i} | Queue size: ${monitoredCap.queueSize()} | ` +
      `Full: ${monitoredCap.isFull()}`
  );
}

// Example 5: Handling Backpressure in Real Time
console.log('\n=== Example 5: Real-Time Backpressure Handling ===\n');

const realtimeMailbox = createFIFOMailbox<WorkMessage>();
const realtimeCap = createAsyncCapability(
  createCapability((msg) => realtimeMailbox.enqueue(msg)),
  () => realtimeMailbox.size(),
  {
    maxQueueSize: 2,
    pollInterval: 10,
  }
);

const realtimeProducer = async () => {
  for (let i = 1; i <= 5; i++) {
    const startTime = Date.now();

    console.log(`[${Date.now()}] Sending message ${i}...`);
    await realtimeCap.sendAsync({ type: 'work', id: i, data: `RT-${i}` });

    const elapsed = Date.now() - startTime;
    console.log(
      `[${Date.now()}] Message ${i} sent (${elapsed}ms) | Queue: ${realtimeCap.queueSize()}`
    );
  }
};

const realtimeConsumer = async () => {
  await new Promise((resolve) => setTimeout(resolve, 100)); // Start delayed

  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const msg = realtimeMailbox.dequeue();
    if (msg.type === 'Some') {
      console.log(`[${Date.now()}] Consumed message`);
    }
  }
};

await Promise.all([realtimeProducer(), realtimeConsumer()]);

console.log('\n✓ All backpressure examples completed');
