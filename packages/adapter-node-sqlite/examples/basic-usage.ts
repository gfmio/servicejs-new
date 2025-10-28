/**
 * Basic SQLite Usage Example
 *
 * Prerequisites: None (uses in-memory database)
 * Run with: bun run examples/basic-usage.ts
 */

import { createSqliteAdapter } from '../src/sqlite.js';
import { isOk } from '@servicejs/result';

const db = createSqliteAdapter();

// Initialize with in-memory database
console.log('📁 Opening database...');
await db.init({ filename: ':memory:' });
await db.start();
console.log('✅ Database opened!\n');

// Create table
console.log('🏗️  Creating users table...');
await db.query({
  text: 'CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT)',
});
console.log('✅ Table created!\n');

// Insert data
console.log('💾 Inserting users...');
await db.query({
  text: 'INSERT INTO users (name, email) VALUES (?, ?)',
  params: ['Alice', 'alice@example.com'],
});

await db.query({
  text: 'INSERT INTO users (name, email) VALUES (?, ?)',
  params: ['Bob', 'bob@example.com'],
});
console.log('✅ Users inserted!\n');

// Query data
console.log('🔍 Querying users...');
const result = await db.query<{ id: number; name: string; email: string }>({
  text: 'SELECT * FROM users ORDER BY name',
});

if (isOk(result)) {
  console.log(`Found ${result.value.rows.length} users:`);
  result.value.rows.forEach((user) => {
    console.log(`  ${user.id}. ${user.name} (${user.email})`);
  });
  console.log();
}

// Update data
console.log('✏️  Updating user...');
await db.query({
  text: 'UPDATE users SET email = ? WHERE name = ?',
  params: ['newalice@example.com', 'Alice'],
});
console.log('✅ User updated!\n');

// Query updated data
console.log('🔍 Querying Alice...');
const aliceResult = await db.query<{ name: string; email: string }>({
  text: 'SELECT name, email FROM users WHERE name = ?',
  params: ['Alice'],
});

if (isOk(aliceResult)) {
  const alice = aliceResult.value.rows[0];
  console.log(`  ${alice.name}: ${alice.email}\n`);
}

// Delete data
console.log('🗑️  Deleting Bob...');
await db.query({
  text: 'DELETE FROM users WHERE name = ?',
  params: ['Bob'],
});
console.log('✅ User deleted!\n');

// Final count
console.log('📊 Final user count...');
const countResult = await db.query<{ count: number }>({
  text: 'SELECT COUNT(*) as count FROM users',
});

if (isOk(countResult)) {
  console.log(`  Total users: ${countResult.value.rows[0].count}\n`);
}

// Cleanup
await db.stop();
await db.destroy();

console.log('✨ Example complete!');
