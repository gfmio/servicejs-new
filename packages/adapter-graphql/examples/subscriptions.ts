/**
 * GraphQL subscriptions example
 */

import { createGraphQLAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createGraphQLAdapter();

  await adapter.init({
    endpoint: process.env.GRAPHQL_ENDPOINT || 'wss://api.example.com/graphql',
    headers: {
      'Authorization': `Bearer ${process.env.API_TOKEN || 'demo-token'}`,
    },
  });

  await adapter.start();

  console.log('=== Subscribe to User Updates ===');

  // Subscribe to user updates
  const subscribeResult = await adapter.subscribe<{
    userUpdated: { id: string; name: string; email: string };
  }>(
    `
    subscription OnUserUpdated($userId: ID!) {
      userUpdated(userId: $userId) {
        id
        name
        email
      }
    }
  `,
    { userId: '123' },
    (data) => {
      console.log('User updated:', data.userUpdated);
      console.log('  ID:', data.userUpdated.id);
      console.log('  Name:', data.userUpdated.name);
      console.log('  Email:', data.userUpdated.email);
    }
  );

  if (isOk(subscribeResult)) {
    console.log('Subscription active');

    // In a real application, the subscription would receive updates
    // Here we'll just keep the connection open for a few seconds
    console.log('Listening for updates...');

    // Unsubscribe after some time
    setTimeout(() => {
      const unsubscribe = subscribeResult.value;
      unsubscribe();
      console.log('Unsubscribed from updates');
      adapter.stop();
    }, 5000);
  } else {
    await adapter.stop();
  }
}

main().catch(console.error);
