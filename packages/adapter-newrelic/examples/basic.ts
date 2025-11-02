/**
 * Basic New Relic APM example
 *
 * This example demonstrates:
 * - Initializing the New Relic adapter
 * - Creating transactions
 * - Recording custom metrics
 * - Tracking errors
 */

import { createNewRelicAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createNewRelicAdapter();

  // Initialize with your New Relic license key
  await adapter.init({
    licenseKey: 'your-new-relic-license-key',
    appName: 'my-application',
    environment: 'production',
    distributedTracing: true
  });

  console.log('New Relic initialized\n');

  // Track a web transaction
  console.log('Starting web transaction...');
  const txResult = await adapter.startTransaction('web', 'GET /api/users/:id');

  if (!isOk(txResult)) {
    console.error('Failed to start transaction');
    return;
  }

  const transaction = txResult.value;

  // Add custom attributes to the transaction
  await adapter.addTransactionAttribute(transaction.id, 'userId', '12345');
  await adapter.addTransactionAttribute(transaction.id, 'userTier', 'premium');
  await adapter.addTransactionAttribute(transaction.id, 'cacheHit', true);

  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 100));

  // End the transaction
  await adapter.endTransaction(transaction.id);
  console.log('✓ Web transaction completed\n');

  // Record custom metrics
  await adapter.recordMetric('Custom/ResponseTime', 125, {
    endpoint: '/api/users'
  });

  await adapter.incrementMetric('Custom/API/Calls');
  await adapter.incrementMetric('Custom/Cache/Hits');

  console.log('✓ Custom metrics recorded\n');

  // Record custom events
  await adapter.recordEvent('UserAction', {
    action: 'profile_update',
    userId: '12345',
    changes: ['email', 'name'],
    success: true
  });

  await adapter.recordEvent('Purchase', {
    userId: '12345',
    amount: 99.99,
    currency: 'USD',
    items: 3
  });

  console.log('✓ Custom events recorded\n');

  // Track an error
  try {
    throw new Error('Something went wrong during checkout');
  } catch (error) {
    await adapter.noticeError(error as Error, {
      context: 'checkout_process',
      userId: '12345',
      cartValue: 99.99
    });
    console.log('✓ Error tracked\n');
  }

  // View collected data
  const transactions = await adapter.getTransactions();
  const metrics = await adapter.getMetrics();
  const events = await adapter.getEvents();
  const errors = await adapter.getErrors();

  if (isOk(transactions)) {
    console.log(`Transactions: ${transactions.value.length}`);
  }
  if (isOk(metrics)) {
    console.log(`Metrics: ${metrics.value.length}`);
  }
  if (isOk(events)) {
    console.log(`Events: ${events.value.length}`);
  }
  if (isOk(errors)) {
    console.log(`Errors: ${errors.value.length}`);
  }
}

main().catch(console.error);
