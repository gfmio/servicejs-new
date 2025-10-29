/**
 * PlanetScale Basic Usage Example
 *
 * Demonstrates CRUD operations with serverless MySQL
 */

import { createPlanetScaleAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  // Create adapter
  const adapter = createPlanetScaleAdapter();

  // Initialize with PlanetScale credentials
  await adapter.init({
    host: process.env.PLANETSCALE_HOST!,
    username: process.env.PLANETSCALE_USERNAME!,
    password: process.env.PLANETSCALE_PASSWORD!,
  });

  await adapter.start();

  // Check health
  const health = await adapter.health();
  if (isOk(health)) {
    console.log('Health:', health.value.status);
  }

  // Create table
  console.log('\n--- Create Table ---');
  const createResult = await adapter.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      age INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  if (isOk(createResult)) {
    console.log('Table created');
  }

  // Insert data
  console.log('\n--- Insert ---');
  const insertResult = await adapter.execute(
    'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
    ['John Doe', 'john@example.com', 30]
  );

  if (isOk(insertResult)) {
    console.log('Inserted rows:', insertResult.value.rowsAffected);
    console.log('Insert ID:', insertResult.value.insertId);
  }

  // Query data
  console.log('\n--- Query ---');
  const queryResult = await adapter.execute(
    'SELECT * FROM users WHERE email = ?',
    ['john@example.com']
  );

  if (isOk(queryResult)) {
    console.log('Query results:', queryResult.value.rows);
  }

  // Update data
  console.log('\n--- Update ---');
  const updateResult = await adapter.execute(
    'UPDATE users SET age = ? WHERE email = ?',
    [31, 'john@example.com']
  );

  if (isOk(updateResult)) {
    console.log('Updated rows:', updateResult.value.rowsAffected);
  }

  // Query all users
  console.log('\n--- Query All ---');
  const allResult = await adapter.execute('SELECT * FROM users ORDER BY created_at DESC LIMIT 10');

  if (isOk(allResult)) {
    console.log('All users:', allResult.value.rows);
  }

  // Delete data
  console.log('\n--- Delete ---');
  const deleteResult = await adapter.execute(
    'DELETE FROM users WHERE email = ?',
    ['john@example.com']
  );

  if (isOk(deleteResult)) {
    console.log('Deleted rows:', deleteResult.value.rowsAffected);
  }

  // Cleanup
  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
