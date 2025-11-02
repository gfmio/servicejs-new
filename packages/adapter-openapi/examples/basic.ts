/**
 * Basic OpenAPI adapter usage
 */

import { createOpenAPIAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createOpenAPIAdapter();

  // Initialize with base URL
  await adapter.init({
    baseURL: process.env.API_BASE_URL || 'https://api.example.com',
    headers: {
      'Authorization': `Bearer ${process.env.API_TOKEN || 'demo-token'}`,
    },
  });

  await adapter.start();

  console.log('=== GET Request ===');

  // Get a single resource
  const userResult = await adapter.get<{ id: string; name: string; email: string }>(
    '/users/{id}',
    {
      path: { id: '123' },
    }
  );

  if (isOk(userResult)) {
    console.log('User:', userResult.value);
    console.log('  ID:', userResult.value.id);
    console.log('  Name:', userResult.value.name);
  }

  console.log('\n=== GET with Query Parameters ===');

  // Get a list with query parameters
  const usersResult = await adapter.get<Array<{ id: string; name: string }>>(
    '/users',
    {
      query: {
        limit: 10,
        offset: 0,
        sort: 'name',
      },
    }
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
