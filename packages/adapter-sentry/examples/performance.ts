/**
 * Sentry performance monitoring example
 *
 * This example demonstrates:
 * - Starting and finishing transactions
 * - Creating spans within transactions
 * - Performance monitoring for different operations
 */

import { createSentryAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createSentryAdapter();

  await adapter.init({
    dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0',
    environment: 'production',
    tracesSampleRate: 1.0
  });

  // Monitor an API request
  console.log('Starting API request transaction...');
  const txResult = await adapter.startTransaction('api.request', 'http', {
    endpoint: '/api/users',
    method: 'GET'
  });

  if (!isOk(txResult)) {
    console.error('Failed to start transaction:', txResult.error);
    return;
  }

  const transaction = txResult.value;

  // Simulate database query span
  const dbSpanResult = await adapter.startSpan(
    transaction.id,
    'db.query',
    'SELECT * FROM users WHERE active = true'
  );

  if (isOk(dbSpanResult)) {
    // Simulate query time
    await new Promise(resolve => setTimeout(resolve, 50));
    await adapter.finishSpan(dbSpanResult.value.id);
    console.log('Database query completed');
  }

  // Simulate external API call span
  const apiSpanResult = await adapter.startSpan(
    transaction.id,
    'http.client',
    'GET https://api.external.com/data'
  );

  if (isOk(apiSpanResult)) {
    // Simulate API call time
    await new Promise(resolve => setTimeout(resolve, 100));
    await adapter.finishSpan(apiSpanResult.value.id);
    console.log('External API call completed');
  }

  // Finish the transaction
  await adapter.finishTransaction(transaction.id);
  console.log('Transaction completed');

  // Monitor a background job
  console.log('\nStarting background job transaction...');
  const jobTxResult = await adapter.startTransaction('job.process', 'task', {
    job_type: 'email_digest'
  });

  if (isOk(jobTxResult)) {
    const jobTx = jobTxResult.value;

    // Process items
    for (let i = 0; i < 3; i++) {
      const itemSpan = await adapter.startSpan(
        jobTx.id,
        'job.item',
        `Processing item ${i + 1}`
      );

      if (isOk(itemSpan)) {
        await new Promise(resolve => setTimeout(resolve, 30));
        await adapter.finishSpan(itemSpan.value.id);
        console.log(`Processed item ${i + 1}`);
      }
    }

    await adapter.finishTransaction(jobTx.id);
    console.log('Background job completed');
  }
}

main().catch(console.error);
