/**
 * Basic SurrealDB adapter example
 *
 * This example demonstrates:
 * - Connecting to SurrealDB
 * - Document operations (create, select, update, merge, delete)
 * - Graph operations (relate, traverse)
 * - Querying with parameters
 * - Transaction management
 */

import { createSurrealDBAdapter } from '../src/surrealdb.js';
import { isOk } from '@servicejs/result';

interface Person {
  id?: string;
  name: string;
  age: number;
  city?: string;
}

interface Relationship {
  since: number;
  type?: string;
}

async function main() {
  // Create adapter
  const db = createSurrealDBAdapter();

  // Initialize connection
  console.log('Connecting to SurrealDB...');
  const initResult = await db.init({
    url: 'http://127.0.0.1:8000/rpc',
    namespace: 'example',
    database: 'example',
    auth: {
      username: 'root',
      password: 'root',
    },
  });

  if (!isOk(initResult)) {
    console.error('Failed to initialize:', initResult.err);
    return;
  }

  await db.start();
  console.log('Connected!');

  // Document Operations
  console.log('\n=== Document Operations ===');

  // Create documents
  console.log('\nCreating people...');
  await db.create<Person>('person:alice', {
    name: 'Alice',
    age: 30,
    city: 'New York',
  });
  await db.create<Person>('person:bob', {
    name: 'Bob',
    age: 25,
    city: 'Los Angeles',
  });
  await db.create<Person>('person:charlie', {
    name: 'Charlie',
    age: 35,
    city: 'Chicago',
  });

  // Select documents
  console.log('\nSelecting all people...');
  const selectResult = await db.select<Person>('person');
  if (isOk(selectResult)) {
    console.log('People:', JSON.stringify(selectResult.ok, null, 2));
  }

  // Update document
  console.log('\nUpdating Alice...');
  const updateResult = await db.update<Person>('person:alice', { age: 31 });
  if (isOk(updateResult)) {
    console.log('Updated Alice:', updateResult.ok);
  }

  // Merge document
  console.log('\nMerging data into Bob...');
  const mergeResult = await db.merge<Person>('person:bob', { city: 'San Francisco' });
  if (isOk(mergeResult)) {
    console.log('Merged Bob:', mergeResult.ok);
  }

  // Query with parameters
  console.log('\n=== Query Operations ===');
  console.log('\nQuerying people older than 28...');
  const queryResult = await db.query<Person>({
    text: 'SELECT * FROM person WHERE age > $minAge ORDER BY age',
    params: { minAge: 28 },
  });
  if (isOk(queryResult)) {
    console.log('Results:', JSON.stringify(queryResult.ok.rows, null, 2));
    console.log('Row count:', queryResult.ok.rowCount);
  }

  // Graph Operations
  console.log('\n=== Graph Operations ===');

  // Create relationships
  console.log('\nCreating relationships...');
  await db.relate<Relationship>('person:alice', 'knows', 'person:bob', {
    since: 2020,
    type: 'friend',
  });
  await db.relate<Relationship>('person:bob', 'knows', 'person:charlie', {
    since: 2019,
    type: 'colleague',
  });
  await db.relate<Relationship>('person:alice', 'knows', 'person:charlie', {
    since: 2021,
    type: 'friend',
  });

  // Query relationships
  console.log('\nQuerying Alice\'s connections...');
  const relResult = await db.query({
    text: 'SELECT ->knows->person.* AS connections FROM person:alice',
  });
  if (isOk(relResult)) {
    console.log('Alice knows:', JSON.stringify(relResult.ok.rows, null, 2));
  }

  // Traverse graph
  console.log('\nTraversing graph (friends of friends)...');
  const traverseResult = await db.query({
    text: `
      SELECT ->knows->person->knows->person.name AS friends_of_friends
      FROM person:alice
    `,
  });
  if (isOk(traverseResult)) {
    console.log('Friends of friends:', JSON.stringify(traverseResult.ok.rows, null, 2));
  }

  // Transaction Operations
  console.log('\n=== Transaction Operations ===');

  // Successful transaction
  console.log('\nCommitting transaction...');
  const tx1Result = await db.begin();
  if (isOk(tx1Result)) {
    const tx = tx1Result.ok;

    await tx.query({
      text: 'CREATE person:dave SET name = "Dave", age = 40',
    });
    await tx.query({
      text: 'CREATE person:eve SET name = "Eve", age = 28',
    });

    await tx.commit();
    console.log('Transaction committed');
  }

  // Verify transaction results
  const verifyResult = await db.query({
    text: 'SELECT * FROM person WHERE name IN ["Dave", "Eve"]',
  });
  if (isOk(verifyResult)) {
    console.log('New people:', JSON.stringify(verifyResult.ok.rows, null, 2));
  }

  // Rolled back transaction
  console.log('\nRolling back transaction...');
  const tx2Result = await db.begin();
  if (isOk(tx2Result)) {
    const tx = tx2Result.ok;

    await tx.query({
      text: 'CREATE person:frank SET name = "Frank", age = 45',
    });

    await tx.rollback();
    console.log('Transaction rolled back');
  }

  // Verify rollback
  const verifyRollbackResult = await db.query({
    text: 'SELECT * FROM person WHERE name = "Frank"',
  });
  if (isOk(verifyRollbackResult)) {
    console.log('Frank exists:', verifyRollbackResult.ok.rowCount > 0 ? 'Yes' : 'No');
  }

  // Complex query example
  console.log('\n=== Complex Query ===');
  const complexResult = await db.query({
    text: `
      SELECT
        name,
        age,
        city,
        count(->knows) AS connection_count,
        ->knows->person.name AS connections
      FROM person
      WHERE age >= $minAge
      GROUP BY name, age, city, connections
      ORDER BY connection_count DESC
    `,
    params: { minAge: 25 },
  });
  if (isOk(complexResult)) {
    console.log('Social network analysis:', JSON.stringify(complexResult.ok.rows, null, 2));
  }

  // Health check
  console.log('\n=== Health Check ===');
  const healthResult = await db.health();
  if (isOk(healthResult)) {
    console.log('Health status:', healthResult.ok.status);
  }

  // Cleanup
  console.log('\n=== Cleanup ===');
  console.log('Deleting test data...');
  await db.query({ text: 'DELETE person' });
  await db.query({ text: 'DELETE knows' });

  // Disconnect
  await db.stop();
  await db.destroy();
  console.log('Disconnected');
}

main().catch(console.error);
