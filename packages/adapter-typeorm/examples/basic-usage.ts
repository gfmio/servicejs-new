/**
 * Basic TypeORM Adapter Usage Example
 */

import 'reflect-metadata';
import { DataSource, Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { createTypeORMAdapter } from '../src/index.js';
import { isOk, unwrap } from '@servicejs/result';

// Define an entity
@Entity()
class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  email!: string;
}

async function main() {
  // Create a DataSource
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'user',
    password: 'password',
    database: 'mydb',
    entities: [User],
    synchronize: true,
  });

  // Create adapter
  const adapter = createTypeORMAdapter();

  // Initialize with DataSource
  const initResult = await adapter.init({ dataSource });
  if (!isOk(initResult)) {
    console.error('Failed to initialize:', initResult.error);
    return;
  }

  // Start the adapter (initializes the data source)
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

  // Get repository and perform operations
  const repoResult = adapter.getRepository(User);
  if (isOk(repoResult)) {
    const userRepo = repoResult.value;

    // Create a user
    const user = userRepo.create({
      name: 'John Doe',
      email: 'john@example.com',
    });

    await userRepo.save(user);
    console.log('User created:', user);

    // Find users
    const users = await userRepo.find();
    console.log('All users:', users);
  }

  // Cleanup
  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
