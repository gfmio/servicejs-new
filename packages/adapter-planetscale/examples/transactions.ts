/**
 * PlanetScale Transactions Example
 *
 * Demonstrates transaction handling with automatic rollback
 */

import { createPlanetScaleAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

async function main() {
  const adapter = createPlanetScaleAdapter();

  await adapter.init({
    host: process.env.PLANETSCALE_HOST!,
    username: process.env.PLANETSCALE_USERNAME!,
    password: process.env.PLANETSCALE_PASSWORD!,
  });

  await adapter.start();

  // Create tables
  await adapter.execute(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Successful transaction
  console.log('\n--- Successful Transaction ---');

  const successResult = await adapter.transaction(async (tx) => {
    // Insert two accounts
    const alice = await tx.execute(
      'INSERT INTO accounts (name, balance) VALUES (?, ?)',
      ['Alice', 1000]
    );

    const bob = await tx.execute(
      'INSERT INTO accounts (name, balance) VALUES (?, ?)',
      ['Bob', 500]
    );

    if (isErr(alice) || isErr(bob)) {
      throw new Error('Failed to create accounts');
    }

    // Transfer money from Alice to Bob
    await tx.execute(
      'UPDATE accounts SET balance = balance - ? WHERE id = ?',
      [100, alice.value.insertId]
    );

    await tx.execute(
      'UPDATE accounts SET balance = balance + ? WHERE id = ?',
      [100, bob.value.insertId]
    );

    return {
      aliceId: alice.value.insertId,
      bobId: bob.value.insertId,
    };
  });

  if (isOk(successResult)) {
    console.log('Transaction successful:', successResult.value);

    // Verify balances
    const aliceBalance = await adapter.execute(
      'SELECT balance FROM accounts WHERE id = ?',
      [successResult.value.aliceId]
    );

    const bobBalance = await adapter.execute(
      'SELECT balance FROM accounts WHERE id = ?',
      [successResult.value.bobId]
    );

    if (isOk(aliceBalance) && isOk(bobBalance)) {
      console.log('Alice balance:', aliceBalance.value.rows[0].balance); // 900
      console.log('Bob balance:', bobBalance.value.rows[0].balance); // 600
    }
  }

  // Failed transaction (will rollback)
  console.log('\n--- Failed Transaction (Rollback) ---');

  const failedResult = await adapter.transaction(async (tx) => {
    // Try to transfer more than Alice has
    const debit = await tx.execute(
      'UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ?',
      [2000, successResult.value?.aliceId, 2000]
    );

    if (isOk(debit) && debit.value.rowsAffected === 0) {
      throw new Error('Insufficient funds');
    }

    await tx.execute(
      'UPDATE accounts SET balance = balance + ? WHERE id = ?',
      [2000, successResult.value?.bobId]
    );

    return 'Should not reach here';
  });

  if (isErr(failedResult)) {
    console.log('Transaction failed (expected):', failedResult.error.message);

    // Verify balances unchanged
    const aliceBalance = await adapter.execute(
      'SELECT balance FROM accounts WHERE id = ?',
      [successResult.value?.aliceId]
    );

    if (isOk(aliceBalance)) {
      console.log('Alice balance (unchanged):', aliceBalance.value.rows[0].balance); // Still 900
    }
  }

  // Cleanup
  console.log('\n--- Cleanup ---');
  await adapter.execute('DROP TABLE IF EXISTS accounts');

  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
