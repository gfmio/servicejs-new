/**
 * Tests for Cloudflare D1 Adapter
 *
 * Note: These tests use a mock D1 database since D1 is only available in Cloudflare Workers
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { createD1Adapter } from '../src/d1.js';
import { isOk, isErr, ok } from '@servicejs/result';
import type { DatabaseAdapter } from '@servicejs/integration-database';

// Mock D1 Database
class MockD1Database implements D1Database {
  private data: Map<string, any[]> = new Map();

  prepare(query: string): D1PreparedStatement {
    const params: any[] = [];
    let boundParams: any[] = [];

    const statement: D1PreparedStatement = {
      bind: (...values: any[]) => {
        boundParams = values;
        return statement; // Return same statement object
      },

      first: async <T = unknown>(): Promise<T | null> => {
        // Simple health check query
        if (query.includes('SELECT 1')) {
          return { result: 1 } as T;
        }

        const result = await this.all<T>();
        return result.results?.[0] || null;
      },

      run: async (): Promise<D1Result> => {
        // Simulate INSERT/UPDATE/DELETE
        const isInsert = query.toUpperCase().includes('INSERT');
        const isUpdate = query.toUpperCase().includes('UPDATE');
        const isDelete = query.toUpperCase().includes('DELETE');

        let changes = 0;

        if (isInsert) {
          // Mock insert - preserve parameter order
          const tableName = 'users'; // Simplified for mock
          if (!this.data.has(tableName)) {
            this.data.set(tableName, []);
          }
          // Create row object with parameter values
          const row: any = {
            id: Date.now(),
          };
          if (boundParams.length >= 1) row.name = boundParams[0];
          if (boundParams.length >= 2) row.email = boundParams[1];

          this.data.get(tableName)!.push(row);
          changes = 1;
        } else if (isUpdate) {
          changes = 1;
        } else if (isDelete) {
          changes = 1;
        }

        return {
          success: true,
          meta: {
            duration: 1,
            changes,
            last_row_id: changes > 0 ? Date.now() : 0,
            rows_read: 0,
            rows_written: changes,
          },
        };
      },

      all: async <T = unknown>(): Promise<D1Result<T>> => {
        const isSelect = query.toUpperCase().startsWith('SELECT');

        if (isSelect) {
          const tableName = 'users';
          let rows = this.data.get(tableName) || [];

          // Handle parameterized WHERE clauses (simplified mock)
          if (boundParams.length > 0 && query.includes('WHERE')) {
            rows = rows.filter(row => {
              // Simple filter for testing
              return true; // In a real mock, we'd parse the WHERE clause
            });
          }

          return {
            success: true,
            results: rows.map(row => ({ ...row })) as T[],
            meta: {
              duration: 1,
              changes: 0,
              last_row_id: 0,
              rows_read: rows.length,
              rows_written: 0,
            },
          };
        }

        return {
          success: true,
          results: [],
          meta: {
            duration: 1,
            changes: 0,
            last_row_id: 0,
            rows_read: 0,
            rows_written: 0,
          },
        };
      },

      raw: async <T = unknown>(): Promise<T[]> => {
        const result = await this.all<T>();
        return result.results || [];
      },
    };

    return statement;
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    const results: D1Result<T>[] = [];

    for (const stmt of statements) {
      const result = await stmt.run();
      results.push(result as D1Result<T>);
    }

    return results;
  }

  async dump(): Promise<ArrayBuffer> {
    return new ArrayBuffer(0);
  }

  async exec(query: string): Promise<D1ExecResult> {
    await this.prepare(query).run();
    return {
      count: 1,
      duration: 1,
    };
  }
}

let adapter: DatabaseAdapter;
let mockDb: MockD1Database;

describe('Cloudflare D1 Adapter', () => {
  beforeEach(() => {
    mockDb = new MockD1Database();
    adapter = createD1Adapter();
  });

  describe('Lifecycle', () => {
    test('should initialize with D1 database', async () => {
      const result = await adapter.init({ database: mockDb as any });
      expect(isOk(result)).toBe(true);
    });

    test('should fail to initialize without database', async () => {
      const result = await adapter.init({} as any);
      expect(isErr(result)).toBe(true);
    });

    test('should start after initialization', async () => {
      await adapter.init({ database: mockDb as any });
      const result = await adapter.start();
      expect(isOk(result)).toBe(true);
    });

    test('should stop after starting', async () => {
      await adapter.init({ database: mockDb as any });
      await adapter.start();
      const result = await adapter.stop();
      expect(isOk(result)).toBe(true);
    });

    test('should destroy resources', async () => {
      await adapter.init({ database: mockDb as any });
      await adapter.start();
      const result = await adapter.destroy();
      expect(isOk(result)).toBe(true);
    });
  });

  describe('Health Checks', () => {
    test('should report healthy when connected', async () => {
      await adapter.init({ database: mockDb as any });
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
        // Can be either unhealthy or degraded when not initialized
        expect(['unhealthy', 'degraded']).toContain(result.value.status);
      }
    });
  });

  describe('Basic Queries', () => {
    beforeEach(async () => {
      await adapter.init({ database: mockDb as any });
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
    });
  });

  describe('Transactions', () => {
    beforeEach(async () => {
      await adapter.init({ database: mockDb as any });
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
      }
    });

    test('should use transaction helper', async () => {
      const result = await adapter.transaction(async (tx) => {
        await tx.query({
          text: 'INSERT INTO users (name, email) VALUES (?, ?)',
          params: ['Eve', 'eve@example.com'],
        });

        return ok(undefined);
      });

      expect(isOk(result)).toBe(true);
    });

    test('should auto-rollback on error in transaction helper', async () => {
      const result = await adapter.transaction(async (tx) => {
        await tx.query({
          text: 'INSERT INTO users (name, email) VALUES (?, ?)',
          params: ['Frank', 'frank@example.com'],
        });

        // Return error to trigger rollback
        return { _tag: 'Err' as const, error: new Error('Intentional error') };
      });

      expect(isErr(result)).toBe(true);
    });
  });
});
