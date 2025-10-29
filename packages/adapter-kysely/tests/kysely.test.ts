import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { Kysely, SqliteDialect, Generated } from 'kysely';
import type Database from 'better-sqlite3';
import { createKyselyAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

// Database schema types
interface UserTable {
  id: Generated<number>;
  email: string;
  name: string | null;
  age: number | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

interface PostTable {
  id: Generated<number>;
  title: string;
  content: string | null;
  published: Generated<number>; // SQLite uses 0/1 for boolean
  author_id: number;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

interface Database {
  user: UserTable;
  post: PostTable;
}

describe('Kysely Adapter', () => {
  let kysely: Kysely<Database>;
  let adapter: ReturnType<typeof createKyselyAdapter<Database>>;

  beforeEach(async () => {
    // Use Bun's built-in sqlite but cast to better-sqlite3 type
    const { Database: BunDB } = await import('bun:sqlite');
    const db = new BunDB(':memory:') as any as Database.Database;

    // Create tables
    db.exec(`
      CREATE TABLE user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        age INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE post (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        published INTEGER NOT NULL DEFAULT 0,
        author_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES user(id) ON DELETE CASCADE
      );
    `);

    kysely = new Kysely<Database>({
      dialect: new SqliteDialect({ database: db }),
    });

    adapter = createKyselyAdapter<Database>();
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.destroy();
    }
  });

  describe('Lifecycle', () => {
    test('init and start', async () => {
      const initResult = await adapter.init({ kysely });
      expect(isOk(initResult)).toBe(true);

      const startResult = await adapter.start();
      expect(isOk(startResult)).toBe(true);
    });

    test('health returns healthy after init', async () => {
      await adapter.init({ kysely });
      await adapter.start();

      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }
    });

    test('health returns unhealthy before init', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('unhealthy');
      }
    });

    test('stop destroys connection', async () => {
      await adapter.init({ kysely });
      await adapter.start();

      const stopResult = await adapter.stop();
      expect(isOk(stopResult)).toBe(true);
    });
  });

  describe('Kysely Access', () => {
    beforeEach(async () => {
      await adapter.init({ kysely });
      await adapter.start();
    });

    test('getKysely returns Kysely instance', () => {
      const result = adapter.getKysely();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(kysely);
      }
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      await adapter.init({ kysely });
      await adapter.start();
    });

    test('execute can insert records', async () => {
      const kyselyResult = adapter.getKysely();
      if (isOk(kyselyResult)) {
        const db = kyselyResult.value;

        const insertQuery = db
          .insertInto('user')
          .values({
            email: 'test@example.com',
            name: 'Test User',
            age: 30,
          });

        const insertResult = await adapter.execute(insertQuery);
        expect(isOk(insertResult)).toBe(true);

        // Verify by selecting
        const selectQuery = db
          .selectFrom('user')
          .selectAll()
          .where('email', '=', 'test@example.com');

        const result = await adapter.execute(selectQuery);
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value[0].email).toBe('test@example.com');
          expect(result.value[0].name).toBe('Test User');
        }
      }
    });

    test('execute can select records', async () => {
      const kyselyResult = adapter.getKysely();
      if (isOk(kyselyResult)) {
        const db = kyselyResult.value;

        // Insert user first
        await db
          .insertInto('user')
          .values({
            email: 'select@example.com',
            name: 'Select User',
          })
          .execute();

        // Select user
        const query = db
          .selectFrom('user')
          .selectAll()
          .where('email', '=', 'select@example.com');

        const result = await adapter.execute(query);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.length).toBe(1);
          expect(result.value[0].email).toBe('select@example.com');
        }
      }
    });

    test('execute can update records', async () => {
      const kyselyResult = adapter.getKysely();
      if (isOk(kyselyResult)) {
        const db = kyselyResult.value;

        // Insert user
        await db
          .insertInto('user')
          .values({
            email: 'update@example.com',
            name: 'Original',
          })
          .execute();

        // Get the inserted user
        const inserted = await db
          .selectFrom('user')
          .selectAll()
          .where('email', '=', 'update@example.com')
          .executeTakeFirstOrThrow();

        // Update user
        const updateQuery = db
          .updateTable('user')
          .set({ name: 'Updated' })
          .where('id', '=', inserted.id);

        const updateResult = await adapter.execute(updateQuery);
        expect(isOk(updateResult)).toBe(true);

        // Verify update
        const selectQuery = db
          .selectFrom('user')
          .selectAll()
          .where('id', '=', inserted.id);

        const result = await adapter.execute(selectQuery);
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value[0].name).toBe('Updated');
        }
      }
    });

    test('execute can delete records', async () => {
      const kyselyResult = adapter.getKysely();
      if (isOk(kyselyResult)) {
        const db = kyselyResult.value;

        // Insert user
        await db
          .insertInto('user')
          .values({
            email: 'delete@example.com',
            name: 'To Delete',
          })
          .execute();

        // Get the inserted user
        const inserted = await db
          .selectFrom('user')
          .selectAll()
          .where('email', '=', 'delete@example.com')
          .executeTakeFirstOrThrow();

        // Delete user
        const deleteQuery = db
          .deleteFrom('user')
          .where('id', '=', inserted.id);

        const deleteResult = await adapter.execute(deleteQuery);
        expect(isOk(deleteResult)).toBe(true);

        // Verify deletion
        const selectQuery = db
          .selectFrom('user')
          .selectAll()
          .where('id', '=', inserted.id);

        const selectResult = await adapter.execute(selectQuery);
        if (isOk(selectResult)) {
          expect(selectResult.value.length).toBe(0);
        }
      }
    });
  });

  describe('Transactions', () => {
    beforeEach(async () => {
      await adapter.init({ kysely });
      await adapter.start();
    });

    test('successful transaction commits changes', async () => {
      const result = await adapter.transaction(async (trx) => {
        await trx
          .insertInto('user')
          .values({
            email: 'tx@example.com',
            name: 'TX User',
          })
          .execute();

        const user = await trx
          .selectFrom('user')
          .selectAll()
          .where('email', '=', 'tx@example.com')
          .executeTakeFirstOrThrow();

        await trx
          .insertInto('post')
          .values({
            title: 'TX Post',
            author_id: user.id,
          })
          .execute();

        return user.id;
      });

      expect(isOk(result)).toBe(true);

      // Verify data was committed
      const kyselyResult = adapter.getKysely();
      if (isOk(kyselyResult)) {
        const user = await kyselyResult.value
          .selectFrom('user')
          .selectAll()
          .where('email', '=', 'tx@example.com')
          .executeTakeFirst();

        expect(user).not.toBeUndefined();

        const posts = await kyselyResult.value
          .selectFrom('post')
          .selectAll()
          .where('author_id', '=', user!.id)
          .execute();

        expect(posts.length).toBe(1);
      }
    });

    test('failed transaction rolls back changes', async () => {
      const result = await adapter.transaction(async (trx) => {
        await trx
          .insertInto('user')
          .values({
            email: 'rollback@example.com',
            name: 'Rollback User',
          })
          .execute();

        // Force error
        throw new Error('Transaction failed');
      });

      expect(isErr(result)).toBe(true);

      // Verify data was rolled back
      const kyselyResult = adapter.getKysely();
      if (isOk(kyselyResult)) {
        const users = await kyselyResult.value
          .selectFrom('user')
          .selectAll()
          .where('email', '=', 'rollback@example.com')
          .execute();

        expect(users.length).toBe(0);
      }
    });
  });

  describe('Type-Safe Queries', () => {
    beforeEach(async () => {
      await adapter.init({ kysely });
      await adapter.start();
    });

    test('complex query with joins', async () => {
      const kyselyResult = adapter.getKysely();
      if (isOk(kyselyResult)) {
        const db = kyselyResult.value;

        // Insert test data
        await db
          .insertInto('user')
          .values({
            email: 'join@example.com',
            name: 'Join User',
          })
          .execute();

        const user = await db
          .selectFrom('user')
          .selectAll()
          .where('email', '=', 'join@example.com')
          .executeTakeFirstOrThrow();

        await db
          .insertInto('post')
          .values({
            title: 'Post 1',
            published: 1,
            author_id: user.id,
          })
          .execute();

        // Query with join
        const query = db
          .selectFrom('user')
          .innerJoin('post', 'post.author_id', 'user.id')
          .select([
            'user.name',
            'post.title',
            'post.published',
          ])
          .where('user.email', '=', 'join@example.com');

        const result = await adapter.execute(query);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.length).toBe(1);
          expect(result.value[0].name).toBe('Join User');
        }
      }
    });

    test('aggregation query', async () => {
      const kyselyResult = adapter.getKysely();
      if (isOk(kyselyResult)) {
        const db = kyselyResult.value;

        // Insert test data
        await db
          .insertInto('user')
          .values([
            { email: 'user1@example.com', name: 'User 1', age: 25 },
            { email: 'user2@example.com', name: 'User 2', age: 30 },
            { email: 'user3@example.com', name: 'User 3', age: 35 },
          ])
          .execute();

        // Aggregation query
        const query = db
          .selectFrom('user')
          .select((eb) => [
            eb.fn.count<number>('id').as('count'),
            eb.fn.avg<number>('age').as('avg_age'),
            eb.fn.max<number>('age').as('max_age'),
            eb.fn.min<number>('age').as('min_age'),
          ]);

        const result = await adapter.execute(query);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          const stats = result.value[0];
          expect(stats.count).toBe(3);
          expect(stats.avg_age).toBe(30);
        }
      }
    });
  });

  describe('Error Handling', () => {
    test('operations fail when not initialized', async () => {
      const result = await adapter.transaction(async (trx) => {
        return true;
      });

      expect(isErr(result)).toBe(true);
    });

    test('execute handles errors', async () => {
      await adapter.init({ kysely });
      await adapter.start();

      const kyselyResult = adapter.getKysely();
      if (isOk(kyselyResult)) {
        const query = kyselyResult.value
          .selectFrom('non_existent_table' as any)
          .selectAll();

        const result = await adapter.execute(query);
        expect(isErr(result)).toBe(true);
      }
    });
  });
});
