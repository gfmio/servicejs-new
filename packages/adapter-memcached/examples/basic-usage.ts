/**
 * Basic Memcached Cache Adapter Usage Example
 *
 * This example demonstrates basic cache operations with the Memcached adapter.
 *
 * Prerequisites:
 * - Start Memcached: docker run -d -p 11211:11211 memcached
 * - Run: bun run examples/basic-usage.ts
 */

import { createMemcachedAdapter } from '../src/memcached.js';
import { isOk, isErr } from '@servicejs/result';

async function main() {
  console.log('=== Memcached Cache Adapter - Basic Usage ===\n');

  // Create cache adapter
  const cache = createMemcachedAdapter();

  // Initialize with Memcached servers
  console.log('1. Initializing cache...');
  const initResult = await cache.init({ servers: 'localhost:11211' });
  if (isErr(initResult)) {
    console.error('Failed to initialize:', initResult.error.message);
    return;
  }
  console.log('✓ Cache initialized\n');

  // Start the cache
  console.log('2. Starting cache...');
  const startResult = await cache.start();
  if (isErr(startResult)) {
    console.error('Failed to start:', startResult.error.message);
    return;
  }
  console.log('✓ Cache started\n');

  // Check health
  console.log('3. Checking health...');
  const healthResult = await cache.health();
  if (isOk(healthResult)) {
    console.log(`✓ Cache is ${healthResult.value.status}\n`);
  }

  // Set a string value
  console.log('4. Setting string value...');
  await cache.set('greeting', 'Hello, Memcached!');
  console.log('✓ Set: greeting = "Hello, Memcached!"\n');

  // Get the string value
  console.log('5. Getting string value...');
  const greetingResult = await cache.get<string>('greeting');
  if (isOk(greetingResult) && greetingResult.value) {
    console.log(`✓ Got: greeting = "${greetingResult.value}"\n`);
  }

  // Set an object value
  console.log('6. Setting object value...');
  const user = { id: 123, name: 'Alice', email: 'alice@example.com' };
  await cache.set('user:123', user);
  console.log('✓ Set: user:123 =', user, '\n');

  // Get the object value
  console.log('7. Getting object value...');
  const userResult = await cache.get<typeof user>('user:123');
  if (isOk(userResult) && userResult.value) {
    console.log('✓ Got: user:123 =', userResult.value, '\n');
  }

  // Check if key exists
  console.log('8. Checking if key exists...');
  const existsResult = await cache.exists('user:123');
  if (isOk(existsResult)) {
    console.log(`✓ Key "user:123" exists: ${existsResult.value}\n`);
  }

  // Set value with TTL (Time To Live)
  console.log('9. Setting value with 2 second TTL...');
  await cache.set('temp-key', 'temporary-value', 2);
  console.log('✓ Set: temp-key = "temporary-value" (expires in 2s)\n');

  // Check immediately
  console.log('10. Getting value immediately...');
  const tempResult1 = await cache.get<string>('temp-key');
  if (isOk(tempResult1)) {
    console.log(`✓ Got: temp-key = "${tempResult1.value}"\n`);
  }

  // Wait for expiration
  console.log('11. Waiting 2.5 seconds for expiration...');
  await new Promise(resolve => setTimeout(resolve, 2500));

  // Check after expiration
  console.log('12. Getting value after expiration...');
  const tempResult2 = await cache.get<string>('temp-key');
  if (isOk(tempResult2)) {
    console.log(`✓ Got: temp-key = ${tempResult2.value} (expired)\n`);
  }

  // Delete a key
  console.log('13. Deleting key...');
  const deleteResult = await cache.delete('greeting');
  if (isOk(deleteResult)) {
    console.log(`✓ Deleted: greeting (success: ${deleteResult.value})\n`);
  }

  // Verify deletion
  console.log('14. Verifying deletion...');
  const deletedResult = await cache.get<string>('greeting');
  if (isOk(deletedResult)) {
    console.log(`✓ Got: greeting = ${deletedResult.value} (deleted)\n`);
  }

  // Flush all keys
  console.log('15. Flushing all keys...');
  await cache.flush();
  console.log('✓ All keys flushed\n');

  // Verify flush
  console.log('16. Verifying flush...');
  const flushedResult = await cache.get<typeof user>('user:123');
  if (isOk(flushedResult)) {
    console.log(`✓ Got: user:123 = ${flushedResult.value} (flushed)\n`);
  }

  // Stop and cleanup
  console.log('17. Stopping cache...');
  await cache.stop();
  await cache.destroy();
  console.log('✓ Cache stopped and destroyed\n');

  console.log('=== Example Complete ===');
}

main().catch(console.error);
