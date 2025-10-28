/**
 * Tests for Node.js SQLite Adapter
 *
 * Note: These tests require Node.js due to better-sqlite3 being a native module.
 * Run with: node --test tests/**/*.test.ts
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createSqliteAdapter } from '../src/sqlite.js';
import { isOk, isErr } from '@servicejs/result';
import type { DatabaseAdapter } from '@servicejs/integration-database';
import { unlinkSync } from 'fs';

let adapter: DatabaseAdapter;
const testDbFile = './test-db.sqlite';

describe('Node.js SQLite Adapter', () => {
  beforeEach(async () => {
    adapter = createSqliteAdapter();
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.stop();
      await adapter.destroy();
    }
    // Clean up test database file
    try {
      unlinkSync(testDbFile);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe('Lifecycle', () => {
    test('should initialize with in-memory database', async () => {
      const result = await adapter.init({ filename: ':memory:' });
      expect(isOk(result)).toBe(true);
    });

    test('should initialize with file database', async () => {
      const result = await adapter.init({ filename: testDbFile });
      expect(isOk(result)).toBe(true);
    });

    test('should fail to initialize without filename', async () => {
      const result = await adapter.init({} as any);
      expect(isErr(result)).toBe(true);
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
    test('should report healthy when connected', async () => {
      await adapter.init({ filename: ':memory:' });
      await adapter.start();

      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }
    });

    test('should report unhealthy when not initialized', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('unhealthy');
      }
    });
  });

  describe('Basic Queries', () => {
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

    test('should insert data', async () => {
      await adapter.query({
        text: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)',
      });

      const result = await adapter.query({
        text: 'INSERT INTO users (name, email) VALUES (?, ?)',
        params: ['Alice', 'alice@example.com'],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.rowCount).toBe(1);
      }
    });

    test('should query data', async () => {
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

    test('should update data', async () => {
      await adapter.query({
        text: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)',
      });

      await adapter.query({
        text: 'INSERT INTO users (name, email) VALUES (?, ?)',
        params: ['Alice', 'alice@example.com'],
      });

      const result = await adapter.query({
        text: 'UPDATE users SET email = ? WHERE name = ?',
        params: ['newalice@example.com', 'Alice'],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.rowCount).toBe(1);
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

      const result = await adapter.query({
        text: 'DELETE FROM users WHERE name = ?',
        params: ['Alice'],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.rowCount).toBe(1);
      }
    });

    test('should use parameterized queries', async () => {
      await adapter.query({
        text: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)',
      });

      const result = await adapter.query({
        text: 'INSERT INTO users (name, email) VALUES (?, ?)',
        params: ['Bob', 'bob@example.com'],
      });

      expect(isOk(result)).toBe(true);

      const selectResult = await adapter.query<{ name: string }>({
        text: 'SELECT name FROM users WHERE email = ?',
        params: ['bob@example.com'],
      });

      expect(isOk(selectResult)).toBe(true);
      if (isOk(selectResult)) {
        expect(selectResult.value.rows[0].name).toBe('Bob');
      }
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

    test('should commit transaction', async () => {
      const txResult = await adapter.begin();
      expect(isOk(txResult)).toBe(true);

      if (isOk(txResult)) {
        const tx = txResult.value;

        await tx.query({
          text: 'INSERT INTO users (name, email) VALUES (?, ?)',
          params: ['Charlie', 'charlie@example.com'],
        });

        const commitResult = await tx.commit();
        expect(isOk(commitResult)).toBe(true);

        // Verify data was committed
        const result = await adapter.query<{ name: string }>({
          text: 'SELECT name FROM users WHERE email = ?',
          params: ['charlie@example.com'],
        });

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.rows.length).toBe(1);
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
          params: ['Dave', 'dave@example.com'],
        });

        const rollbackResult = await tx.rollback();
        expect(isOk(rollbackResult)).toBe(true);

        // Verify data was not committed
        const result = await adapter.query<{ name: string }>({
          text: 'SELECT name FROM users WHERE email = ?',
          params: ['dave@example.com'],
        });

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.rows.length).toBe(0);
        }
      }
    });

    test('should use transaction helper', async () => {
      const result = await adapter.transaction(async (tx) => {
        await tx.query({
          text: 'INSERT INTO users (name, email) VALUES (?, ?)',
          params: ['Eve', 'eve@example.com'],
        });

        return isOk(
          await tx.query({
            text: 'INSERT INTO users (name, email) VALUES (?, ?)',
            params: ['Frank', 'frank@example.com'],
          })
        )
          ? { _tag: 'Ok' as const, value: undefined }
          : { _tag: 'Err' as const, error: new Error('Failed') };
      });

      expect(isOk(result)).toBe(true);

      // Verify both inserts were committed
      const selectResult = await adapter.query<{ name: string }>({
        text: 'SELECT name FROM users ORDER BY name',
      });

      expect(isOk(selectResult)).toBe(true);
      if (isOk(selectResult)) {
        expect(selectResult.value.rows.length).toBe(2);
        expect(selectResult.value.rows[0].name).toBe('Eve');
        expect(selectResult.value.rows[1].name).toBe('Frank');
      }
    });

    test('should auto-rollback on error in transaction helper', async () => {
      const result = await adapter.transaction(async (tx) => {
        await tx.query({
          text: 'INSERT INTO users (name, email) VALUES (?, ?)',
          params: ['Grace', 'grace@example.com'],
        });

        // Return error to trigger rollback
        return { _tag: 'Err' as const, error: new Error('Intentional error') };
      });

      expect(isErr(result)).toBe(true);

      // Verify data was rolled back
      const selectResult = await adapter.query<{ name: string }>({
        text: 'SELECT name FROM users',
      });

      expect(isOk(selectResult)).toBe(true);
      if (isOk(selectResult)) {
        expect(selectResult.value.rows.length).toBe(0);
      }
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await adapter.init({ filename: ':memory:' });
      await adapter.start();
    });

    test('should handle invalid SQL', async () => {
      const result = await adapter.query({
        text: 'INVALID SQL STATEMENT',
      });

      expect(isErr(result)).toBe(true);
    });

    test('should handle query on non-existent table', async () => {
      const result = await adapter.query({
        text: 'SELECT * FROM non_existent_table',
      });

      expect(isErr(result)).toBe(true);
    });
  });
});
