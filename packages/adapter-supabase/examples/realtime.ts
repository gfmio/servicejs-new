/**
 * Supabase Real-time Example
 *
 * Demonstrates real-time subscriptions to database changes
 */

import { createSupabaseAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createSupabaseAdapter();

  await adapter.init({
    url: process.env.SUPABASE_URL!,
    key: process.env.SUPABASE_KEY!,
  });

  await adapter.start();

  console.log('Setting up real-time subscription...\n');

  // Subscribe to all changes on the 'messages' table
  const channelResult = adapter.subscribe({
    channel: 'messages-channel',
    table: 'messages',
    event: '*',
    callback: (payload) => {
      console.log('Real-time event received:');
      console.log('  Event type:', payload.eventType);
      console.log('  New record:', payload.new);
      console.log('  Old record:', payload.old);
      console.log('');
    },
  });

  if (isOk(channelResult)) {
    console.log('Subscribed to real-time updates');

    // Simulate database changes by inserting records
    console.log('\nInserting test messages...\n');

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Insert a message
    await adapter.insert({
      table: 'messages',
      data: {
        content: 'Hello from real-time!',
        user_id: 1,
      },
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Insert another message
    await adapter.insert({
      table: 'messages',
      data: {
        content: 'Another message',
        user_id: 1,
      },
    });

    // Wait to see the real-time updates
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Unsubscribe
    console.log('\nUnsubscribing from channel...');
    const unsubResult = await adapter.unsubscribe(channelResult.value);

    if (isOk(unsubResult)) {
      console.log('Unsubscribed successfully');
    }
  } else {
    console.error('Failed to subscribe:', channelResult.error);
  }

  // Subscribe to specific events (e.g., only INSERTs)
  const insertOnlyResult = adapter.subscribe({
    channel: 'inserts-only',
    table: 'messages',
    event: 'INSERT',
    callback: (payload) => {
      console.log('New message inserted:', payload.new);
    },
  });

  if (isOk(insertOnlyResult)) {
    console.log('Subscribed to INSERT events only');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cleanup
    await adapter.unsubscribe(insertOnlyResult.value);
  }

  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
