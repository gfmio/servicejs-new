/**
 * Basic Datadog metrics and logging example
 *
 * This example demonstrates:
 * - Initializing the Datadog adapter
 * - Sending metrics (gauge, counter, histogram)
 * - Logging at different levels
 * - Using tags and attributes
 */

import { createDatadogAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createDatadogAdapter();

  // Initialize with your Datadog credentials
  await adapter.init({
    apiKey: 'your-datadog-api-key',
    appKey: 'your-datadog-app-key',
    site: 'datadoghq.com',
    service: 'my-app',
    env: 'production',
    version: '1.0.0',
    tags: ['team:backend', 'region:us-east-1']
  });

  console.log('Datadog initialized\n');

  // Send a gauge metric (current value)
  await adapter.gauge('system.memory.used', 75.5, {
    host: 'web-01',
    process: 'nodejs'
  });
  console.log('Sent gauge metric: system.memory.used');

  // Increment a counter
  await adapter.increment('api.requests', 1, {
    endpoint: '/api/users',
    method: 'GET',
    status: '200'
  });
  console.log('Incremented counter: api.requests');

  // Send a histogram (distribution of values)
  await adapter.histogram('api.response_time', 125, {
    endpoint: '/api/users'
  });
  console.log('Sent histogram: api.response_time');

  // Send a distribution metric
  await adapter.distribution('database.query_time', 45, {
    query_type: 'SELECT',
    table: 'users'
  });
  console.log('Sent distribution: database.query_time\n');

  // Log messages at different levels
  await adapter.debug('Starting request processing', {
    request_id: 'req_12345',
    user_id: 'user_789'
  });

  await adapter.info('User authenticated successfully', {
    user_id: 'user_789',
    method: 'oauth'
  });

  await adapter.warn('API rate limit approaching', {
    current_usage: 950,
    limit: 1000,
    user_id: 'user_789'
  });

  await adapter.error('Failed to process payment', {
    error_code: 'INSUFFICIENT_FUNDS',
    payment_id: 'pay_456',
    amount: 99.99
  });

  console.log('Sent log messages\n');

  // View collected metrics
  const metricsResult = await adapter.getMetrics();
  if (isOk(metricsResult)) {
    console.log(`Collected ${metricsResult.value.length} metrics:`);
    metricsResult.value.forEach(metric => {
      console.log(`- ${metric.metric}: ${metric.points[0][1]} [${metric.type}]`);
    });
  }

  // View collected logs
  const logsResult = await adapter.getLogs();
  if (isOk(logsResult)) {
    console.log(`\nCollected ${logsResult.value.length} logs:`);
    logsResult.value.forEach(log => {
      console.log(`- [${log.level.toUpperCase()}] ${log.message}`);
    });
  }
}

main().catch(console.error);
