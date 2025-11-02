/**
 * Basic tRPC adapter usage
 */

import { createTRPCAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createTRPCAdapter();

  // Initialize with tRPC endpoint
  await adapter.init({
    url: process.env.TRPC_URL || 'http://localhost:3000/trpc',
    headers: {
      'Authorization': `Bearer ${process.env.API_TOKEN || 'demo-token'}`,
    },
  });

  await adapter.start();

  console.log('=== Query User ===');

  // Execute a query
  const userResult = await adapter.query<{ id: string; name: string; email: string }>(
    'user.getById',
    { id: '123' }
  );

  if (isOk(userResult)) {
    console.log('User:', userResult.value);
    console.log('  ID:', userResult.value.id);
    console.log('  Name:', userResult.value.name);
    console.log('  Email:', userResult.value.email);
  }

  console.log('\n=== List Users ===');

  // Query a list
  const usersResult = await adapter.query<Array<{ id: string; name: string }>>(
    'user.list',
    { limit: 10 }
  );

  if (isOk(usersResult)) {
    console.log(`Found ${usersResult.value.length} users`);
    usersResult.value.forEach(user => {
      console.log(`  - ${user.name} (${user.id})`);
    });
  }

  await adapter.stop();
}

main().catch(console.error);
