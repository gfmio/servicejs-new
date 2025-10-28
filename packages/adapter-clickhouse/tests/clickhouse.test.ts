import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { createClickHouseAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

describe('ClickHouse Adapter', () => {
  let container: StartedTestContainer;
  let adapter: ReturnType<typeof createClickHouseAdapter>;
  let config: { host: string; username: string; password: string; database: string };

  beforeAll(async () => {
    // Start ClickHouse container
    container = await new GenericContainer('clickhouse/clickhouse-server:latest')
      .withExposedPorts(8123)
      .withEnvironment({
        CLICKHOUSE_DB: 'test',
        CLICKHOUSE_USER: 'test',
        CLICKHOUSE_PASSWORD: 'test',
      })
      .withStartupTimeout(120000)
      .start();

    const host = container.getHost();
    const port = container.getMappedPort(8123);

    config = {
      host: `http://${host}:${port}`,
      username: 'test',
      password: 'test',
      database: 'test',
    };

    adapter = createClickHouseAdapter();
    const initResult = await adapter.init(config);
    expect(isOk(initResult)).toBe(true);

    const startResult = await adapter.start();
    expect(isOk(startResult)).toBe(true);
  }, 180000);

  afterAll(async () => {
    if (adapter) {
      await adapter.stop();
      await adapter.destroy();
    }
    if (container) {
      await container.stop();
    }
  });

  describe('Lifecycle', () => {
    test('health returns healthy after init', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }
    });
  });

  describe('Query Operations', () => {
    test('create table and insert data', async () => {
      // Create table
      const createResult = await adapter.query({
        query: `
          CREATE TABLE IF NOT EXISTS test_table (
            id UInt32,
            name String,
            value Float64
          ) ENGINE = MergeTree()
          ORDER BY id
        `,
      });
      expect(isOk(createResult)).toBe(true);

      // Insert data
      const insertResult = await adapter.insert('test_table', [
        { id: 1, name: 'Alice', value: 100.5 },
        { id: 2, name: 'Bob', value: 200.75 },
      ]);
      expect(isOk(insertResult)).toBe(true);

      // Query data
      const queryResult = await adapter.query<{ id: number; name: string; value: number }>({
        query: 'SELECT * FROM test_table ORDER BY id',
      });
      expect(isOk(queryResult)).toBe(true);
      if (isOk(queryResult)) {
        expect(queryResult.value.rows.length).toBe(2);
        expect(queryResult.value.rows[0].name).toBe('Alice');
        expect(queryResult.value.rows[1].name).toBe('Bob');
      }
    });

    test('query with parameters', async () => {
      const result = await adapter.query<{ id: number; name: string; value: number }>({
        query: 'SELECT * FROM test_table WHERE id = {id:UInt32}',
        params: { id: 1 },
      });
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.rows.length).toBe(1);
        expect(result.value.rows[0].name).toBe('Alice');
      }
    });

    test('insertMany works', async () => {
      const result = await adapter.insertMany('test_table', [
        { id: 3, name: 'Charlie', value: 300.0 },
        { id: 4, name: 'Diana', value: 400.0 },
      ]);
      expect(isOk(result)).toBe(true);

      const queryResult = await adapter.query<{ id: number }>({
        query: 'SELECT COUNT(*) as id FROM test_table',
      });
      expect(isOk(queryResult)).toBe(true);
      if (isOk(queryResult)) {
        expect(queryResult.value.rows[0].id).toBe(4);
      }
    });
  });
});
