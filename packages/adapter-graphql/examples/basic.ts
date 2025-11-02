/**
 * Basic GraphQL adapter usage
 */

import { createGraphQLAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createGraphQLAdapter();

  // Initialize with endpoint
  await adapter.init({
    endpoint: process.env.GRAPHQL_ENDPOINT || 'https://api.example.com/graphql',
    headers: {
      'Authorization': `Bearer ${process.env.API_TOKEN || 'demo-token'}`,
    },
  });

  await adapter.start();

  console.log('=== Simple Query ===');

  // Execute a simple query
  const result = await adapter.query<{ user: { id: string; name: string; email: string } }>(`
    query GetUser($id: ID!) {
      user(id: $id) {
        id
        name
        email
      }
    }
  `, { id: '123' });

  if (isOk(result)) {
    console.log('User:', result.value.user);
  }

  console.log('\n=== List Query ===');

  // Execute a list query
  const usersResult = await adapter.query<{ users: Array<{ id: string; name: string }> }>(`
    query ListUsers {
      users {
        id
        name
      }
    }
  `);

  if (isOk(usersResult)) {
    console.log(`Found ${usersResult.value.users.length} users`);
    usersResult.value.users.forEach(user => {
      console.log(`  - ${user.name} (${user.id})`);
    });
  }

  await adapter.stop();
}

main().catch(console.error);
