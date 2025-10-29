/**
 * Basic LRU Cache adapter usage example
 */

import { createLRUCacheAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const cache = createLRUCacheAdapter();

  // Initialize with size limit and default TTL
  const initResult = await cache.init({
    maxSize: 100,
    ttl: 60000, // 1 minute default TTL
    onEvict: (key, value) => {
      console.log(`  → Evicted: ${key} = ${value}`);
    },
  });

  if (!isOk(initResult)) {
    console.error('Failed to initialize:', initResult.error);
    return;
  }

  console.log('✓ Initialized LRU cache (max 100 items, 60s TTL)');

  await cache.start();
  console.log('✓ Started LRU cache');

  // Basic operations
  console.log('\n=== Basic Operations ===');
  await cache.set('user:1', 'Alice');
  await cache.set('user:2', 'Bob');

  const user1Result = await cache.get('user:1');
  if (isOk(user1Result)) {
    console.log('User 1:', user1Result.value);
  }

  // Check if key exists
  const hasResult = await cache.has('user:2');
  if (isOk(hasResult)) {
    console.log('Has user:2:', hasResult.value);
  }

  // TTL example
  console.log('\n=== TTL Example ===');
  await cache.set('session:abc', 'active', 2000); // 2 second TTL
  console.log('Session created with 2s TTL');

  const session1 = await cache.get('session:abc');
  if (isOk(session1)) {
    console.log('Session (immediately):', session1.value);
  }

  console.log('Waiting 2.5 seconds...');
  await new Promise((resolve) => setTimeout(resolve, 2500));

  const session2 = await cache.get('session:abc');
  if (isOk(session2)) {
    console.log('Session (after expiry):', session2.value);
  }

  // LRU eviction
  console.log('\n=== LRU Eviction Example ===');
  // Create a small cache
  await cache.destroy();
  const smallCache = createLRUCacheAdapter();
  await smallCache.init({
    maxSize: 3,
    onEvict: (key, value) => {
      console.log(`  → Evicted (LRU): ${key} = ${value}`);
    },
  });
  await smallCache.start();

  console.log('Created cache with maxSize=3');
  await smallCache.set('a', 'value_a');
  await smallCache.set('b', 'value_b');
  await smallCache.set('c', 'value_c');
  console.log('Added 3 items (a, b, c)');

  // Access 'a' to make it recently used
  await smallCache.get('a');
  console.log('Accessed "a" (now most recently used)');

  // Add 'd', should evict 'b' (least recently used)
  console.log('Adding "d" (will evict least recently used)...');
  await smallCache.set('d', 'value_d');

  const bResult = await smallCache.get('b');
  if (isOk(bResult)) {
    console.log('Item "b" exists:', bResult.value !== null);
  }

  const aResult = await smallCache.get('a');
  if (isOk(aResult)) {
    console.log('Item "a" exists:', aResult.value !== null);
  }

  // Introspection
  console.log('\n=== Introspection ===');
  const sizeResult = await smallCache.size();
  if (isOk(sizeResult)) {
    console.log('Cache size:', sizeResult.value);
  }

  const keysResult = await smallCache.keys();
  if (isOk(keysResult)) {
    console.log('Keys:', keysResult.value);
  }

  const valuesResult = await smallCache.values();
  if (isOk(valuesResult)) {
    console.log('Values:', valuesResult.value);
  }

  const entriesResult = await smallCache.entries();
  if (isOk(entriesResult)) {
    console.log('Entries:', entriesResult.value);
  }

  // Delete operation
  console.log('\n=== Delete Operation ===');
  const delResult = await smallCache.del('c');
  if (isOk(delResult)) {
    console.log('Deleted "c":', delResult.value);
  }

  const newSizeResult = await smallCache.size();
  if (isOk(newSizeResult)) {
    console.log('New cache size:', newSizeResult.value);
  }

  // Clear cache
  console.log('\n=== Clear Cache ===');
  console.log('Clearing cache (will trigger eviction callbacks)...');
  await smallCache.clear();

  const finalSizeResult = await smallCache.size();
  if (isOk(finalSizeResult)) {
    console.log('Final cache size:', finalSizeResult.value);
  }

  // Health check
  const healthResult = await smallCache.health();
  if (isOk(healthResult)) {
    console.log('\n✓ Health status:', healthResult.value.status);
  }

  // Cleanup
  await smallCache.stop();
  await smallCache.destroy();

  console.log('\n✓ Example completed');
}

main().catch(console.error);
