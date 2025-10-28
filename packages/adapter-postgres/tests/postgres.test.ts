/**
 * Tests for PostgreSQL Adapter
 *
 * These tests require Docker to be installed and running
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { createPostgresAdapter } from '../src/postgres.js';
import { ok, err, isOk, isErr } from '@servicejs/result';
import type { DatabaseAdapter } from '@servicejs/integration-database';
import { startPostgresContainer, isDockerAvailable, type PostgresContainer } from './postgres-container.js';

let postgresContainer: PostgresContainer | null = null;
let adapter: DatabaseAdapter;

// Check if Docker is available, skip tests if not
const dockerAvailable = await isDockerAvailable();

if (!dockerAvailable) {
  console.log('⚠️  Docker not available, skipping PostgreSQL tests');
  console.log('   Install Docker to run these tests: https://www.docker.com/get-started\n');
}

const describeWithDocker = dockerAvailable ? describe : describe.skip;

describeWithDocker('PostgreSQL Adapter', () => {
  beforeAll(async () => {
    if (!dockerAvailable) return;

    postgresContainer = await startPostgresContainer();
    adapter = createPostgresAdapter();
  });

  afterAll(async () => {
    if (adapter) {
      await adapter.stop();
      await adapter.destroy();
    }
    if (postgresContainer) {
      await postgresContainer.stop();
    }
  });

  describe('Lifecycle', () => {
    test('should initialize with valid config', async () => {
      const result = await adapter.init({
        host: postgresContainer!.host,
        port: postgresContainer!.port,
        database: postgresContainer!.database,
        user: postgresContainer!.user,
        password: postgresContainer!.password,
      });
      expect(isOk(result)).toBe(true);
    });

    test('should start after initialization', async () => {
      const result = await adapter.start();
      expect(isOk(result)).toBe(true);
    });

    test('should stop after starting', async () => {
      const result = await adapter.stop();
      expect(isOk(result)).toBe(true);
    });

    test('should destroy resources', async () => {
      const result = await adapter.destroy();
      expect(isOk(result)).toBe(true);

      // Re-initialize for other tests
      await adapter.init({
        host: postgresContainer!.host,
        port: postgresContainer!.port,
        database: postgresContainer!.database,
        user: postgresContainer!.user,
        password: postgresContainer!.password,
      });
      await adapter.start();
    });
  });

  describe('Health Checks', () => {
    test('should report healthy when connected', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }
    });
  });

  describe('Schema Operations', () => {
    test('should create table', async () => {
      const result = await adapter.query({
        text: `
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `,
      });
      expect(isOk(result)).toBe(true);
    });

    test('should drop table', async () => {
      await adapter.query({ text: 'CREATE TABLE IF NOT EXISTS temp_table (id INT)' });
      const result = await adapter.query({ text: 'DROP TABLE IF EXISTS temp_table' });
      expect(isOk(result)).toBe(true);
    });
  });

  describe('CRUD Operations', () => {
    beforeAll(async () => {
      // Clear table for tests
      await adapter.query({ text: 'DELETE FROM users' });
    });

    test('should insert data', async () => {
      const result = await adapter.query({
        text: 'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
        params: ['Alice', 'alice@example.com'],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.rows.length).toBe(1);
        expect(result.value.rows[0]).toMatchObject({
          name: 'Alice',
          email: 'alice@example.com',
        });
      }
    });

    test('should select data', async () => {
      const result = await adapter.query<{ id: number; name: string; email: string }>({
        text: 'SELECT * FROM users WHERE email = $1',
        params: ['alice@example.com'],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.rows.length).toBe(1);
        expect(result.value.rows[0].name).toBe('Alice');
        expect(result.value.rows[0].email).toBe('alice@example.com');
      }
    });

    test('should update data', async () => {
      const result = await adapter.query({
        text: 'UPDATE users SET name = $1 WHERE email = $2 RETURNING *',
        params: ['Alice Updated', 'alice@example.com'],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.rows[0]).toMatchObject({
          name: 'Alice Updated',
        });
      }
    });

    test('should delete data', async () => {
      const result = await adapter.query({
        text: 'DELETE FROM users WHERE email = $1',
        params: ['alice@example.com'],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.rowCount).toBe(1);
      }
    });

    test('should handle multiple inserts', async () => {
      await adapter.query({ text: 'DELETE FROM users' });

      for (let i = 1; i <= 3; i++) {
        const result = await adapter.query({
          text: 'INSERT INTO users (name, email) VALUES ($1, $2)',
          params: [`User ${i}`, `user${i}@example.com`],
        });
        expect(isOk(result)).toBe(true);
      }

      const selectResult = await adapter.query({ text: 'SELECT * FROM users' });
      expect(isOk(selectResult)).toBe(true);
      if (isOk(selectResult)) {
        expect(selectResult.value.rows.length).toBe(3);
      }
    });
  });

  describe('Parameterized Queries', () => {
    test('should handle various parameter types', async () => {
      await adapter.query({ text: 'DELETE FROM users' });

      const result = await adapter.query({
        text: 'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
        params: ['Test User', 'test@example.com'],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.rows[0]).toMatchObject({
          name: 'Test User',
          email: 'test@example.com',
        });
      }
    });

    test('should handle IN clause', async () => {
      await adapter.query({ text: 'DELETE FROM users' });
      await adapter.query({
        text: 'INSERT INTO users (name, email) VALUES ($1, $2), ($3, $4), ($5, $6)',
        params: ['User 1', 'user1@test.com', 'User 2', 'user2@test.com', 'User 3', 'user3@test.com'],
      });

      const result = await adapter.query({
        text: 'SELECT * FROM users WHERE email = ANY($1::text[])',
        params: [['user1@test.com', 'user3@test.com']],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.rows.length).toBe(2);
      }
    });
  });

  describe('Transactions', () => {
    beforeAll(async () => {
      await adapter.query({ text: 'DELETE FROM users' });
    });

    test('should begin transaction', async () => {
      const result = await adapter.begin();
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        await result.value.rollback();
      }
    });

    test('should commit transaction', async () => {
      const txResult = await adapter.begin();
      expect(isOk(txResult)).toBe(true);

      if (isOk(txResult)) {
        const tx = txResult.value;

        await tx.query({
          text: 'INSERT INTO users (name, email) VALUES ($1, $2)',
          params: ['TX User', 'tx@example.com'],
        });

        const commitResult = await tx.commit();
        expect(isOk(commitResult)).toBe(true);

        // Verify data was committed
        const checkResult = await adapter.query({
          text: 'SELECT * FROM users WHERE email = $1',
          params: ['tx@example.com'],
        });
        expect(isOk(checkResult)).toBe(true);
        if (isOk(checkResult)) {
          expect(checkResult.value.rows.length).toBe(1);
        }
      }
    });

    test('should rollback transaction', async () => {
      const txResult = await adapter.begin();
      expect(isOk(txResult)).toBe(true);

      if (isOk(txResult)) {
        const tx = txResult.value;

        await tx.query({
          text: 'INSERT INTO users (name, email) VALUES ($1, $2)',
          params: ['Rollback User', 'rollback@example.com'],
        });

        const rollbackResult = await tx.rollback();
        expect(isOk(rollbackResult)).toBe(true);

        // Verify data was NOT committed
        const checkResult = await adapter.query({
          text: 'SELECT * FROM users WHERE email = $1',
          params: ['rollback@example.com'],
        });
        expect(isOk(checkResult)).toBe(true);
        if (isOk(checkResult)) {
          expect(checkResult.value.rows.length).toBe(0);
        }
      }
    });

    test('should use transaction helper', async () => {
      await adapter.query({ text: 'DELETE FROM users' });

      const result = await adapter.transaction(async (tx) => {
        await tx.query({
          text: 'INSERT INTO users (name, email) VALUES ($1, $2)',
          params: ['Helper User 1', 'helper1@example.com'],
        });

        await tx.query({
          text: 'INSERT INTO users (name, email) VALUES ($1, $2)',
          params: ['Helper User 2', 'helper2@example.com'],
        });

        return ok({ success: true });
      });

      expect(isOk(result)).toBe(true);

      // Verify both inserts succeeded
      const checkResult = await adapter.query({ text: 'SELECT * FROM users' });
      expect(isOk(checkResult)).toBe(true);
      if (isOk(checkResult)) {
        expect(checkResult.value.rows.length).toBe(2);
      }
    });

    test('should rollback on error in transaction helper', async () => {
      await adapter.query({ text: 'DELETE FROM users' });

      const result = await adapter.transaction(async (tx) => {
        await tx.query({
          text: 'INSERT INTO users (name, email) VALUES ($1, $2)',
          params: ['Error User 1', 'error1@example.com'],
        });

        // Return error - should rollback
        return err(new Error('Transaction failed'));
      });

      expect(isErr(result)).toBe(true);

      // Verify no data was committed
      const checkResult = await adapter.query({ text: 'SELECT * FROM users' });
      expect(isOk(checkResult)).toBe(true);
      if (isOk(checkResult)) {
        expect(checkResult.value.rows.length).toBe(0);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle syntax errors', async () => {
      const result = await adapter.query({
        text: 'INVALID SQL STATEMENT',
      });

      expect(isErr(result)).toBe(true);
    });

    test('should handle constraint violations', async () => {
      await adapter.query({ text: 'DELETE FROM users' });

      // Insert first user
      await adapter.query({
        text: 'INSERT INTO users (name, email) VALUES ($1, $2)',
        params: ['User', 'duplicate@example.com'],
      });

      // Try to insert duplicate email (unique constraint)
      const result = await adapter.query({
        text: 'INSERT INTO users (name, email) VALUES ($1, $2)',
        params: ['Another User', 'duplicate@example.com'],
      });

      expect(isErr(result)).toBe(true);
    });

    test('should handle missing table', async () => {
      const result = await adapter.query({
        text: 'SELECT * FROM nonexistent_table',
      });

      expect(isErr(result)).toBe(true);
    });
  });

  describe('Result Metadata', () => {
    test('should return row count for INSERT', async () => {
      await adapter.query({ text: 'DELETE FROM users' });

      const result = await adapter.query({
        text: 'INSERT INTO users (name, email) VALUES ($1, $2), ($3, $4)',
        params: ['User 1', 'meta1@example.com', 'User 2', 'meta2@example.com'],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.rowCount).toBe(2);
      }
    });

    test('should return row count for UPDATE', async () => {
      await adapter.query({ text: 'DELETE FROM users' });
      await adapter.query({
        text: 'INSERT INTO users (name, email) VALUES ($1, $2), ($3, $4)',
        params: ['User 1', 'update1@example.com', 'User 2', 'update2@example.com'],
      });

      const result = await adapter.query({
        text: 'UPDATE users SET name = $1 WHERE email LIKE $2',
        params: ['Updated', '%update%'],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.rowCount).toBe(2);
      }
    });

    test('should return row count for DELETE', async () => {
      await adapter.query({ text: 'DELETE FROM users' });
      await adapter.query({
        text: 'INSERT INTO users (name, email) VALUES ($1, $2), ($3, $4)',
        params: ['User 1', 'delete1@example.com', 'User 2', 'delete2@example.com'],
      });

      const result = await adapter.query({
        text: 'DELETE FROM users WHERE email LIKE $1',
        params: ['%delete%'],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.rowCount).toBe(2);
      }
    });
  });

  describe('Connection String', () => {
    test('should connect using connection string', async () => {
      const newAdapter = createPostgresAdapter();

      const connectionString = `postgresql://${postgresContainer!.user}:${postgresContainer!.password}@${postgresContainer!.host}:${postgresContainer!.port}/${postgresContainer!.database}`;

      const initResult = await newAdapter.init({ connectionString });
      expect(isOk(initResult)).toBe(true);

      const startResult = await newAdapter.start();
      expect(isOk(startResult)).toBe(true);

      const queryResult = await newAdapter.query({ text: 'SELECT 1 AS result' });
      expect(isOk(queryResult)).toBe(true);
      if (isOk(queryResult)) {
        expect(queryResult.value.rows[0]).toEqual({ result: 1 });
      }

      await newAdapter.stop();
      await newAdapter.destroy();
    });
  });
});
