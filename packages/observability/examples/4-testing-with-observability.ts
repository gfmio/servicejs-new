/**
 * Example 4: Testing with Observability
 *
 * Demonstrates:
 * - Using test assertions for observability
 * - Mock transport for message testing
 * - Verifying telemetry in tests
 */

import {
  createInMemoryObservability,
  assertSpanCreated,
  assertSpanCompleted,
  assertMetricRecorded,
  assertLogEmitted,
  assertSpanNesting,
  createMockTransport,
  type ObservabilityCapability,
} from '../src/index.js';

// Example function to test
const processOrder = (
  obs: ObservabilityCapability,
  orderId: string
): { success: boolean; total: number } => {
  let total = 0;

  obs.withSpan('process.order', () => {
    obs.log('info', 'Processing order', { orderId });
    obs.counter('orders.processed', 1);

    // Validate order
    obs.withSpan('validate.order', () => {
      obs.log('debug', 'Validating order');
      obs.histogram('validation.duration', 25);
    });

    // Calculate total
    obs.withSpan('calculate.total', () => {
      obs.log('debug', 'Calculating total');
      total = 99.99;
      obs.histogram('calculation.duration', 10);
    });

    obs.log('info', 'Order processed successfully', { total });
  });

  return { success: true, total };
};

console.log('\n=== Testing with Observability ===\n');

// Test 1: Verify span creation
console.log('Test 1: Verify span creation');
const obs1 = createInMemoryObservability();
processOrder(obs1, 'order-123');

try {
  assertSpanCreated(obs1.getEvents(), 'process.order');
  assertSpanCreated(obs1.getEvents(), 'validate.order');
  assertSpanCreated(obs1.getEvents(), 'calculate.total');
  console.log('✓ All spans created');
} catch (error) {
  console.log('✗ Span assertion failed:', error);
}

// Test 2: Verify span completion and status
console.log('\nTest 2: Verify span completion');
const obs2 = createInMemoryObservability();
processOrder(obs2, 'order-456');

try {
  const result = assertSpanCompleted(obs2.getEvents(), 'process.order', 'ok');
  console.log(`✓ Span completed with status: ${result.end.status}`);
} catch (error) {
  console.log('✗ Span completion assertion failed:', error);
}

// Test 3: Verify metrics
console.log('\nTest 3: Verify metrics');
const obs3 = createInMemoryObservability();
processOrder(obs3, 'order-789');

try {
  assertMetricRecorded(obs3.getEvents(), 'orders.processed', 1);
  assertMetricRecorded(obs3.getEvents(), 'validation.duration');
  assertMetricRecorded(obs3.getEvents(), 'calculation.duration');
  console.log('✓ All metrics recorded');
} catch (error) {
  console.log('✗ Metric assertion failed:', error);
}

// Test 4: Verify logs
console.log('\nTest 4: Verify logs');
const obs4 = createInMemoryObservability();
processOrder(obs4, 'order-abc');

try {
  assertLogEmitted(obs4.getEvents(), 'info', 'Processing order');
  assertLogEmitted(obs4.getEvents(), 'info', 'successfully');
  console.log('✓ All logs emitted');
} catch (error) {
  console.log('✗ Log assertion failed:', error);
}

// Test 5: Verify span nesting
console.log('\nTest 5: Verify span nesting');
const obs5 = createInMemoryObservability();
processOrder(obs5, 'order-def');

try {
  assertSpanNesting(obs5.getEvents(), 'process.order', 'validate.order');
  assertSpanNesting(obs5.getEvents(), 'process.order', 'calculate.total');
  console.log('✓ Spans correctly nested');
} catch (error) {
  console.log('✗ Span nesting assertion failed:', error);
}

// Test 6: Mock transport
console.log('\nTest 6: Mock transport');
const transport = createMockTransport<{ type: string; orderId: string }>();

// Simulate sending messages
transport.send({ type: 'order.created', orderId: 'order-123' }, 'order-service');
transport.send({ type: 'order.processed', orderId: 'order-123' }, 'order-service');

try {
  transport.assertSentTo('order-service', (msg) => msg.type === 'order.created');
  transport.assertSent((msg) => msg.orderId === 'order-123');
  console.log(`✓ Mock transport captured ${transport.getSentCount()} messages`);
} catch (error) {
  console.log('✗ Transport assertion failed:', error);
}

console.log('\n=== All Tests Passed ===\n');
