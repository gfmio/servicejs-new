/**
 * SQLite Transactions Example
 *
 * Prerequisites: None (uses in-memory database)
 * Run with: bun run examples/transactions.ts
 */

import { createSqliteAdapter } from '../src/sqlite.js';
import { ok, err, isOk } from '@servicejs/result';

const db = createSqliteAdapter();

// Initialize
console.log('📁 Opening database...');
await db.init({ filename: ':memory:' });
await db.start();
console.log('✅ Database opened!\n');

// Create tables
console.log('🏗️  Creating tables...');
await db.query({
  text: `
    CREATE TABLE accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      balance INTEGER
    )
  `,
});

await db.query({
  text: `
    CREATE TABLE transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_account INTEGER,
      to_account INTEGER,
      amount INTEGER,
      timestamp TEXT
    )
  `,
});
console.log('✅ Tables created!\n');

// Create accounts
console.log('💰 Creating accounts...');
await db.query({
  text: 'INSERT INTO accounts (name, balance) VALUES (?, ?)',
  params: ['Alice', 1000],
});

await db.query({
  text: 'INSERT INTO accounts (name, balance) VALUES (?, ?)',
  params: ['Bob', 500],
});
console.log('✅ Accounts created!\n');

// Transfer money (successful transaction)
console.log('💸 Transferring $200 from Alice to Bob...');
const transferResult = await db.transaction(async (tx) => {
  // Deduct from Alice
  const deductResult = await tx.query({
    text: 'UPDATE accounts SET balance = balance - ? WHERE name = ?',
    params: [200, 'Alice'],
  });

  if (!isOk(deductResult)) {
    return err(new Error('Failed to deduct from Alice'));
  }

  // Add to Bob
  const addResult = await tx.query({
    text: 'UPDATE accounts SET balance = balance + ? WHERE name = ?',
    params: [200, 'Bob'],
  });

  if (!isOk(addResult)) {
    return err(new Error('Failed to add to Bob'));
  }

  // Log transaction
  await tx.query({
    text: 'INSERT INTO transactions (from_account, to_account, amount, timestamp) VALUES (?, ?, ?, ?)',
    params: [1, 2, 200, new Date().toISOString()],
  });

  return ok(undefined);
});

if (isOk(transferResult)) {
  console.log('✅ Transfer successful!\n');
} else {
  console.log('❌ Transfer failed!\n');
}

// Check balances
console.log('📊 Account balances:');
const balancesResult = await db.query<{ name: string; balance: number }>({
  text: 'SELECT name, balance FROM accounts ORDER BY name',
});

if (isOk(balancesResult)) {
  balancesResult.value.rows.forEach((account) => {
    console.log(`  ${account.name}: $${account.balance}`);
  });
  console.log();
}

// Attempt invalid transfer (will rollback)
console.log('💸 Attempting to transfer $10000 from Alice to Bob (will fail)...');
const invalidTransferResult = await db.transaction(async (tx) => {
  // Check Alice's balance
  const balanceCheck = await tx.query<{ balance: number }>({
    text: 'SELECT balance FROM accounts WHERE name = ?',
    params: ['Alice'],
  });

  if (!isOk(balanceCheck) || balanceCheck.value.rows[0].balance < 10000) {
    return err(new Error('Insufficient funds'));
  }

  // Deduct from Alice
  await tx.query({
    text: 'UPDATE accounts SET balance = balance - ? WHERE name = ?',
    params: [10000, 'Alice'],
  });

  // Add to Bob
  await tx.query({
    text: 'UPDATE accounts SET balance = balance + ? WHERE name = ?',
    params: [10000, 'Bob'],
  });

  return ok(undefined);
});

if (isOk(invalidTransferResult)) {
  console.log('✅ Transfer successful (unexpected)!\n');
} else {
  console.log(`❌ Transfer failed: ${invalidTransferResult.error.message}\n`);
}

// Check balances again (should be unchanged)
console.log('📊 Account balances after failed transfer:');
const finalBalancesResult = await db.query<{ name: string; balance: number }>({
  text: 'SELECT name, balance FROM accounts ORDER BY name',
});

if (isOk(finalBalancesResult)) {
  finalBalancesResult.value.rows.forEach((account) => {
    console.log(`  ${account.name}: $${account.balance}`);
  });
  console.log();
}

// Show transaction history
console.log('📜 Transaction history:');
const historyResult = await db.query<{
  from_account: number;
  to_account: number;
  amount: number;
  timestamp: string;
}>({
  text: 'SELECT * FROM transactions ORDER BY id',
});

if (isOk(historyResult)) {
  console.log(`  Total transactions: ${historyResult.value.rows.length}`);
  historyResult.value.rows.forEach((tx) => {
    console.log(`  Account ${tx.from_account} → Account ${tx.to_account}: $${tx.amount}`);
  });
  console.log();
}

// Cleanup
await db.stop();
await db.destroy();

console.log('✨ Example complete!');
