/**
 * Tests for Bun SQLite Database Adapter
 */

import type { DatabaseAdapter } from '@servicejs/integration-database';
import { err, isErr, isOk, ok } from '@servicejs/result';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createSqliteAdapter } from '../src/sqlite.js';

describe('SQLite Adapter', () => {
  let adapter: DatabaseAdapter;

  beforeEach(() => {
    adapter = createSqliteAdapter();
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.stop();
      await adapter.destroy();
    }
  });

  describe('Lifecycle', () => {
    test('should initialize with in-memory database', async () => {
      const result = await adapter.init({ filename: ':memory:' });
      expect(isOk(result)).toBe(true);
    });

    test('should initialize with file database', async () => {
      const result = await adapter.init({ filename: './test.db', create: true });
      expect(isOk(result)).toBe(true);
    });

    test('should fail to initialize without filename', async () => {
      const result = await adapter.init({} as any);
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('Filename is required');
      }
    });

    test('should start after initialization', async () => {
      await adapter.init({ filename: ':memory:' });
      const result = await adapter.start();
      expect(isOk(result)).toBe(true);
    });

    test('should stop after starting', async () => {
      await adapter.init({ filename: ':memory:' });
      await adapter.start();
      const result = await adapter.stop();
      expect(isOk(result)).toBe(true);
    });

    test('should destroy resources', async () => {
      await adapter.init({ filename: ':memory:' });
      await adapter.start();
      const result = await adapter.destroy();
      expect(isOk(result)).toBe(true);
    });
  });

  describe('Health Checks', () => {
    test('should report unhealthy or degraded when not initialized', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(['unhealthy', 'degraded']).toContain(result.value.status);
      }
    });

    test('should report healthy when initialized', async () => {
      await adapter.init({ filename: ':memory:' });
      await adapter.start();
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }
    });
  });

  describe('Query Execution', () => {
    beforeEach(async () => {
      await adapter.init({ filename: ':memory:' });
      await adapter.start();
    });

    test('should create table', async () => {
      const result = await adapter.query({
        text: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)',
      });
      expect(isOk(result)).toBe(true);
    });

    test('should insert data with parameters', async () => {
      await adapter.query({
        text: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)',
      });

      const result = await adapter.query({
        text: 'INSERT INTO users (name, email) VALUES (?, ?)',
        params: ['Alice', 'alice@example.com'],
      });

      expect(isOk(result)).toBe(true);
    });

    test('should select data', async () => {
      await adapter.query({
        text: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)',
      });

      await adapter.query({
        text: 'INSERT INTO users (name, email) VALUES (?, ?)',
        params: ['Alice', 'alice@example.com'],
      });

      const result = await adapter.query<{ id: number; name: string; email: string }>({
        text: 'SELECT * FROM users',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.rows.length).toBe(1);
        expect(result.value.rows[0].name).toBe('Alice');
        expect(result.value.rows[0].email).toBe('alice@example.com');
      }
    });

    test('should select with WHERE clause', async () => {
      await adapter.query({
        text: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)',
      });

      await adapter.query({
        text: 'INSERT INTO users (name, email) VALUES (?, ?)',
        params: ['Alice', 'alice@example.com'],
      });

      await adapter.query({
        text: 'INSERT INTO users (name, email) VALUES (?, ?)',
        params: ['Bob', 'bob@example.com'],
      });

      const result = await adapter.query<{ id: number; name: string; email: string }>({
        text: 'SELECT * FROM users WHERE name = ?',
        params: ['Alice'],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.rows.length).toBe(1);
        expect(result.value.rows[0].name).toBe('Alice');
      }
    });

    test('should update data', async () => {
      await adapter.query({
        text: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)',
      });

      await adapter.query({
        text: 'INSERT INTO users (name, email) VALUES (?, ?)',
        params: ['Alice', 'alice@example.com'],
      });

      const updateResult = await adapter.query({
        text: 'UPDATE users SET email = ? WHERE name = ?',
        params: ['alice.new@example.com', 'Alice'],
      });

      expect(isOk(updateResult)).toBe(true);

      const selectResult = await adapter.query<{ email: string }>({
        text: 'SELECT email FROM users WHERE name = ?',
        params: ['Alice'],
      });

      expect(isOk(selectResult)).toBe(true);
      if (isOk(selectResult)) {
        expect(selectResult.value.rows[0].email).toBe('alice.new@example.com');
      }
    });

    test('should delete data', async () => {
      await adapter.query({
        text: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)',
      });

      await adapter.query({
        text: 'INSERT INTO users (name, email) VALUES (?, ?)',
        params: ['Alice', 'alice@example.com'],
      });

      const deleteResult = await adapter.query({
        text: 'DELETE FROM users WHERE name = ?',
        params: ['Alice'],
      });

      expect(isOk(deleteResult)).toBe(true);

      const selectResult = await adapter.query<{ id: number }>({
        text: 'SELECT * FROM users',
      });

      expect(isOk(selectResult)).toBe(true);
      if (isOk(selectResult)) {
        expect(selectResult.value.rows.length).toBe(0);
      }
    });

    test('should handle multiple inserts', async () => {
      await adapter.query({
        text: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)',
      });

      const names = ['Alice', 'Bob', 'Charlie'];
      for (const name of names) {
        await adapter.query({
          text: 'INSERT INTO users (name, email) VALUES (?, ?)',
          params: [name, `${name.toLowerCase()}@example.com`],
        });
      }

      const result = await adapter.query<{ name: string }>({
        text: 'SELECT * FROM users',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.rows.length).toBe(3);
      }
    });

    test('should handle query errors', async () => {
      const result = await adapter.query({
        text: 'SELECT * FROM nonexistent_table',
      });

      expect(isErr(result)).toBe(true);
    });
  });

  describe('Transactions', () => {
    beforeEach(async () => {
      await adapter.init({ filename: ':memory:' });
      await adapter.start();
      await adapter.query({
        text: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)',
      });
    });

    test('should begin transaction', async () => {
      const result = await adapter.begin();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        await result.value.commit();
      }
    });

    test('should execute queries in transaction', async () => {
      const txResult = await adapter.begin();
      expect(isOk(txResult)).toBe(true);

      if (isOk(txResult)) {
        const tx = txResult.value;

        const insertResult = await tx.query({
          text: 'INSERT INTO users (name, email) VALUES (?, ?)',
          params: ['Alice', 'alice@example.com'],
        });

        expect(isOk(insertResult)).toBe(true);

        await tx.commit();

        const selectResult = await adapter.query<{ name: string }>({
          text: 'SELECT * FROM users',
        });

        expect(isOk(selectResult)).toBe(true);
        if (isOk(selectResult)) {
          expect(selectResult.value.rows.length).toBe(1);
        }
      }
    });

    test('should rollback transaction', async () => {
      const txResult = await adapter.begin();
      expect(isOk(txResult)).toBe(true);

      if (isOk(txResult)) {
        const tx = txResult.value;

        await tx.query({
          text: 'INSERT INTO users (name, email) VALUES (?, ?)',
          params: ['Alice', 'alice@example.com'],
        });

        await tx.rollback();

        const selectResult = await adapter.query<{ name: string }>({
          text: 'SELECT * FROM users',
        });

        expect(isOk(selectResult)).toBe(true);
        if (isOk(selectResult)) {
          expect(selectResult.value.rows.length).toBe(0);
        }
      }
    });

    test('should auto-commit on success with transaction helper', async () => {
      const result = await adapter.transaction(async (tx) => {
        await tx.query({
          text: 'INSERT INTO users (name, email) VALUES (?, ?)',
          params: ['Alice', 'alice@example.com'],
        });

        return ok({ success: true });
      });

      expect(isOk(result)).toBe(true);

      const selectResult = await adapter.query<{ name: string }>({
        text: 'SELECT * FROM users',
      });

      expect(isOk(selectResult)).toBe(true);
      if (isOk(selectResult)) {
        expect(selectResult.value.rows.length).toBe(1);
      }
    });

    test('should auto-rollback on error with transaction helper', async () => {
      const result = await adapter.transaction(async (tx) => {
        await tx.query({
          text: 'INSERT INTO users (name, email) VALUES (?, ?)',
          params: ['Alice', 'alice@example.com'],
        });

        return err(new Error('Intentional error'));
      });

      expect(isErr(result)).toBe(true);

      const selectResult = await adapter.query<{ name: string }>({
        text: 'SELECT * FROM users',
      });

      expect(isOk(selectResult)).toBe(true);
      if (isOk(selectResult)) {
        expect(selectResult.value.rows.length).toBe(0);
      }
    });

    test('should handle multiple operations in transaction', async () => {
      await adapter.query({
        text: 'CREATE TABLE profiles (id INTEGER PRIMARY KEY, user_id INTEGER, bio TEXT)',
      });

      const result = await adapter.transaction(async (tx) => {
        const userResult = await tx.query({
          text: 'INSERT INTO users (name, email) VALUES (?, ?) RETURNING id',
          params: ['Alice', 'alice@example.com'],
        });

        if (isErr(userResult)) {
          return userResult;
        }

        // For SQLite in Bun, RETURNING might not be supported, so let's use a different approach
        const selectResult = await tx.query<{ id: number }>({
          text: 'SELECT id FROM users WHERE name = ?',
          params: ['Alice'],
        });

        if (isErr(selectResult)) {
          return selectResult;
        }

        const userId = selectResult.value.rows[0]?.id;

        const profileResult = await tx.query({
          text: 'INSERT INTO profiles (user_id, bio) VALUES (?, ?)',
          params: [userId, 'Software engineer'],
        });

        if (isErr(profileResult)) {
          return profileResult;
        }

        return ok({ userId });
      });

      expect(isOk(result)).toBe(true);

      const usersResult = await adapter.query({ text: 'SELECT * FROM users' });
      const profilesResult = await adapter.query({ text: 'SELECT * FROM profiles' });

      expect(isOk(usersResult)).toBe(true);
      expect(isOk(profilesResult)).toBe(true);

      if (isOk(usersResult) && isOk(profilesResult)) {
        expect(usersResult.value.rows.length).toBe(1);
        expect(profilesResult.value.rows.length).toBe(1);
      }
    });

    test('should prevent operations after commit', async () => {
      const txResult = await adapter.begin();
      expect(isOk(txResult)).toBe(true);

      if (isOk(txResult)) {
        const tx = txResult.value;
        await tx.commit();

        const queryResult = await tx.query({
          text: 'SELECT 1',
        });

        expect(queryResult.isErr()).toBe(true);
        if (isErr(queryResult)) {
          expect(queryResult.error.message).toContain('Transaction already completed');
        }
      }
    });

    test('should prevent double commit', async () => {
      const txResult = await adapter.begin();
      expect(isOk(txResult)).toBe(true);

      if (isOk(txResult)) {
        const tx = txResult.value;
        await tx.commit();

        const secondCommit = await tx.commit();
        expect(secondCommit.isErr()).toBe(true);
        if (isErr(secondCommit)) {
          expect(secondCommit.error.message).toContain('Transaction already committed');
        }
      }
    });
  });
});
