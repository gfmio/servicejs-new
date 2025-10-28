/**
 * Basic TimescaleDB adapter usage example
 */

import { createTimescaleDBAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createTimescaleDBAdapter();

  // Initialize with connection config
  const initResult = await adapter.init({
    host: 'localhost',
    port: 5432,
    database: 'timeseries',
    user: 'postgres',
    password: 'postgres',
  });

  if (!isOk(initResult)) {
    console.error('Failed to initialize:', initResult.error);
    return;
  }

  // Start the adapter
  const startResult = await adapter.start();
  if (!isOk(startResult)) {
    console.error('Failed to start:', startResult.error);
    return;
  }

  // Check health
  const healthResult = await adapter.health();
  if (isOk(healthResult)) {
    console.log('Health status:', healthResult.value.status);
  }

  // Create a hypertable
  const createResult = await adapter.query({
    query: `
      CREATE TABLE IF NOT EXISTS sensor_data (
        time TIMESTAMPTZ NOT NULL,
        sensor_id INTEGER,
        temperature DOUBLE PRECISION,
        humidity DOUBLE PRECISION
      )
    `,
  });

  if (isOk(createResult)) {
    console.log('Table created');
  }

  const hypertableResult = await adapter.createHypertable({
    relation: 'sensor_data',
    timeColumnName: 'time',
  });

  if (isOk(hypertableResult)) {
    console.log('Hypertable created');
  }

  // Insert time-series data
  const now = new Date();
  const insertResult = await adapter.query({
    query: 'INSERT INTO sensor_data (time, sensor_id, temperature, humidity) VALUES ($1, $2, $3, $4)',
    params: [now, 1, 22.5, 45.0],
  });

  if (isOk(insertResult)) {
    console.log('Data inserted');
  }

  // Query time-series data
  const queryResult = await adapter.query<{
    time: Date;
    sensor_id: number;
    temperature: number;
    humidity: number;
  }>({
    query: `
      SELECT * FROM sensor_data
      WHERE time > NOW() - INTERVAL '1 hour'
      ORDER BY time DESC
    `,
  });

  if (isOk(queryResult)) {
    console.log('Query results:', queryResult.value.rows);
  }

  // Use time_bucket for aggregation
  const aggResult = await adapter.query<{
    bucket: Date;
    avg_temp: number;
    avg_humidity: number;
  }>({
    query: `
      SELECT
        time_bucket('5 minutes', time) AS bucket,
        AVG(temperature) AS avg_temp,
        AVG(humidity) AS avg_humidity
      FROM sensor_data
      WHERE time > NOW() - INTERVAL '1 hour'
      GROUP BY bucket
      ORDER BY bucket DESC
    `,
  });

  if (isOk(aggResult)) {
    console.log('Aggregated results:', aggResult.value.rows);
  }

  // Create continuous aggregate
  const caggResult = await adapter.createContinuousAggregate({
    name: 'sensor_data_hourly',
    viewQuery: `
      SELECT
        time_bucket('1 hour', time) AS hour,
        sensor_id,
        AVG(temperature) AS avg_temperature,
        AVG(humidity) AS avg_humidity
      FROM sensor_data
      GROUP BY hour, sensor_id
    `,
    refresh: {
      startOffset: '1 day',
      endOffset: '1 hour',
      scheduleInterval: '1 hour',
    },
  });

  if (isOk(caggResult)) {
    console.log('Continuous aggregate created');
  }

  // Add retention policy
  const retentionResult = await adapter.addRetentionPolicy({
    relation: 'sensor_data',
    dropAfter: '7 days',
  });

  if (isOk(retentionResult)) {
    console.log('Retention policy added');
  }

  // Cleanup
  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
