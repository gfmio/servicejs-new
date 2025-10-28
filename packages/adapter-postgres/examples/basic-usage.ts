/**
 * Basic PostgreSQL Usage Example
 *
 * Prerequisites: PostgreSQL server running
 * Run with: bun examples/basic-usage.ts
 */

import { createPostgresAdapter } from '../src/postgres.js';
import { isOk } from '@servicejs/result';

const db = createPostgresAdapter();

// Initialize and connect
console.log('📡 Connecting to PostgreSQL...');
await db.init({
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  user: 'postgres',
  password: 'postgres',
});
await db.start();
console.log('✅ Connected!\n');

// Create table
console.log('Creating users table...');
const createResult = await db.query({
  text: `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,
});

if (isOk(createResult)) {
  console.log('✅ Table created\n');
}

// Insert data
console.log('Inserting users...');
const insertResult = await db.query({
  text: 'INSERT INTO users (name, email) VALUES ($1, $2), ($3, $4) RETURNING *',
  params: ['Alice', 'alice@example.com', 'Bob', 'bob@example.com'],
});

if (isOk(insertResult)) {
  console.log('✅ Inserted users:');
  insertResult.value.rows.forEach((row) => {
    console.log(`   - ${row.name} (${row.email})`);
  });
  console.log();
}

// Query data
console.log('Querying users...');
const selectResult = await db.query({
  text: 'SELECT * FROM users ORDER BY id',
});

if (isOk(selectResult)) {
  console.log('✅ Found users:');
  selectResult.value.rows.forEach((row) => {
    console.log(`   - ${row.name} (${row.email})`);
  });
  console.log();
}

// Update data
console.log('Updating user...');
const updateResult = await db.query({
  text: 'UPDATE users SET name = $1 WHERE email = $2 RETURNING *',
  params: ['Alice Smith', 'alice@example.com'],
});

if (isOk(updateResult)) {
  console.log('✅ Updated:', updateResult.value.rows[0].name);
  console.log();
}

// Delete data
console.log('Deleting user...');
const deleteResult = await db.query({
  text: 'DELETE FROM users WHERE email = $1',
  params: ['bob@example.com'],
});

if (isOk(deleteResult)) {
  console.log(`✅ Deleted ${deleteResult.value.rowCount} user(s)\n`);
}

// Cleanup
await db.query({ text: 'DROP TABLE IF EXISTS users' });
await db.stop();
await db.destroy();

console.log('✨ Example complete!');
