/**
 * Supabase Database Example
 *
 * Demonstrates CRUD operations using Supabase's PostgreSQL database
 */

import { createSupabaseAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  // Create adapter
  const adapter = createSupabaseAdapter();

  // Initialize with Supabase credentials
  await adapter.init({
    url: process.env.SUPABASE_URL!,
    key: process.env.SUPABASE_KEY!,
  });

  await adapter.start();

  // Check health
  const health = await adapter.health();
  if (isOk(health)) {
    console.log('Health:', health.value.status);
  }

  // Insert data
  console.log('\n--- Insert ---');
  const insertResult = await adapter.insert({
    table: 'users',
    data: {
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    },
  });

  if (isOk(insertResult)) {
    console.log('Inserted:', insertResult.value);
  } else {
    console.error('Insert failed:', insertResult.error);
  }

  // Query data
  console.log('\n--- Query ---');
  const queryResult = await adapter.query({
    table: 'users',
    select: 'id, name, email, age',
    filter: { email: 'john@example.com' },
  });

  if (isOk(queryResult)) {
    console.log('Query results:', queryResult.value);
  }

  // Update data
  console.log('\n--- Update ---');
  const updateResult = await adapter.update({
    table: 'users',
    data: { age: 31 },
    filter: { email: 'john@example.com' },
  });

  if (isOk(updateResult)) {
    console.log('Updated:', updateResult.value);
  }

  // Query with pagination and ordering
  console.log('\n--- Query with Options ---');
  const paginatedResult = await adapter.query({
    table: 'users',
    select: '*',
    order: { column: 'created_at', ascending: false },
    limit: 10,
    offset: 0,
  });

  if (isOk(paginatedResult)) {
    console.log('Paginated results:', paginatedResult.value);
  }

  // Call stored procedure (RPC)
  console.log('\n--- RPC ---');
  const rpcResult = await adapter.rpc('get_user_count', { min_age: 18 });

  if (isOk(rpcResult)) {
    console.log('RPC result:', rpcResult.value);
  }

  // Delete data
  console.log('\n--- Delete ---');
  const deleteResult = await adapter.delete({
    table: 'users',
    filter: { email: 'john@example.com' },
  });

  if (isOk(deleteResult)) {
    console.log('Deleted:', deleteResult.value);
  }

  // Cleanup
  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
