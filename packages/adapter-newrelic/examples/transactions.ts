/**
 * New Relic transactions and segments example
 *
 * This example demonstrates:
 * - Web and background transactions
 * - Transaction segments
 * - Performance monitoring
 */

import { createNewRelicAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createNewRelicAdapter();

  await adapter.init({
    licenseKey: 'your-license-key',
    appName: 'my-app',
    environment: 'production'
  });

  // Monitor a web request with segments
  console.log('=== Web Transaction ===\n');

  const webTx = await adapter.startTransaction('web', 'POST /api/orders');
  if (!isOk(webTx)) return;

  // Add transaction metadata
  await adapter.addTransactionAttribute(webTx.value.id, 'customerId', 'cust_123');
  await adapter.addTransactionAttribute(webTx.value.id, 'orderValue', 299.99);

  // Database segment
  const dbSegment = await adapter.startSegment(
    webTx.value.id,
    'Database Query',
    'datastore'
  );

  if (isOk(dbSegment)) {
    await new Promise(resolve => setTimeout(resolve, 45));
    await adapter.endSegment(dbSegment.value.id);
    console.log('✓ Database query: 45ms');
  }

  // External API segment
  const apiSegment = await adapter.startSegment(
    webTx.value.id,
    'Payment API',
    'external'
  );

  if (isOk(apiSegment)) {
    await new Promise(resolve => setTimeout(resolve, 200));
    await adapter.endSegment(apiSegment.value.id);
    console.log('✓ Payment API call: 200ms');
  }

  // Custom segment
  const businessSegment = await adapter.startSegment(
    webTx.value.id,
    'Fraud Check',
    'custom'
  );

  if (isOk(businessSegment)) {
    await new Promise(resolve => setTimeout(resolve, 80));
    await adapter.endSegment(businessSegment.value.id);
    console.log('✓ Fraud check: 80ms');
  }

  await adapter.endTransaction(webTx.value.id);
  console.log('✓ Web transaction complete\n');

  // Monitor a background job
  console.log('=== Background Transaction ===\n');

  const bgTx = await adapter.startTransaction('background', 'SendEmailDigest');
  if (!isOk(bgTx)) return;

  await adapter.addTransactionAttribute(bgTx.value.id, 'recipientCount', 150);
  await adapter.addTransactionAttribute(bgTx.value.id, 'digestType', 'daily');

  // Fetch user segment
  const fetchSegment = await adapter.startSegment(
    bgTx.value.id,
    'Fetch Recipients',
    'datastore'
  );

  if (isOk(fetchSegment)) {
    await new Promise(resolve => setTimeout(resolve, 120));
    await adapter.endSegment(fetchSegment.value.id);
    console.log('✓ Fetched recipients: 120ms');
  }

  // Render emails segment
  const renderSegment = await adapter.startSegment(
    bgTx.value.id,
    'Render Templates',
    'custom'
  );

  if (isOk(renderSegment)) {
    await new Promise(resolve => setTimeout(resolve, 350));
    await adapter.endSegment(renderSegment.value.id);
    console.log('✓ Rendered templates: 350ms');
  }

  // Send emails segment
  const sendSegment = await adapter.startSegment(
    bgTx.value.id,
    'Send via SMTP',
    'external'
  );

  if (isOk(sendSegment)) {
    await new Promise(resolve => setTimeout(resolve, 800));
    await adapter.endSegment(sendSegment.value.id);
    console.log('✓ Sent emails: 800ms');
  }

  await adapter.endTransaction(bgTx.value.id);
  console.log('✓ Background transaction complete\n');

  // View transaction summary
  const transactions = await adapter.getTransactions();
  if (isOk(transactions)) {
    console.log('Transaction Summary:');
    transactions.value.forEach(tx => {
      const duration = Date.now() - tx.startTime;
      console.log(`- ${tx.name} [${tx.type}]`);
      console.log(`  Attributes: ${Object.keys(tx.attributes || {}).length}`);
    });
  }
}

main().catch(console.error);
