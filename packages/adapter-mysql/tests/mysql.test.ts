import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { createMySQLAdapter } from '../src/mysql.js';
import { isOk, isErr } from '@servicejs/result';

describe('MySQL Adapter', () => {
  let container: StartedTestContainer | undefined;
  let adapter: ReturnType<typeof createMySQLAdapter>;
  let config: { host: string; port: number; user: string; password: string; database: string };

  beforeAll(async () => {
    try {
      // Start MySQL container
      container = await new GenericContainer('mysql:8.0')
        .withExposedPorts(3306)
        .withEnvironment({
          MYSQL_ROOT_PASSWORD: 'test',
          MYSQL_DATABASE: 'testdb',
        })
        .withStartupTimeout(120000)
        .start();

      const host = container.getHost();
      const port = container.getMappedPort(3306);

      config = {
        host,
        port,
        user: 'root',
        password: 'test',
        database: 'testdb',
      };

      // Wait for MySQL to be ready
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      console.warn('Failed to start MySQL container:', error);
      config = {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'test',
        database: 'testdb',
      };
    }

    adapter = createMySQLAdapter();
  }, 120000);

  afterAll(async () => {
    if (adapter) {
      await adapter.destroy();
    }
    if (container) {
      await container.stop();
    }
  });

  beforeEach(async () => {
    if (adapter) {
      await adapter.destroy();
    }
    adapter = createMySQLAdapter();
  });

  describe('Lifecycle', () => {
    test('init succeeds with valid config', async () => {
      const result = await adapter.init(config);
      expect(isOk(result)).toBe(true);
    });

    test('start succeeds after init', async () => {
      await adapter.init(config);
      const result = await adapter.start();
      expect(isOk(result)).toBe(true);
    });

    test('start fails before init', async () => {
      const result = await adapter.start();
      expect(isErr(result)).toBe(true);
    });

    test('destroy succeeds', async () => {
      await adapter.init(config);
      const result = await adapter.destroy();
      expect(isOk(result)).toBe(true);
    });
  });

  describe('Health', () => {
    test('health returns unhealthy before init', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok.status).toBe('unhealthy');
      }
    });

    test('health returns healthy after init', async () => {
      await adapter.init(config);
      await adapter.start();

      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok.status).toBe('healthy');
      }
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      await adapter.init(config);
      await adapter.start();

      // Create test table
      await adapter.execute({
        text: 'DROP TABLE IF EXISTS users',
      });
      await adapter.execute({
        text: 'CREATE TABLE users (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255), age INT)',
      });
    });

    test('execute creates table', async () => {
      const result = await adapter.execute({
        text: 'CREATE TABLE IF NOT EXISTS test_table (id INT PRIMARY KEY)',
      });

      expect(isOk(result)).toBe(true);
    });

    test('execute inserts data', async () => {
      const result = await adapter.execute({
        text: 'INSERT INTO users (name, age) VALUES (?, ?)',
        params: ['Alice', 30],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok.affectedRows).toBe(1);
        expect(result.ok.insertId).toBeGreaterThan(0);
      }
    });

    test('query retrieves data', async () => {
      await adapter.execute({
        text: 'INSERT INTO users (name, age) VALUES (?, ?), (?, ?), (?, ?)',
        params: ['Alice', 30, 'Bob', 25, 'Charlie', 35],
      });

      const result = await adapter.query({
        text: 'SELECT * FROM users WHERE age >= ?',
        params: [30],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok.rows.length).toBeGreaterThanOrEqual(2);
        expect(result.ok.rowCount).toBe(result.ok.rows.length);
      }
    });

    test('execute updates data', async () => {
      await adapter.execute({
        text: 'INSERT INTO users (name, age) VALUES (?, ?)',
        params: ['Alice', 30],
      });

      const result = await adapter.execute({
        text: 'UPDATE users SET age = ? WHERE name = ?',
        params: [31, 'Alice'],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok.affectedRows).toBe(1);
      }
    });

    test('execute deletes data', async () => {
      await adapter.execute({
        text: 'INSERT INTO users (name, age) VALUES (?, ?)',
        params: ['Alice', 30],
      });

      const result = await adapter.execute({
        text: 'DELETE FROM users WHERE name = ?',
        params: ['Alice'],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok.affectedRows).toBe(1);
      }
    });
  });

  describe('Transactions', () => {
    beforeEach(async () => {
      await adapter.init(config);
      await adapter.start();

      // Create accounts table
      await adapter.execute({
        text: 'DROP TABLE IF EXISTS accounts',
      });
      await adapter.execute({
        text: 'CREATE TABLE accounts (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255), balance DECIMAL(10,2))',
      });
      await adapter.execute({
        text: 'INSERT INTO accounts (name, balance) VALUES (?, ?), (?, ?)',
        params: ['Alice', 100, 'Bob', 50],
      });
    });

    test('commit transaction', async () => {
      const txResult = await adapter.begin();
      expect(isOk(txResult)).toBe(true);

      if (isOk(txResult)) {
        const tx = txResult.ok;

        await tx.query({
          text: 'SELECT * FROM accounts WHERE name = ?',
          params: ['Alice'],
        });

        const commitResult = await tx.commit();
        expect(isOk(commitResult)).toBe(true);
      }
    });

    test('rollback transaction', async () => {
      const txResult = await adapter.begin();
      expect(isOk(txResult)).toBe(true);

      if (isOk(txResult)) {
        const tx = txResult.ok;

        await tx.query({
          text: 'UPDATE accounts SET balance = balance - 50 WHERE name = ?',
          params: ['Alice'],
        });

        const rollbackResult = await tx.rollback();
        expect(isOk(rollbackResult)).toBe(true);

        // Verify balance unchanged
        const checkResult = await adapter.query({
          text: 'SELECT balance FROM accounts WHERE name = ?',
          params: ['Alice'],
        });
        if (isOk(checkResult) && checkResult.ok.rows.length > 0) {
          expect((checkResult.ok.rows[0] as any).balance).toBe('100.00');
        }
      }
    });

    test('cannot commit twice', async () => {
      const txResult = await adapter.begin();
      expect(isOk(txResult)).toBe(true);

      if (isOk(txResult)) {
        const tx = txResult.ok;
        await tx.commit();
        const secondCommit = await tx.commit();
        expect(isErr(secondCommit)).toBe(true);
      }
    });

    test('cannot rollback after commit', async () => {
      const txResult = await adapter.begin();
      expect(isOk(txResult)).toBe(true);

      if (isOk(txResult)) {
        const tx = txResult.ok;
        await tx.commit();
        const rollbackResult = await tx.rollback();
        expect(isErr(rollbackResult)).toBe(true);
      }
    });
  });
});
