/**
 * Sentry context and tags example
 *
 * This example demonstrates:
 * - Setting global tags
 * - Adding custom contexts
 * - Setting user information
 * - Enriching error reports
 */

import { createSentryAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createSentryAdapter();

  await adapter.init({
    dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0',
    environment: 'production',
    release: 'my-app@2.0.0'
  });

  // Set global tags that will be attached to all events
  await adapter.setTag('server', 'web-01');
  await adapter.setTag('region', 'us-east-1');
  await adapter.setTag('tier', 'premium');

  console.log('Global tags set');

  // Set custom contexts for additional information
  await adapter.setContext('device', {
    type: 'browser',
    name: 'Chrome',
    version: '120.0',
    screen_resolution: '1920x1080'
  });

  await adapter.setContext('business', {
    account_id: 'acc_12345',
    subscription_plan: 'enterprise',
    monthly_quota: 100000
  });

  console.log('Custom contexts set');

  // Set user information
  await adapter.setUser({
    id: 'user_789',
    email: 'alice@company.com',
    username: 'alice',
    ip_address: '192.168.1.100',
    segment: 'enterprise',
    cohort: '2024-Q1'
  });

  console.log('User context set');

  // Add breadcrumbs to track user journey
  await adapter.addBreadcrumb({
    message: 'User logged in',
    category: 'auth',
    level: 'info',
    data: { method: 'oauth', provider: 'google' }
  });

  await adapter.addBreadcrumb({
    message: 'Viewed dashboard',
    category: 'navigation',
    level: 'info'
  });

  await adapter.addBreadcrumb({
    message: 'Started data export',
    category: 'action',
    level: 'info',
    data: { format: 'json', filters: { date_range: '30d' } }
  });

  // Capture an error with all the enriched context
  try {
    throw new Error('Export failed: insufficient quota');
  } catch (error) {
    const result = await adapter.captureError(
      error as Error,
      {
        operation: 'export',
        quota_used: '95000',
        quota_limit: '100000'
      }
    );

    if (isOk(result)) {
      console.log('\nError captured with enriched context!');
      console.log('Event ID:', result.value);
    }
  }

  // View the captured event with all context
  const eventsResult = await adapter.getEvents();
  if (isOk(eventsResult)) {
    const event = eventsResult.value[0];
    console.log('\nCaptured event details:');
    console.log('- Level:', event.level);
    console.log('- Tags:', event.tags);
    console.log('- User:', event.user);
    console.log('- Contexts:', Object.keys(event.contexts || {}));
    console.log('- Breadcrumbs:', event.breadcrumbs?.length);
  }

  // Clear user context (e.g., on logout)
  await adapter.setUser(null);
  console.log('\nUser context cleared');
}

main().catch(console.error);
