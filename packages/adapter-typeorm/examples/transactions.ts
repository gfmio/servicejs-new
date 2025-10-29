/**
 * TypeORM Adapter Transaction Example
 */

import 'reflect-metadata';
import { DataSource, Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { createTypeORMAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

@Entity()
class Account {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  balance!: number;
}

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'user',
    password: 'password',
    database: 'mydb',
    entities: [Account],
    synchronize: true,
  });

  const adapter = createTypeORMAdapter();
  await adapter.init({ dataSource });
  await adapter.start();

  // Perform a transaction
  const result = await adapter.transaction(async (manager) => {
    const accountRepo = manager.getRepository(Account);

    // Create two accounts
    const alice = accountRepo.create({ name: 'Alice', balance: 1000 });
    const bob = accountRepo.create({ name: 'Bob', balance: 500 });

    await accountRepo.save([alice, bob]);

    // Transfer money from Alice to Bob
    alice.balance -= 100;
    bob.balance += 100;

    await accountRepo.save([alice, bob]);

    return { alice, bob };
  });

  if (isOk(result)) {
    console.log('Transaction successful:', result.value);
  } else {
    console.error('Transaction failed:', result.error);
  }

  // Example of a failed transaction (will rollback)
  const failedResult = await adapter.transaction(async (manager) => {
    const accountRepo = manager.getRepository(Account);

    const alice = await accountRepo.findOneOrFail({ where: { name: 'Alice' } });
    alice.balance -= 2000; // This would make balance negative

    await accountRepo.save(alice);

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
