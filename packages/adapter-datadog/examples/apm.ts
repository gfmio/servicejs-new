/**
 * Datadog APM tracing example
 *
 * This example demonstrates:
 * - Creating traces with spans
 * - Monitoring application performance
 * - Tracking distributed operations
 */

import { createDatadogAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createDatadogAdapter();

  await adapter.init({
    apiKey: 'your-api-key',
    service: 'user-service',
    env: 'production'
  });

  console.log('Monitoring API request with APM...\n');

  // Start a span for an HTTP request
  const requestSpan = await adapter.startSpan(
    'http.request',
    'user-service',
    'GET /api/users/:id',
    {
      'http.method': 'GET',
      'http.url': '/api/users/123',
      'http.status_code': '200'
    }
  );

  if (!isOk(requestSpan)) {
    console.error('Failed to start span');
    return;
  }

  const span = requestSpan.value;

  // Simulate authentication check
  const authSpan = await adapter.startSpan(
    'auth.verify',
    'user-service',
    'verify_jwt_token',
    {
      'auth.method': 'jwt',
      'auth.user_id': '123'
    }
  );

  if (isOk(authSpan)) {
    await new Promise(resolve => setTimeout(resolve, 20));
    await adapter.finishSpan(authSpan.value.spanId);
    console.log('✓ Authentication verified (20ms)');
  }

  // Simulate database query
  const dbSpan = await adapter.startSpan(
    'db.query',
    'user-service',
    'SELECT * FROM users WHERE id = ?',
    {
      'db.system': 'postgresql',
      'db.name': 'app_db',
      'db.statement': 'SELECT * FROM users WHERE id = $1'
    }
  );

  if (isOk(dbSpan)) {
    await new Promise(resolve => setTimeout(resolve, 45));
    await adapter.finishSpan(dbSpan.value.spanId);
    console.log('✓ Database query completed (45ms)');
  }

  // Simulate cache lookup
  const cacheSpan = await adapter.startSpan(
    'cache.get',
    'user-service',
    'get_user_preferences',
    {
      'cache.system': 'redis',
      'cache.key': 'user:123:prefs'
    }
  );

  if (isOk(cacheSpan)) {
    await new Promise(resolve => setTimeout(resolve, 5));
    await adapter.finishSpan(cacheSpan.value.spanId);
    console.log('✓ Cache lookup completed (5ms)');
  }

  // Finish the main span
  await adapter.finishSpan(span.spanId);
  console.log('✓ Request completed\n');

  // Monitor a background job
  console.log('Monitoring background job...\n');

  const jobSpan = await adapter.startSpan(
    'job.process',
    'worker-service',
    'send_welcome_email',
    {
      'job.type': 'email',
      'job.queue': 'notifications',
      'job.priority': 'high'
    }
  );

  if (isOk(jobSpan)) {
    // Simulate email rendering
    const renderSpan = await adapter.startSpan(
      'template.render',
      'worker-service',
      'render_welcome_template',
      { 'template.name': 'welcome_email' }
    );

    if (isOk(renderSpan)) {
      await new Promise(resolve => setTimeout(resolve, 30));
      await adapter.finishSpan(renderSpan.value.spanId);
      console.log('✓ Template rendered (30ms)');
    }

    // Simulate email sending
    const sendSpan = await adapter.startSpan(
      'email.send',
      'worker-service',
      'send_via_smtp',
      {
        'email.provider': 'sendgrid',
        'email.recipient': 'user@example.com'
      }
    );

    if (isOk(sendSpan)) {
      await new Promise(resolve => setTimeout(resolve, 150));
      await adapter.finishSpan(sendSpan.value.spanId);
      console.log('✓ Email sent (150ms)');
    }

    await adapter.finishSpan(jobSpan.value.spanId);
    console.log('✓ Background job completed\n');
  }

  // View all spans
  const spansResult = await adapter.getSpans();
  if (isOk(spansResult)) {
    console.log(`Total spans recorded: ${spansResult.value.length}`);
    spansResult.value.forEach(s => {
      console.log(`- ${s.name} (${s.service}): ${s.duration}ms`);
    });
  }
}

main().catch(console.error);
