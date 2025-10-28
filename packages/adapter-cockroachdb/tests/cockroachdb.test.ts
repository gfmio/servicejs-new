import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { createCockroachDBAdapter } from '../src/cockroachdb.js';
import { isOk, isErr } from '@servicejs/result';

describe('CockroachDB Adapter', () => {
  let container: StartedTestContainer | undefined;
  let adapter: ReturnType<typeof createCockroachDBAdapter>;
  let config: { host: string; port: number; user: string; database: string };

  beforeAll(async () => {
    try {
      container = await new GenericContainer('cockroachdb/cockroach:latest')
        .withExposedPorts(26257)
        .withCommand(['start-single-node', '--insecure'])
        .withStartupTimeout(120000)
        .start();

      config = {
        host: container.getHost(),
        port: container.getMappedPort(26257),
        user: 'root',
        database: 'defaultdb',
      };

      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      console.warn('Failed to start CockroachDB container:', error);
      config = {
        host: 'localhost',
        port: 26257,
        user: 'root',
        database: 'defaultdb',
      };
    }

    adapter = createCockroachDBAdapter();
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
    adapter = createCockroachDBAdapter();
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
      await adapter.query({ text: 'DROP TABLE IF EXISTS users CASCADE' });
      await adapter.query({
        text: 'CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(255), age INT)',
      });
    });

    test('query retrieves data', async () => {
      await adapter.query({
        text: 'INSERT INTO users (name, age) VALUES ($1, $2), ($3, $4)',
        params: ['Alice', 30, 'Bob', 25],
      });

      const result = await adapter.query({
        text: 'SELECT * FROM users WHERE age >= $1',
        params: [30],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok.rows.length).toBeGreaterThanOrEqual(1);
      }
    });

    test('transactions work correctly', async () => {
      const txResult = await adapter.begin();
      expect(isOk(txResult)).toBe(true);

      if (isOk(txResult)) {
        const tx = txResult.ok;
        await tx.query({
          text: 'INSERT INTO users (name, age) VALUES ($1, $2)',
          params: ['Charlie', 35],
        });
        await tx.commit();

        const checkResult = await adapter.query({
          text: 'SELECT * FROM users WHERE name = $1',
          params: ['Charlie'],
        });
        expect(isOk(checkResult)).toBe(true);
        if (isOk(checkResult)) {
          expect(checkResult.ok.rows.length).toBe(1);
        }
      }
    });
  });
});
