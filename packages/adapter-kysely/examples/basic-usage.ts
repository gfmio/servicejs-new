/**
 * Basic Kysely Adapter Usage Example
 */

import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { createKyselyAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

// Define your database schema
interface Database {
  user: {
    id: number;
    name: string;
    email: string;
    created_at: Date;
  };
}

async function main() {
  // Create a Kysely instance
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

  // Create adapter
  const adapter = createKyselyAdapter<Database>();

  // Initialize with Kysely instance
  const initResult = await adapter.init({ kysely });
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

  // Get Kysely instance and perform operations
  const kyselyResult = adapter.getKysely();
  if (isOk(kyselyResult)) {
    const db = kyselyResult.value;

    // Insert a user
    const insertQuery = db
      .insertInto('user')
      .values({
        name: 'John Doe',
        email: 'john@example.com',
        created_at: new Date(),
      });

    const insertResult = await adapter.execute(insertQuery);
    if (isOk(insertResult)) {
      console.log('User inserted');
    }

    // Select users
    const selectQuery = db
      .selectFrom('user')
      .selectAll()
      .where('email', '=', 'john@example.com');

    const selectResult = await adapter.execute(selectQuery);
    if (isOk(selectResult)) {
      console.log('Users:', selectResult.value);
    }

    // Update user
    const updateQuery = db
      .updateTable('user')
      .set({ name: 'Jane Doe' })
      .where('email', '=', 'john@example.com');

    await adapter.execute(updateQuery);

    // Delete user
    const deleteQuery = db
      .deleteFrom('user')
      .where('email', '=', 'john@example.com');

    await adapter.execute(deleteQuery);
  }

  // Cleanup
  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
