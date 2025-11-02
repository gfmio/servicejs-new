/**
 * Basic Sentry error tracking example
 *
 * This example demonstrates:
 * - Initializing the Sentry adapter
 * - Capturing errors and messages
 * - Setting user context
 * - Adding breadcrumbs
 */

import { createSentryAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createSentryAdapter();

  // Initialize with your Sentry DSN
  await adapter.init({
    dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0',
    environment: 'production',
    release: 'my-app@1.0.0',
    sampleRate: 1.0,
    tracesSampleRate: 0.1
  });

  // Set user context
  await adapter.setUser({
    id: '12345',
    email: 'user@example.com',
    username: 'john_doe'
  });

  // Add breadcrumbs for debugging
  await adapter.addBreadcrumb({
    message: 'User navigated to dashboard',
    category: 'navigation',
    level: 'info'
  });

  await adapter.addBreadcrumb({
    message: 'User clicked export button',
    category: 'ui',
    level: 'info',
    data: { button: 'export', format: 'csv' }
  });

  // Capture a message
  const messageResult = await adapter.captureMessage(
    'User exported data',
    'info',
    { export_format: 'csv', record_count: '150' }
  );

  if (isOk(messageResult)) {
    console.log('Message captured with ID:', messageResult.value);
  }

  // Simulate an error
  try {
    throw new Error('Failed to process export');
  } catch (error) {
    const errorResult = await adapter.captureError(
      error as Error,
      { operation: 'export', format: 'csv' }
    );

    if (isOk(errorResult)) {
      console.log('Error captured with ID:', errorResult.value);
    }
  }

  // View captured events
  const eventsResult = await adapter.getEvents();
  if (isOk(eventsResult)) {
    console.log(`\nCaptured ${eventsResult.value.length} events:`);
    eventsResult.value.forEach(event => {
      console.log(`- [${event.level}] ${event.message || 'Error'} (${event.id})`);
    });
  }
}

main().catch(console.error);
