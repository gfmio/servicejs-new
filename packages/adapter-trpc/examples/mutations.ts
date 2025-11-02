/**
 * tRPC mutations example
 */

import { createTRPCAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createTRPCAdapter();

  await adapter.init({
    url: process.env.TRPC_URL || 'http://localhost:3000/trpc',
    headers: {
      'Authorization': `Bearer ${process.env.API_TOKEN || 'demo-token'}`,
    },
  });

  await adapter.start();

  console.log('=== Create User ===');

  // Create a new user
  const createResult = await adapter.mutate<{
    id: string;
    name: string;
    email: string;
  }>(
    'user.create',
    {
      name: 'John Doe',
      email: 'john@example.com',
    }
  );

  if (isOk(createResult)) {
    console.log('Created user:', createResult.value);
    console.log('  ID:', createResult.value.id);
  }

  console.log('\n=== Update User ===');

  // Update an existing user
  const updateResult = await adapter.mutate<{
    id: string;
    name: string;
  }>(
    'user.update',
    {
      id: '123',
      name: 'Jane Doe',
    }
  );

  if (isOk(updateResult)) {
    console.log('Updated user:', updateResult.value);
  }

  console.log('\n=== Delete User ===');

  // Delete a user
  const deleteResult = await adapter.mutate<{ success: boolean }>(
    'user.delete',
    { id: '456' }
  );

  if (isOk(deleteResult)) {
    console.log('Delete successful:', deleteResult.value.success);
  }

  console.log('\n=== Batch Operations ===');

  // Perform multiple mutations
  const batchResult = await adapter.mutate<{ created: number }>(
    'user.createMany',
    {
      users: [
        { name: 'Alice', email: 'alice@example.com' },
        { name: 'Bob', email: 'bob@example.com' },
        { name: 'Charlie', email: 'charlie@example.com' },
      ],
    }
  );

  if (isOk(batchResult)) {
    console.log(`Created ${batchResult.value.created} users`);
  }

  await adapter.stop();
}

main().catch(console.error);
