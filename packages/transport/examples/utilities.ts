/**
 * Transport Utilities Examples
 *
 * Demonstrates routing, retry logic, and timeout handling.
 */

import { createLocalTransport } from '../src/localTransport.js';
import { createNetworkTransport } from '../src/networkTransport.js';
import {
  createTransportRouter,
  createPrefixRouter,
  withRetry,
  withTimeout,
  withRetryAndTimeout,
} from '../src/utilities.js';
import type { MessageEnvelope } from '../src/transport.js';

// Example 1: Basic Transport Router
console.log('\n=== Example 1: Basic Transport Router ===\n');

const localTransport1 = createLocalTransport({ urn: 'urn:local:app1' as any });
const localTransport2 = createLocalTransport({ urn: 'urn:local:app2' as any });

await localTransport1.connect();
await localTransport2.connect();

const router1 = createTransportRouter({ defaultTransport: localTransport1 });

// Add custom routing rules
router1.addRoute(
  (envelope) => envelope.to.toString() === 'urn:local:app2',
  localTransport2
);

localTransport2.onReceive((envelope) => {
  console.log(`App2 received message: ${envelope.message.type}`);
});

await router1.send({
  from: 'urn:local:app1' as any,
  to: 'urn:local:app2' as any,
  message: { type: 'hello' },
});

console.log('Message routed successfully');

await localTransport1.disconnect();
await localTransport2.disconnect();

// Example 2: Prefix-Based Router
console.log('\n=== Example 2: Prefix-Based Router ===\n');

const localTransport3 = createLocalTransport({ urn: 'urn:local:services' as any });
const localTransport4 = createLocalTransport({ urn: 'urn:remote:services' as any });

await localTransport3.connect();
await localTransport4.connect();

// Route based on URN prefixes
const router2 = createPrefixRouter(
  {
    'urn:local:': localTransport3,
    'urn:remote:': localTransport4,
  },
  localTransport3 // default
);

localTransport3.onReceive((envelope) => {
  console.log(`Local service received: ${envelope.message.type}`);
});

localTransport4.onReceive((envelope) => {
  console.log(`Remote service received: ${envelope.message.type}`);
});

// Route to local
await router2.send({
  from: 'urn:app:client' as any,
  to: 'urn:local:database' as any,
  message: { type: 'query' },
});

// Route to remote
await router2.send({
  from: 'urn:app:client' as any,
  to: 'urn:remote:api' as any,
  message: { type: 'request' },
});

console.log('Messages routed by prefix');

await localTransport3.disconnect();
await localTransport4.disconnect();

// Example 3: Multi-Transport Router
console.log('\n=== Example 3: Multi-Transport Router ===\n');

const localTransport5 = createLocalTransport({ urn: 'urn:local:main' as any });
const localTransport6 = createLocalTransport({ urn: 'urn:worker:service' as any });
const localTransport7 = createLocalTransport({ urn: 'urn:cache:service' as any });

await localTransport5.connect();
await localTransport6.connect();
await localTransport7.connect();

const router3 = createTransportRouter({ defaultTransport: localTransport5 });

// Route compute-intensive tasks to worker
router3.addRoute(
  (envelope) => envelope.message.type === 'compute',
  localTransport6
);

// Route data queries to cache
router3.addRoute(
  (envelope) => envelope.message.type === 'get' || envelope.message.type === 'set',
  localTransport7
);

localTransport6.onReceive((envelope) => {
  console.log(`Worker processing: ${envelope.message.type}`);
});

localTransport7.onReceive((envelope) => {
  console.log(`Cache handling: ${envelope.message.type}`);
});

await router3.send({
  from: 'urn:local:main' as any,
  to: 'urn:services:any' as any,
  message: { type: 'compute', data: [1, 2, 3] },
});

await router3.send({
  from: 'urn:local:main' as any,
  to: 'urn:services:any' as any,
  message: { type: 'get', key: 'user:123' },
});

console.log('Messages routed by type');

await localTransport5.disconnect();
await localTransport6.disconnect();
await localTransport7.disconnect();

