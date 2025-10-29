/**
 * FaunaDB Basic Usage Example
 *
 * Demonstrates CRUD operations with FaunaDB's FQL v10
 */

import { createFaunaAdapter, fql } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  // Create adapter
  const adapter = createFaunaAdapter();

  // Initialize with Fauna secret
  await adapter.init({
    secret: process.env.FAUNA_SECRET!,
  });

  await adapter.start();

  // Check health
  const health = await adapter.health();
  if (isOk(health)) {
    console.log('Health:', health.value.status);
  }

  // Create a collection (if it doesn't exist)
  console.log('\n--- Create Collection ---');
  const createResult = await adapter.query(fql`
    if (!Collection.byName("Users").exists()) {
      Collection.create({ name: "Users" })
    }
  `);

  if (isOk(createResult)) {
    console.log('Collection ready');
  }

  // Insert data
  console.log('\n--- Insert ---');
  const insertResult = await adapter.query(fql`
    Users.create({
      name: "John Doe",
      email: "john@example.com",
      age: 30
    })
  `);

  if (isOk(insertResult)) {
    console.log('Inserted:', insertResult.value);
  }

  // Query by email
  console.log('\n--- Query ---');
  const queryResult = await adapter.query(fql`
    Users.byEmail("john@example.com").first()
  `);

  if (isOk(queryResult)) {
    console.log('Query result:', queryResult.value);
  }

  // Update data
  console.log('\n--- Update ---');
  const updateResult = await adapter.query(fql`
    Users.byEmail("john@example.com").first()!.update({ age: 31 })
  `);

  if (isOk(updateResult)) {
    console.log('Updated:', updateResult.value);
  }

  // Query all users
  console.log('\n--- Query All ---');
  const allResult = await adapter.query(fql`
    Users.all().pageSize(10)
  `);

  if (isOk(allResult)) {
    console.log('All users:', allResult.value);
  }

  // Delete data
  console.log('\n--- Delete ---');
  const deleteResult = await adapter.query(fql`
    Users.byEmail("john@example.com").first()!.delete()
  `);

  if (isOk(deleteResult)) {
    console.log('Deleted:', deleteResult.value);
  }

  // Cleanup
  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
