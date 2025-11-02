/**
 * CRUD operations example
 */

import { createOpenAPIAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createOpenAPIAdapter();

  await adapter.init({
    baseURL: process.env.API_BASE_URL || 'https://api.example.com',
    headers: {
      'Authorization': `Bearer ${process.env.API_TOKEN || 'demo-token'}`,
    },
  });

  await adapter.start();

  console.log('=== CREATE (POST) ===');

  // Create a new resource
  const createResult = await adapter.post<{
    id: string;
    name: string;
    email: string;
  }>(
    '/users',
    {
      body: {
        name: 'John Doe',
        email: 'john@example.com',
      },
    }
  );

  if (isOk(createResult)) {
    console.log('Created user:', createResult.value);
    console.log('  ID:', createResult.value.id);
  }

  console.log('\n=== READ (GET) ===');

  // Read the created resource
  const readResult = await adapter.get<{ id: string; name: string }>(
    '/users/{id}',
    {
      path: { id: '123' },
    }
  );

  if (isOk(readResult)) {
    console.log('User:', readResult.value);
  }

  console.log('\n=== UPDATE (PUT) ===');

  // Update the entire resource
  const updateResult = await adapter.put<{ id: string; name: string }>(
    '/users/{id}',
    {
      path: { id: '123' },
      body: {
        name: 'Jane Doe',
        email: 'jane@example.com',
      },
    }
  );

  if (isOk(updateResult)) {
    console.log('Updated user:', updateResult.value);
  }

  console.log('\n=== PARTIAL UPDATE (PATCH) ===');

  // Partially update the resource
  const patchResult = await adapter.patch<{ id: string; name: string }>(
    '/users/{id}',
    {
      path: { id: '123' },
      body: {
        name: 'Jane Smith',
      },
    }
  );

  if (isOk(patchResult)) {
    console.log('Patched user:', patchResult.value);
  }

  console.log('\n=== DELETE ===');

  // Delete the resource
  const deleteResult = await adapter.delete('/users/{id}', {
    path: { id: '123' },
  });

  if (isOk(deleteResult)) {
    console.log('User deleted successfully');
  }

  await adapter.stop();
}

main().catch(console.error);
