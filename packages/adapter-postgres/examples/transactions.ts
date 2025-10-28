/**
 * PostgreSQL Transactions Example
 *
 * Prerequisites: PostgreSQL server running
 * Run with: bun examples/transactions.ts
 */

import { createPostgresAdapter } from '../src/postgres.js';
import { isOk, ok, err } from '@servicejs/result';

const db = createPostgresAdapter();

// Initialize
await db.init({
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  user: 'postgres',
  password: 'postgres',
});
await db.start();

// Setup
await db.query({
  text: `
    CREATE TABLE IF NOT EXISTS accounts (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      balance DECIMAL(10, 2) NOT NULL DEFAULT 0
    )
  `,
});

await db.query({ text: 'DELETE FROM accounts' });

// Create initial accounts
await db.query({
  text: 'INSERT INTO accounts (name, balance) VALUES ($1, $2), ($3, $4)',
  params: ['Alice', 1000.00, 'Bob', 500.00],
});

console.log('Initial balances:');
const initialResult = await db.query({ text: 'SELECT * FROM accounts ORDER BY name' });
if (isOk(initialResult)) {
  initialResult.value.rows.forEach((row: any) => {
    console.log(`  ${row.name}: $${row.balance}`);
  });
}
console.log();

// Example 1: Successful transaction
console.log('Example 1: Successful money transfer');
const transfer = await db.transaction(async (tx) => {
  // Deduct from Alice
  await tx.query({
    text: 'UPDATE accounts SET balance = balance - $1 WHERE name = $2',
    params: [200, 'Alice'],
  });

  // Add to Bob
  await tx.query({
    text: 'UPDATE accounts SET balance = balance + $1 WHERE name = $2',
    params: [200, 'Bob'],
  });

  return ok({ transferred: 200 });
});

if (isOk(transfer)) {
  console.log('✅ Transfer successful');

  const balances = await db.query({ text: 'SELECT * FROM accounts ORDER BY name' });
  if (isOk(balances)) {
    balances.value.rows.forEach((row: any) => {
      console.log(`  ${row.name}: $${row.balance}`);
    });
  }
}
console.log();

// Example 2: Failed transaction (rollback)
console.log('Example 2: Failed transfer (insufficient funds)');
const failedTransfer = await db.transaction(async (tx) => {
  // Check balance
  const aliceBalance = await tx.query({
    text: 'SELECT balance FROM accounts WHERE name = $1',
    params: ['Alice'],
  });

  if (isOk(aliceBalance) && aliceBalance.value.rows[0]) {
    const balance = parseFloat(aliceBalance.value.rows[0].balance);

    if (balance < 2000) {
      return err(new Error('Insufficient funds'));
    }
  }

  // This won't execute because we returned an error
  await tx.query({
    text: 'UPDATE accounts SET balance = balance - $1 WHERE name = $2',
    params: [2000, 'Alice'],
  });

  return ok({ transferred: 2000 });
});

if (!isOk(failedTransfer)) {
  console.log('❌ Transfer failed:', failedTransfer.error.message);

  const balances = await db.query({ text: 'SELECT * FROM accounts ORDER BY name' });
  if (isOk(balances)) {
    console.log('Balances unchanged:');
    balances.value.rows.forEach((row: any) => {
      console.log(`  ${row.name}: $${row.balance}`);
    });
  }
}
console.log();

// Example 3: Manual transaction control
console.log('Example 3: Manual transaction control');
const txResult = await db.begin();
if (isOk(txResult)) {
  const tx = txResult.value;

  try {
    // Update Alice's balance
    await tx.query({
      text: 'UPDATE accounts SET balance = balance - $1 WHERE name = $2',
      params: [100, 'Alice'],
    });

    // Simulate some condition
    const shouldComplete = true;

    if (shouldComplete) {
      await tx.commit();
      console.log('✅ Transaction committed manually');
    } else {
      await tx.rollback();
      console.log('Transaction rolled back');
    }

    const balances = await db.query({ text: 'SELECT * FROM accounts ORDER BY name' });
    if (isOk(balances)) {
      balances.value.rows.forEach((row: any) => {
        console.log(`  ${row.name}: $${row.balance}`);
      });
    }
  } catch (error) {
    await tx.rollback();
    console.error('Error:', error);
  }
}

// Cleanup
await db.query({ text: 'DROP TABLE IF EXISTS accounts' });
await db.stop();
await db.destroy();

console.log('\n✨ Transactions example complete!');