// Example 4: Retry with Exponential Backoff
console.log('\n=== Example 4: Retry with Exponential Backoff ===\n');

const localTransport8 = createLocalTransport({ urn: 'urn:local:client' as any });
const localTransport9 = createLocalTransport({ urn: 'urn:local:unreliable' as any });

await localTransport8.connect();
await localTransport9.connect();

let attempts = 0;
const originalSend = localTransport9.send.bind(localTransport9);

// Simulate unreliable service
localTransport9.send = async (envelope) => {
  attempts++;
  console.log(`Attempt ${attempts}`);

  if (attempts < 3) {
    throw new Error('Simulated failure');
  }

  return originalSend(envelope);
};

const reliableTransport = withRetry(localTransport9, {
  maxAttempts: 5,
  initialDelay: 100,
  maxDelay: 5000,
  backoffMultiplier: 2,
  jitter: 0.1,
  onRetry: (attempt, error, delay) => {
    console.log(`  Retrying (attempt ${attempt}) after ${Math.round(delay)}ms`);
  },
});

localTransport9.onReceive((envelope) => {
  console.log(`Message finally delivered: ${envelope.message.type}`);
});

try {
  await reliableTransport.send({
    from: 'urn:local:client' as any,
    to: 'urn:local:unreliable' as any,
    message: { type: 'important' },
  });
  console.log('Success after retries!');
} catch (error) {
  console.log('Failed after all retries');
}

await localTransport8.disconnect();
await localTransport9.disconnect();

// Example 5: Timeout Protection
console.log('\n=== Example 5: Timeout Protection ===\n');

const localTransport10 = createLocalTransport({ urn: 'urn:local:client2' as any });
const localTransport11 = createLocalTransport({ urn: 'urn:local:slow' as any });

await localTransport10.connect();
await localTransport11.connect();

// Simulate slow service
const originalSend2 = localTransport11.send.bind(localTransport11);
localTransport11.send = async (envelope) => {
  console.log('Slow service processing...');
  await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
  return originalSend2(envelope);
};

const timeoutTransport = withTimeout(localTransport11, {
  timeout: 500, // 500ms timeout
  onTimeout: (envelope) => {
    console.log(`Timeout! Message to ${envelope.to} exceeded 500ms`);
  },
});

const result = await timeoutTransport.send({
  from: 'urn:local:client2' as any,
  to: 'urn:local:slow' as any,
  message: { type: 'request' },
});

if (result.success === false) {
  console.log('Send failed due to timeout');
}

await localTransport10.disconnect();
await localTransport11.disconnect();

// Example 6: Combined Retry and Timeout
console.log('\n=== Example 6: Combined Retry and Timeout ===\n');

const localTransport12 = createLocalTransport({ urn: 'urn:local:client3' as any });
const localTransport13 = createLocalTransport({ urn: 'urn:local:flaky' as any });

await localTransport12.connect();
await localTransport13.connect();

let attempt2 = 0;
const originalSend3 = localTransport13.send.bind(localTransport13);

// Simulate flaky service (sometimes slow, sometimes fast)
localTransport13.send = async (envelope) => {
  attempt2++;
  console.log(`Attempt ${attempt2}`);

  // First two attempts are slow and will timeout
  if (attempt2 <= 2) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return originalSend3(envelope);
  }

  // Third attempt is fast
  return originalSend3(envelope);
};

const reliableTimeoutTransport = withRetryAndTimeout(
  localTransport13,
  {
    maxAttempts: 5,
    initialDelay: 50,
    maxDelay: 1000,
    backoffMultiplier: 2,
    onRetry: (attempt, error, delay) => {
      console.log(`  Retrying after timeout (attempt ${attempt})`);
    },
  },
  {
    timeout: 100, // 100ms timeout
  }
);

localTransport13.onReceive((envelope) => {
  console.log(`Message delivered: ${envelope.message.type}`);
});

const result2 = await reliableTimeoutTransport.send({
  from: 'urn:local:client3' as any,
  to: 'urn:local:flaky' as any,
  message: { type: 'critical' },
});

