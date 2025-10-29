/**
 * Basic Redis Streams adapter usage example
 *
 * Demonstrates event sourcing pattern with consumer groups
 */

import { createRedisStreams } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const streams = createRedisStreams();

  // Initialize
  const initResult = await streams.init({
    host: 'localhost',
    port: 6379,
  });

  if (!isOk(initResult)) {
    console.error('Failed to initialize:', initResult.error);
    return;
  }

  console.log('✓ Initialized Redis Streams adapter');

  await streams.start();
  console.log('✓ Started Redis Streams adapter');

  // Basic stream operations
  console.log('\n=== Basic Stream Operations ===');

  // Add events to stream
  const id1 = await streams.xadd('user-events', {
    type: 'user.created',
    userId: '1',
    name: 'Alice',
  });

  const id2 = await streams.xadd('user-events', {
    type: 'user.updated',
    userId: '1',
    email: 'alice@example.com',
  });

  const id3 = await streams.xadd('user-events', {
    type: 'user.deleted',
    userId: '1',
  });

  console.log('Added 3 events to stream');

  // Check stream length
  const lenResult = await streams.xlen('user-events');
  if (isOk(lenResult)) {
    console.log('Stream length:', lenResult.value);
  }

  // Read all events
  console.log('\n=== Reading Events ===');
  const readResult = await streams.xread([{ stream: 'user-events', id: '0' }]);

  if (isOk(readResult)) {
    for (const streamData of readResult.value) {
      console.log(`\nStream: ${streamData.stream}`);
      for (const msg of streamData.messages) {
        console.log(`  ${msg.id}:`, msg.data);
      }
    }
  }

  // Range queries
  console.log('\n=== Range Queries ===');
  const rangeResult = await streams.xrange('user-events', '-', '+', 10);

  if (isOk(rangeResult)) {
    console.log('All events (xrange):');
    for (const msg of rangeResult.value) {
      console.log(`  ${msg.data.type} (${msg.id})`);
    }
  }

  // Reverse range
  const revResult = await streams.xrevrange('user-events', '+', '-', 10);
  if (isOk(revResult)) {
    console.log('\nEvents in reverse:');
    for (const msg of revResult.value) {
      console.log(`  ${msg.data.type} (${msg.id})`);
    }
  }

  // Consumer groups
  console.log('\n=== Consumer Groups ===');

  // Create consumer group
  const groupResult = await streams.xgroupCreate('user-events', 'processors', '0', false);

  if (isOk(groupResult)) {
    console.log('✓ Created consumer group: processors');
  }

  // Read from consumer group
  console.log('\nReading as worker-1...');
  const worker1Result = await streams.xreadgroup(
    'processors',
    'worker-1',
    [{ stream: 'user-events', id: '>' }],
    10
  );

  if (isOk(worker1Result)) {
    for (const streamData of worker1Result.value) {
      console.log(`Processing ${streamData.messages.length} messages:`);

      for (const msg of streamData.messages) {
        console.log(`  Processing: ${msg.data.type}`);

        // Acknowledge message after processing
        const ackResult = await streams.xack('user-events', 'processors', [msg.id]);
        if (isOk(ackResult)) {
          console.log(`  ✓ Acknowledged: ${msg.id}`);
        }
      }
    }
  }

  // Check pending messages
  console.log('\n=== Pending Messages ===');
  const pendingResult = await streams.xpending('user-events', 'processors');

  if (isOk(pendingResult)) {
    console.log('Pending messages info:', pendingResult.value);
  }

  // Group info
  console.log('\n=== Consumer Group Info ===');
  const groupsResult = await streams.xinfoGroups('user-events');

  if (isOk(groupsResult)) {
    for (const group of groupsResult.value) {
      console.log(`Group: ${group.name}`);
      console.log(`  Consumers: ${group.consumers}`);
      console.log(`  Pending: ${group.pending}`);
      console.log(`  Last delivered ID: ${group.lastDeliveredId}`);
    }
  }

  // Demonstrate multiple consumers
  console.log('\n=== Multiple Consumers Example ===');

  // Add more events
  await streams.xadd('orders', { orderId: '001', status: 'pending' });
  await streams.xadd('orders', { orderId: '002', status: 'pending' });
  await streams.xadd('orders', { orderId: '003', status: 'pending' });

  // Create consumer group
  await streams.xgroupCreate('orders', 'order-processors', '$', false);

  console.log('Added 3 new orders');

  // Simulate multiple workers processing in parallel
  const worker1Orders = await streams.xreadgroup(
    'order-processors',
    'worker-1',
    [{ stream: 'orders', id: '>' }],
    2
  );

  const worker2Orders = await streams.xreadgroup(
    'order-processors',
    'worker-2',
    [{ stream: 'orders', id: '>' }],
    2
  );

  if (isOk(worker1Orders)) {
    const messages = worker1Orders.value[0]?.messages || [];
    console.log(`Worker-1 processing ${messages.length} orders`);
    for (const msg of messages) {
      console.log(`  Worker-1: ${msg.data.orderId}`);
      await streams.xack('orders', 'order-processors', [msg.id]);
    }
  }

  if (isOk(worker2Orders)) {
    const messages = worker2Orders.value[0]?.messages || [];
    console.log(`Worker-2 processing ${messages.length} orders`);
    for (const msg of messages) {
      console.log(`  Worker-2: ${msg.data.orderId}`);
      await streams.xack('orders', 'order-processors', [msg.id]);
    }
  }

  // Stream with max length
  console.log('\n=== Stream with Max Length ===');

  // Create a capped stream (keeps only last 5 entries)
  await streams.xadd('notifications', { msg: 'notification 1' }, undefined, 5);
  await streams.xadd('notifications', { msg: 'notification 2' }, undefined, 5);
  await streams.xadd('notifications', { msg: 'notification 3' }, undefined, 5);

  const notifLenResult = await streams.xlen('notifications');
  if (isOk(notifLenResult)) {
    console.log('Notifications stream length:', notifLenResult.value);
  }

  // Add many more - stream will stay at max 5 entries
  for (let i = 4; i <= 10; i++) {
    await streams.xadd('notifications', { msg: `notification ${i}` }, undefined, 5);
  }

  const finalLenResult = await streams.xlen('notifications');
  if (isOk(finalLenResult)) {
    console.log('Notifications after adding 10 total:', finalLenResult.value, '(capped at ~5)');
  }

  // Stream info
  console.log('\n=== Stream Info ===');
  const streamInfoResult = await streams.xinfoStream('user-events');

  if (isOk(streamInfoResult)) {
    console.log('Stream info:', streamInfoResult.value);
  }

  // Health check
  const healthResult = await streams.health();
  if (isOk(healthResult)) {
    console.log('\n✓ Health status:', healthResult.value.status);
  }

  // Cleanup
  await streams.stop();
  await streams.destroy();

  console.log('\n✓ Example completed');
  console.log('\nUse cases for Redis Streams:');
  console.log('  - Event sourcing');
  console.log('  - Activity feeds');
  console.log('  - Real-time analytics');
  console.log('  - Distributed task queues');
  console.log('  - Change data capture (CDC)');
}

main().catch(console.error);
