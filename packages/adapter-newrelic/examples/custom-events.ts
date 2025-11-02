/**
 * New Relic custom events and metrics example
 *
 * This example demonstrates:
 * - Recording custom events
 * - Custom business metrics
 * - Error tracking with context
 */

import { createNewRelicAdapter} from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createNewRelicAdapter();

  await adapter.init({
    licenseKey: 'your-license-key',
    appName: 'ecommerce-app',
    environment: 'production'
  });

  console.log('Recording custom events and metrics...\n');

  // Business events
  await adapter.recordEvent('PageView', {
    page: '/products/laptop-xyz',
    userId: 'user_789',
    sessionId: 'sess_abc123',
    referrer: 'google.com',
    device: 'desktop'
  });

  await adapter.recordEvent('ProductView', {
    productId: 'prod_456',
    productName: 'Laptop XYZ',
    category: 'Electronics',
    price: 999.99,
    currency: 'USD',
    inStock: true
  });

  await adapter.recordEvent('AddToCart', {
    userId: 'user_789',
    productId: 'prod_456',
    quantity: 1,
    price: 999.99
  });

  await adapter.recordEvent('Purchase', {
    userId: 'user_789',
    orderId: 'ord_12345',
    total: 999.99,
    currency: 'USD',
    itemCount: 1,
    paymentMethod: 'credit_card',
    shippingMethod: 'express'
  });

  console.log('✓ Business events recorded\n');

  // Custom business metrics
  await adapter.recordMetric('Custom/Revenue/Hourly', 15000, {
    currency: 'USD'
  });

  await adapter.recordMetric('Custom/Orders/Hourly', 45);
  await adapter.recordMetric('Custom/AverageOrderValue', 333.33);
  await adapter.recordMetric('Custom/ConversionRate', 0.025);

  await adapter.incrementMetric('Custom/SignUps/Total');
  await adapter.incrementMetric('Custom/Newsletter/Subscriptions');

  console.log('✓ Business metrics recorded\n');

  // User behavior events
  await adapter.recordEvent('FeatureUsed', {
    userId: 'user_789',
    feature: 'product_comparison',
    duration: 45,
    productsCompared: 3
  });

  await adapter.recordEvent('SearchPerformed', {
    userId: 'user_789',
    query: 'gaming laptop',
    resultsCount: 12,
    filterApplied: 'price_range'
  });

  console.log('✓ User behavior events recorded\n');

  // Error tracking with rich context
  try {
    // Simulate payment processing error
    throw new Error('Payment gateway timeout');
  } catch (error) {
    await adapter.noticeError(error as Error, {
      userId: 'user_789',
      orderId: 'ord_12345',
      paymentAmount: 999.99,
      paymentGateway: 'stripe',
      attemptNumber: 1,
      errorCategory: 'payment_processing'
    });

    console.log('✓ Payment error tracked\n');
  }

  // Performance metrics
  await adapter.recordMetric('Custom/Performance/PageLoad', 1200);
  await adapter.recordMetric('Custom/Performance/APIResponse', 85);
  await adapter.recordMetric('Custom/Performance/DatabaseQuery', 42);

  console.log('✓ Performance metrics recorded\n');

  // View collected data
  const events = await adapter.getEvents();
  const metrics = await adapter.getMetrics();
  const errors = await adapter.getErrors();

  console.log('Summary:');
  if (isOk(events)) {
    console.log(`- Custom Events: ${events.value.length}`);
    events.value.forEach(e => {
      console.log(`  • ${e.eventType}`);
    });
  }

  if (isOk(metrics)) {
    console.log(`\n- Custom Metrics: ${metrics.value.length}`);
    metrics.value.forEach(m => {
      console.log(`  • ${m.name}: ${m.value}`);
    });
  }

  if (isOk(errors)) {
    console.log(`\n- Errors: ${errors.value.length}`);
    errors.value.forEach(e => {
      console.log(`  • ${e.error.message}`);
    });
  }
}

main().catch(console.error);