if (result2.success) {
  console.log('Success with retry and timeout protection!');
} else {
  console.log('Failed even with retries');
}

await localTransport12.disconnect();
await localTransport13.disconnect();

// Example 7: Dynamic Routing
console.log('\n=== Example 7: Dynamic Routing ===\n');

const localTransport14 = createLocalTransport({ urn: 'urn:local:router' as any });
const primaryTransport = createLocalTransport({ urn: 'urn:service:primary' as any });
const secondaryTransport = createLocalTransport({ urn: 'urn:service:secondary' as any });

await localTransport14.connect();
await primaryTransport.connect();
await secondaryTransport.connect();

let usePrimary = true;
const dynamicRouter = createTransportRouter();

// Dynamic routing based on runtime condition
const routePredicate = (envelope: MessageEnvelope) => true; // Route all messages

// Set initial route
dynamicRouter.addRoute(routePredicate, usePrimary ? primaryTransport : secondaryTransport);

primaryTransport.onReceive((envelope) => {
  console.log(`Primary service received: ${envelope.message.type}`);
});

secondaryTransport.onReceive((envelope) => {
  console.log(`Secondary service received: ${envelope.message.type}`);
});

// Send to primary
await dynamicRouter.send({
  from: 'urn:local:router' as any,
  to: 'urn:service:any' as any,
  message: { type: 'request-1' },
});

// Simulate failover
console.log('Switching to secondary...');
usePrimary = false;
dynamicRouter.removeRoute(routePredicate);
dynamicRouter.addRoute(routePredicate, secondaryTransport);

// Send to secondary
await dynamicRouter.send({
  from: 'urn:local:router' as any,
  to: 'urn:service:any' as any,
  message: { type: 'request-2' },
});

await localTransport14.disconnect();
await primaryTransport.disconnect();
await secondaryTransport.disconnect();

// Example 8: Unroutable Message Handling
console.log('\n=== Example 8: Unroutable Message Handling ===\n');

const unroutableMessages: MessageEnvelope[] = [];

const router4 = createTransportRouter({
  onUnroutable: (envelope) => {
    console.log(`Cannot route message to: ${envelope.to}`);
    unroutableMessages.push(envelope);
  },
});

const result3 = await router4.send({
  from: 'urn:app:client' as any,
  to: 'urn:unknown:service' as any,
  message: { type: 'orphan' },
});

console.log(`Unroutable messages captured: ${unroutableMessages.length}`);

// Example 9: Custom Retry Strategy
console.log('\n=== Example 9: Custom Retry Strategy ===\n');

const localTransport15 = createLocalTransport({ urn: 'urn:local:custom' as any });
const localTransport16 = createLocalTransport({ urn: 'urn:local:service' as any });

await localTransport15.connect();
await localTransport16.connect();

let customAttempts = 0;
const originalSend4 = localTransport16.send.bind(localTransport16);

localTransport16.send = async (envelope) => {
  customAttempts++;

  if (customAttempts < 2) {
    // Return a connection error (retryable)
    return { success: false, error: { type: 'CONNECTION_FAILED' as const, error: 'Connection lost' } };
  }

  return originalSend4(envelope);
};

const customRetryTransport = withRetry(localTransport16, {
  maxAttempts: 5,
  initialDelay: 50,
  maxDelay: 1000,
  backoffMultiplier: 1.5, // Gentler backoff
  jitter: 0.2, // More jitter
  shouldRetry: (error) => {
    // Custom retry logic: only retry connection errors
    console.log(`Custom retry decision for error: ${error.type}`);
    return error.type === 'CONNECTION_FAILED';
  },
  onRetry: (attempt, error, delay) => {
    console.log(`Custom retry ${attempt}: ${error.type}, waiting ${Math.round(delay)}ms`);
  },
});

await customRetryTransport.send({
  from: 'urn:local:custom' as any,
  to: 'urn:local:service' as any,
  message: { type: 'data' },
});

console.log('Custom retry strategy succeeded');

await localTransport15.disconnect();
await localTransport16.disconnect();

console.log('\n✓ All transport utility examples completed');
