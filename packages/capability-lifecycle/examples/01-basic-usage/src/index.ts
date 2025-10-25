/**
 * Graceful shutdown handling with cleanup
 */

import { createInMemoryLifecycle } from '@servicejs/capability-lifecycle';

console.log('Graceful Shutdown Example\n');

const lifecycle = createInMemoryLifecycle();

// Simulate resources that need cleanup
const resources = {
  database: { connected: true },
  cache: { connected: true },
  queue: { connected: true },
};

// Register shutdown handlers
lifecycle.onShutdown(async (signal) => {
  console.log(`\nShutdown signal received: ${signal.reason}`);
  console.log(`Timestamp: ${new Date(signal.timestamp).toISOString()}`);

  console.log('\nCleaning up database connection...');
  resources.database.connected = false;
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log('Database disconnected');
});

lifecycle.onShutdown(async (signal) => {
  console.log('Cleaning up cache connection...');
  resources.cache.connected = false;
  await new Promise(resolve => setTimeout(resolve, 50));
  console.log('Cache disconnected');
});

lifecycle.onShutdown(async (signal) => {
  console.log('Cleaning up queue connection...');
  resources.queue.connected = false;
  await new Promise(resolve => setTimeout(resolve, 75));
  console.log('Queue disconnected');
});

console.log('Application running with 3 resources:');
console.log(`  Database: ${resources.database.connected ? 'connected' : 'disconnected'}`);
console.log(`  Cache: ${resources.cache.connected ? 'connected' : 'disconnected'}`);
console.log(`  Queue: ${resources.queue.connected ? 'connected' : 'disconnected'}`);

// Trigger shutdown
console.log('\nTriggering shutdown...');
await lifecycle.shutdown('User requested shutdown');

console.log('\nFinal resource states:');
console.log(`  Database: ${resources.database.connected ? 'connected' : 'disconnected'}`);
console.log(`  Cache: ${resources.cache.connected ? 'connected' : 'disconnected'}`);
console.log(`  Queue: ${resources.queue.connected ? 'connected' : 'disconnected'}`);

console.log('\nShutdown complete!');
