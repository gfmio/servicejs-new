/**
 * Basic ClickHouse adapter usage example
 */

import { createClickHouseAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createClickHouseAdapter();

  // Initialize with connection config
  const initResult = await adapter.init({
    host: 'http://localhost:8123',
    database: 'default',
    username: 'default',
    password: '',
  });

  if (!isOk(initResult)) {
    console.error('Failed to initialize:', initResult.error);
    return;
  }

  // Start the adapter
  const startResult = await adapter.start();
  if (!isOk(startResult)) {
    console.error('Failed to start:', startResult.error);
    return;
  }

  // Check health
  const healthResult = await adapter.health();
  if (isOk(healthResult)) {
    console.log('Health status:', healthResult.value.status);
  }

  // Create a table
  const createResult = await adapter.query({
    query: `
      CREATE TABLE IF NOT EXISTS events (
        id UInt64,
        name String,
        timestamp DateTime
      ) ENGINE = MergeTree()
      ORDER BY (id, timestamp)
    `,
  });

  if (!isOk(createResult)) {
    console.error('Failed to create table:', createResult.error);
  } else {
    console.log('Table created successfully');
  }

  // Insert data
  const insertResult = await adapter.query({
    query: 'INSERT INTO events (id, name, timestamp) VALUES (?, ?, ?)',
    params: [1, 'user.login', new Date()],
  });

  if (!isOk(insertResult)) {
    console.error('Failed to insert:', insertResult.error);
  } else {
    console.log('Inserted successfully');
  }

  // Query data
  const queryResult = await adapter.query<{ id: number; name: string; timestamp: Date }>({
    query: 'SELECT * FROM events WHERE id = ?',
    params: [1],
  });

  if (isOk(queryResult)) {
    console.log('Query results:', queryResult.value.rows);
  }

  // Insert many records
  const insertManyResult = await adapter.insertMany('events', [
    { id: 2, name: 'user.logout', timestamp: new Date() },
    { id: 3, name: 'user.login', timestamp: new Date() },
  ]);

  if (isOk(insertManyResult)) {
    console.log('Inserted many records');
  }

  // Cleanup
  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
