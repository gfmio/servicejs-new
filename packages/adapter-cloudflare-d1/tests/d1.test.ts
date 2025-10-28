/**
 * Tests for Cloudflare D1 Database Adapter
 *
 * These tests run in a real Cloudflare Workers environment using Miniflare.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { isOk, isErr } from '@servicejs/result';
import { createD1Adapter } from '../src/d1.js';

describe('D1 Adapter', () => {
  const adapter = createD1Adapter();

  beforeEach(async () => {
    await adapter.init({ database: env.DB });
    await adapter.start();

    // Clean up database - drop and recreate test table
    const dropResult = await adapter.query({ text: 'DROP TABLE IF EXISTS users' });
    expect(isOk(dropResult)).toBe(true);

    const createResult = await adapter.query({
      text: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)',
    });
    expect(isOk(createResult)).toBe(true);
  });

  describe('Lifecycle', () => {
    test('should initialize with config', async () => {
      const adapter2 = createD1Adapter();
      const result = await adapter2.init({ database: env.DB });
      expect(isOk(result)).toBe(true);
      await adapter2.destroy();
    });

    test('should start successfully', async () => {
      const adapter2 = createD1Adapter();
      await adapter2.init({ database: env.DB });
      const result = await adapter2.start();
      expect(isOk(result)).toBe(true);
      await adapter2.destroy();
    });

    test('should stop successfully', async () => {
      const result = await adapter.stop();
      expect(isOk(result)).toBe(true);
    });

    test('should destroy successfully', async () => {
      const result = await adapter.destroy();
      expect(isOk(result)).toBe(true);
    });

    test('should fail to start if not initialized', async () => {
      const adapter2 = createD1Adapter();
      const result = await adapter2.start();
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('Database not initialized');
      }
    });
  });

  describe('Health Check', () => {
    test('should report healthy when initialized', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }
    });

    test('should report unhealthy when not initialized', async () => {
      const adapter2 = createD1Adapter();
      const result = await adapter2.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('unhealthy');
        expect(result.value.error?.message).toBe('Database not initialized');
      }
    });
  });

  describe('Query Execution', () => {
    test('should execute INSERT query', async () => {
      const result = await adapter.query({
        text: 'INSERT INTO users (name, email) VALUES (?, ?)',
        params: ['Alice', 'alice@example.com'],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.rowCount).toBe(1);
      }
    });

    test('should execute SELECT query', async () => {
      // Insert test data
      await adapter.query({
        text: 'INSERT INTO users (name, email) VALUES (?, ?)',
        params: ['Alice', 'alice@example.com'],
      });

      // Query data
      const result = await adapter.query<{ id: number; name: string; email: string }>({
        text: 'SELECT * FROM users WHERE name = ?',
        params: ['Alice'],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.rows).toHaveLength(1);
        expect(result.value.rows[0].name).toBe('Alice');
        expect(result.value.rows[0].email).toBe('alice@example.com');
      }
    });

    test('should execute UPDATE query', async () => {
      // Insert test data
      await adapter.query({
        text: 'INSERT INTO users (name, email) VALUES (?, ?)',
        params: ['Alice', 'alice@example.com'],
      });

      // Update data
      const result = await adapter.query({
        text: 'UPDATE users SET email = ? WHERE name = ?',
        params: ['newemail@example.com', 'Alice'],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.rowCount).toBe(1);
      }

      // Verify update
      const selectResult = await adapter.query<{ email: string }>({
        text: 'SELECT email FROM users WHERE name = ?',
        params: ['Alice'],
      });

      expect(isOk(selectResult)).toBe(true);
      if (isOk(selectResult)) {
        expect(selectResult.value.rows[0].email).toBe('newemail@example.com');
      }
    });

    test('should execute DELETE query', async () => {
      // Insert test data
      await adapter.query({
        text: 'INSERT INTO users (name, email) VALUES (?, ?)',
        params: ['Alice', 'alice@example.com'],
      });

      // Delete data
      const result = await adapter.query({
        text: 'DELETE FROM users WHERE name = ?',
        params: ['Alice'],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.rowCount).toBe(1);
      }

      // Verify deletion
      const selectResult = await adapter.query({
        text: 'SELECT * FROM users WHERE name = ?',
        params: ['Alice'],
      });

      expect(isOk(selectResult)).toBe(true);
      if (isOk(selectResult)) {
        expect(selectResult.value.rows).toHaveLength(0);
      }
    });

    test('should handle query without parameters', async () => {
      await adapter.query({
        text: 'INSERT INTO users (name, email) VALUES (?, ?)',
        params: ['Alice', 'alice@example.com'],
      });

      const result = await adapter.query<{ name: string; email: string }>({
        text: 'SELECT * FROM users',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.rows).toHaveLength(1);
      }
    });
  });

  describe('Transactions', () => {
    test('should execute transaction and commit', async () => {
      const txResult = await adapter.begin();
      expect(isOk(txResult)).toBe(true);

      if (isOk(txResult)) {
        const tx = txResult.value;

        // Insert within transaction
        await tx.query({
          text: 'INSERT INTO users (name, email) VALUES (?, ?)',
          params: ['Alice', 'alice@example.com'],
        });

        await tx.query({
          text: 'INSERT INTO users (name, email) VALUES (?, ?)',
          params: ['Bob', 'bob@example.com'],
        });

        // Commit
        const commitResult = await tx.commit();
        expect(isOk(commitResult)).toBe(true);
      }

      // Verify data was committed
      const result = await adapter.query({ text: 'SELECT * FROM users' });
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.rows).toHaveLength(2);
      }
    });

    test('should execute transaction and rollback', async () => {
      // Insert initial data
      await adapter.query({
        text: 'INSERT INTO users (name, email) VALUES (?, ?)',
        params: ['Alice', 'alice@example.com'],
      });

      // Start transaction
      const txResult = await adapter.begin();
      expect(isOk(txResult)).toBe(true);

      if (isOk(txResult)) {
        const tx = txResult.value;

        // Insert within transaction
        await tx.query({
          text: 'INSERT INTO users (name, email) VALUES (?, ?)',
          params: ['Bob', 'bob@example.com'],
        });

        // Rollback
        const rollbackResult = await tx.rollback();
        expect(isOk(rollbackResult)).toBe(true);
      }

      // Verify rollback - only Alice should exist
      const result = await adapter.query({ text: 'SELECT * FROM users' });
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.rows).toHaveLength(1);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle query without initialization', async () => {
      const adapter2 = createD1Adapter();
      const result = await adapter2.query({ text: 'SELECT 1' });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('Database not initialized');
      }
    });

    test('should handle invalid SQL', async () => {
      const result = await adapter.query({ text: 'INVALID SQL' });

      expect(isErr(result)).toBe(true);
    });

    test('should handle transaction without initialization', async () => {
      const adapter2 = createD1Adapter();
      const result = await adapter2.begin();

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('Database not initialized');
      }
    });
  });
});
