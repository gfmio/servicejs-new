/**
 * tRPC subscriptions example
 */

import { createTRPCAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createTRPCAdapter();

  await adapter.init({
    url: process.env.TRPC_URL || 'ws://localhost:3000/trpc',
    headers: {
      'Authorization': `Bearer ${process.env.API_TOKEN || 'demo-token'}`,
    },
  });

  await adapter.start();

  console.log('=== Subscribe to User Updates ===');

  // Subscribe to user changes
  const subscribeResult = await adapter.subscribe<{
    id: string;
    name: string;
    action: 'created' | 'updated' | 'deleted';
  }>(
    'user.onChange',
    { userId: '123' },
    (data) => {
      console.log(`User ${data.action}:`, data.name);
      console.log('  ID:', data.id);
      console.log('  Action:', data.action);
    }
  );

  if (isOk(subscribeResult)) {
    console.log('Subscription active');
    console.log('Listening for user changes...');

    // In a real application, updates would come from the server
    // Here we'll just keep the connection open for demonstration

    // Unsubscribe after some time
    setTimeout(() => {
      const unsubscribe = subscribeResult.value;
      unsubscribe();
      console.log('\nUnsubscribed from user updates');
      adapter.stop();
    }, 5000);
  } else {
    console.error('Failed to subscribe');
    await adapter.stop();
  }
}

main().catch(console.error);
