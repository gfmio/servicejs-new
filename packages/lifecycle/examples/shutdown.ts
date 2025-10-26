/**
 * Shutdown Coordinator Example
 *
 * Demonstrates coordinated shutdown of multiple components.
 */

import { createComponent } from '@servicejs/core';
import { withLifecycle } from '../src/lifecycle.js';
import { createShutdownCoordinator } from '../src/shutdown.js';

// Simulate services
const services = {
  database: { connected: false },
  cache: { connected: false },
  httpServer: { listening: false },
};

// Messages
type ServiceMessage = { readonly type: 'ping' };

// Example 1: Basic shutdown coordination
console.log('\n=== Example 1: Basic Shutdown Coordination ===\n');

const coordinator = createShutdownCoordinator();

// Create database component
const { component: dbComp, capability: dbCap } = createComponent(
  'urn:example:database',
  {},
  (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
);

const database = withLifecycle(dbComp, dbCap, {
  onInit: async () => {
    console.log('[Database] Connecting...');
    await new Promise((resolve) => setTimeout(resolve, 50));
    services.database.connected = true;
    console.log('[Database] Connected');
  },
  onShutdown: async () => {
    console.log('[Database] Disconnecting...');
    await new Promise((resolve) => setTimeout(resolve, 30));
    services.database.connected = false;
    console.log('[Database] Disconnected');
  },
});

// Create cache component
const { component: cacheComp, capability: cacheCap } = createComponent(
  'urn:example:cache',
  {},
  (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
);

const cache = withLifecycle(cacheComp, cacheCap, {
  onInit: async () => {
    console.log('[Cache] Connecting to Redis...');
    await new Promise((resolve) => setTimeout(resolve, 40));
    services.cache.connected = true;
    console.log('[Cache] Connected');
  },
  onShutdown: async () => {
    console.log('[Cache] Disconnecting from Redis...');
    await new Promise((resolve) => setTimeout(resolve, 20));
    services.cache.connected = false;
    console.log('[Cache] Disconnected');
  },
});

// Create HTTP server component
const { component: httpComp, capability: httpCap } = createComponent(
  'urn:example:http',
  {},
  (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
);

const httpServer = withLifecycle(httpComp, httpCap, {
  onInit: async () => {
    console.log('[HTTP] Starting server...');
    await new Promise((resolve) => setTimeout(resolve, 30));
    services.httpServer.listening = true;
    console.log('[HTTP] Server listening on port 3000');
  },
  onShutdown: async () => {
    console.log('[HTTP] Stopping server...');
    await new Promise((resolve) => setTimeout(resolve, 40));
    services.httpServer.listening = false;
    console.log('[HTTP] Server stopped');
  },
});

// Initialize all components
await database.init();
await cache.init();
await httpServer.init();

// Register with coordinator (order matters - LIFO shutdown)
coordinator.register(database);
coordinator.register(cache);
coordinator.register(httpServer);

console.log(`\nRegistered ${coordinator.size()} components`);
console.log('All services running...\n');

// Shutdown all (in reverse order: HTTP, Cache, Database)
const result = await coordinator.shutdown();
if (result.isOk()) {
  console.log('\n✓ All components shut down successfully');
}

// Example 2: Shutdown with errors (continue on error)
console.log('\n=== Example 2: Shutdown with Errors (Continue) ===\n');

const coordinator2 = createShutdownCoordinator();

// Component that fails to shutdown
const { component: failComp, capability: failCap } = createComponent(
  'urn:example:failing',
  {},
  (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
);

const failing = withLifecycle(failComp, failCap, {
  onInit: async () => {
    console.log('[Failing] Starting...');
  },
  onShutdown: async () => {
    console.log('[Failing] Attempting shutdown...');
    throw new Error('Shutdown failed!');
  },
});

const { component: goodComp1, capability: goodCap1 } = createComponent(
  'urn:example:good1',
  {},
  (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
);

const good1 = withLifecycle(goodComp1, goodCap1, {
  onInit: async () => {
    console.log('[Good1] Starting...');
  },
  onShutdown: async () => {
    console.log('[Good1] Shutting down...');
  },
});

const { component: goodComp2, capability: goodCap2 } = createComponent(
  'urn:example:good2',
  {},
  (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
);

const good2 = withLifecycle(goodComp2, goodCap2, {
  onInit: async () => {
    console.log('[Good2] Starting...');
  },
  onShutdown: async () => {
    console.log('[Good2] Shutting down...');
  },
});

await good1.init();
await failing.init();
await good2.init();

coordinator2.register(good1);
coordinator2.register(failing);
coordinator2.register(good2);

const result2 = await coordinator2.shutdown({ continueOnError: true });
if (result2.isErr()) {
  console.log(`\n⚠ Shutdown completed with errors: ${result2.error.type}`);
  if (result2.error.type === 'PARTIAL_SHUTDOWN') {
    console.log(`  ${result2.error.errors.length} component(s) failed to shutdown`);
  }
}

// Example 3: Shutdown with errors (stop on error)
console.log('\n=== Example 3: Shutdown with Errors (Stop) ===\n');

const coordinator3 = createShutdownCoordinator();

const { component: fc, capability: fcap } = createComponent(
  'urn:example:failing2',
  {},
  (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
);

const failing2 = withLifecycle(fc, fcap, {
  onInit: async () => {
    console.log('[Component1] Starting...');
  },
  onShutdown: async () => {
    console.log('[Component1] Shutting down...');
  },
});

const { component: fc2, capability: fcap2 } = createComponent(
  'urn:example:failing3',
  {},
  (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
);

const failing3 = withLifecycle(fc2, fcap2, {
  onInit: async () => {
    console.log('[Component2] Starting...');
  },
  onShutdown: async () => {
    console.log('[Component2] Attempting shutdown...');
    throw new Error('Critical failure!');
  },
});

const { component: fc3, capability: fcap3 } = createComponent(
  'urn:example:failing4',
  {},
  (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
);

const failing4 = withLifecycle(fc3, fcap3, {
  onInit: async () => {
    console.log('[Component3] Starting...');
  },
  onShutdown: async () => {
    console.log('[Component3] This should not be called');
  },
});

await failing2.init();
await failing3.init();
await failing4.init();

coordinator3.register(failing2);
coordinator3.register(failing3);
coordinator3.register(failing4);

const result3 = await coordinator3.shutdown({ continueOnError: false });
if (result3.isErr()) {
  console.log(`\n⚠ Shutdown stopped at error: ${result3.error.type}`);
  if (result3.error.type === 'COMPONENT_SHUTDOWN_ERROR') {
    console.log(`  Component at index ${result3.error.componentIndex} failed`);
  }
}

// Example 4: Shutdown with timeout
console.log('\n=== Example 4: Shutdown with Timeout ===\n');

const coordinator4 = createShutdownCoordinator();

const { component: slowComp, capability: slowCap } = createComponent(
  'urn:example:slow',
  {},
  (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
);

const slow = withLifecycle(slowComp, slowCap, {
  onInit: async () => {
    console.log('[Slow] Starting...');
  },
  onShutdown: async () => {
    console.log('[Slow] Shutting down (takes 200ms)...');
    await new Promise((resolve) => setTimeout(resolve, 200));
    console.log('[Slow] Shutdown complete');
  },
});

await slow.init();
coordinator4.register(slow);

console.log('Attempting shutdown with 100ms timeout...');
const result4 = await coordinator4.shutdown({ timeout: 100 });
if (result4.isErr()) {
  console.log(`⚠ Shutdown timed out: ${result4.error.type}`);
}

// Example 5: Double shutdown prevention
console.log('\n=== Example 5: Double Shutdown Prevention ===\n');

const coordinator5 = createShutdownCoordinator();

await coordinator5.shutdown();
console.log('First shutdown completed');

const doubleResult = await coordinator5.shutdown();
if (doubleResult.isErr()) {
  console.log(`Second shutdown prevented: ${doubleResult.error.type}`);
}
