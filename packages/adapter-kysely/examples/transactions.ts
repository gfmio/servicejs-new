/**
 * Kysely Adapter Transaction Example
 */

import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { createKyselyAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

interface Database {
  account: {
    id: number;
    name: string;
    balance: number;
  };
}

async function main() {
  const kysely = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        host: 'localhost',
        port: 5432,
        user: 'user',
        password: 'password',
        database: 'mydb',
      }),
    }),
  });

  const adapter = createKyselyAdapter<Database>();
  await adapter.init({ kysely });
  await adapter.start();

  // Perform a transaction
  const result = await adapter.transaction(async (trx) => {
    // Create two accounts
    await trx
      .insertInto('account')
      .values([
        { name: 'Alice', balance: 1000 },
        { name: 'Bob', balance: 500 },
      ])
      .execute();

    // Get Alice's account
    const alice = await trx
      .selectFrom('account')
      .selectAll()
      .where('name', '=', 'Alice')
      .executeTakeFirstOrThrow();

    // Get Bob's account
    const bob = await trx
      .selectFrom('account')
      .selectAll()
      .where('name', '=', 'Bob')
      .executeTakeFirstOrThrow();

    // Transfer 100 from Alice to Bob
    await trx
      .updateTable('account')
      .set({ balance: alice.balance - 100 })
      .where('id', '=', alice.id)
      .execute();

    await trx
      .updateTable('account')
      .set({ balance: bob.balance + 100 })
      .where('id', '=', bob.id)
      .execute();

    return { alice: alice.id, bob: bob.id };
  });

  if (isOk(result)) {
    console.log('Transaction successful:', result.value);
  } else {
    console.error('Transaction failed:', result.error);
  }

  // Example of a failed transaction (will rollback)
  const failedResult = await adapter.transaction(async (trx) => {
    const alice = await trx
      .selectFrom('account')
      .selectAll()
      .where('name', '=', 'Alice')
      .executeTakeFirstOrThrow();

    // Try to withdraw more than balance
    await trx
      .updateTable('account')
      .set({ balance: alice.balance - 2000 })
      .where('id', '=', alice.id)
      .execute();

    // Throw an error to rollback
    throw new Error('Insufficient funds');
  });

  if (isErr(failedResult)) {
    console.log('Transaction correctly rolled back:', failedResult.error.message);
  }

  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
