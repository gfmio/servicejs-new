import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { createTimescaleDBAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

describe('TimescaleDB Adapter', () => {
  let container: StartedTestContainer;
  let adapter: ReturnType<typeof createTimescaleDBAdapter>;

  beforeAll(async () => {
    // Start TimescaleDB container
    container = await new GenericContainer('timescale/timescaledb:latest-pg16')
      .withExposedPorts(5432)
      .withEnvironment({
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test',
        POSTGRES_DB: 'test',
      })
      .withStartupTimeout(120000)
      .start();

    const host = container.getHost();
    const port = container.getMappedPort(5432);

    const config = {
      host,
      port,
      user: 'test',
      password: 'test',
      database: 'test',
    };

    adapter = createTimescaleDBAdapter();
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
    test('create table and hypertable', async () => {
      // Create table
      const createResult = await adapter.query({
        text: `
          CREATE TABLE IF NOT EXISTS sensor_data (
            time TIMESTAMPTZ NOT NULL,
            sensor_id INTEGER,
            temperature DOUBLE PRECISION
          )
        `,
      });
      expect(isOk(createResult)).toBe(true);

      // Create hypertable
      const hypertableResult = await adapter.query({
        text: `SELECT create_hypertable('sensor_data', 'time', if_not_exists => TRUE)`,
      });
      expect(isOk(hypertableResult)).toBe(true);
    });

    test('insert and query time-series data', async () => {
      const now = new Date();

      // Insert data
      const insertResult = await adapter.query({
        text: 'INSERT INTO sensor_data (time, sensor_id, temperature) VALUES ($1, $2, $3)',
        params: [now, 1, 22.5],
      });
      expect(isOk(insertResult)).toBe(true);

      // Query data
      const queryResult = await adapter.query<{
        time: Date;
        sensor_id: number;
        temperature: number;
      }>({
        text: 'SELECT * FROM sensor_data WHERE sensor_id = $1',
        params: [1],
      });
      expect(isOk(queryResult)).toBe(true);
      if (isOk(queryResult)) {
        expect(queryResult.value.rows.length).toBe(1);
        expect(queryResult.value.rows[0].sensor_id).toBe(1);
        expect(queryResult.value.rows[0].temperature).toBe(22.5);
      }
    });

    test('time_bucket aggregation', async () => {
      // Insert multiple data points
      const now = Date.now();
      for (let i = 0; i < 5; i++) {
        await adapter.query({
          text: 'INSERT INTO sensor_data (time, sensor_id, temperature) VALUES ($1, $2, $3)',
          params: [new Date(now + i * 60000), 2, 20 + i],
        });
      }

      // Aggregate with time_bucket
      const aggResult = await adapter.query<{
        bucket: Date;
        avg_temp: number;
      }>({
        text: `
          SELECT
            time_bucket('5 minutes', time) AS bucket,
            AVG(temperature) AS avg_temp
          FROM sensor_data
          WHERE sensor_id = $1
          GROUP BY bucket
          ORDER BY bucket
        `,
        params: [2],
      });

      expect(isOk(aggResult)).toBe(true);
      if (isOk(aggResult)) {
        expect(aggResult.value.rows.length).toBeGreaterThan(0);
      }
    });
  });
});
