/**
 * GraphQL mutations example
 */

import { createGraphQLAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createGraphQLAdapter();

  await adapter.init({
    endpoint: process.env.GRAPHQL_ENDPOINT || 'https://api.example.com/graphql',
    headers: {
      'Authorization': `Bearer ${process.env.API_TOKEN || 'demo-token'}`,
    },
  });

  await adapter.start();

  console.log('=== Create User ===');

  // Create a new user
  const createResult = await adapter.mutate<{
    createUser: { id: string; name: string; email: string };
  }>(`
    mutation CreateUser($input: CreateUserInput!) {
      createUser(input: $input) {
        id
        name
        email
      }
    }
  `, {
    input: {
      name: 'John Doe',
      email: 'john@example.com',
    },
  });

  if (isOk(createResult)) {
    console.log('Created user:', createResult.value.createUser);
    console.log('  ID:', createResult.value.createUser.id);
    console.log('  Name:', createResult.value.createUser.name);
    console.log('  Email:', createResult.value.createUser.email);
  }

  console.log('\n=== Update User ===');

  // Update an existing user
  const updateResult = await adapter.mutate<{
    updateUser: { id: string; name: string; email: string };
  }>(`
    mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
      updateUser(id: $id, input: $input) {
        id
        name
        email
      }
    }
  `, {
    id: '123',
    input: {
      name: 'Jane Doe',
    },
  });

  if (isOk(updateResult)) {
    console.log('Updated user:', updateResult.value.updateUser);
  }

  console.log('\n=== Delete User ===');

  // Delete a user
  const deleteResult = await adapter.mutate<{
    deleteUser: { success: boolean; message: string };
  }>(`
    mutation DeleteUser($id: ID!) {
      deleteUser(id: $id) {
        success
        message
      }
    }
  `, { id: '456' });

  if (isOk(deleteResult)) {
    console.log('Delete result:', deleteResult.value.deleteUser.message);
  }

  await adapter.stop();
}

main().catch(console.error);
