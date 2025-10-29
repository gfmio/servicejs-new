/**
 * Basic Upstash Redis adapter usage example
 *
 * This example requires actual Upstash credentials.
 * Get free Redis at: https://upstash.com
 */

import { createUpstashRedisAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  // Get credentials from environment variables
  const url = process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_TOKEN;

  if (!url || !token) {
    console.error('Please set UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN environment variables');
    console.error('Get free Redis at: https://upstash.com');
    process.exit(1);
  }

  const cache = createUpstashRedisAdapter();

  // Initialize with Upstash credentials
  const initResult = await cache.init({
    url,
    token,
    enableTelemetry: false, // Optional: disable telemetry
  });

  if (!isOk(initResult)) {
    console.error('Failed to initialize:', initResult.error);
    return;
  }

  console.log('✓ Initialized Upstash Redis adapter');

  await cache.start();
  console.log('✓ Started Upstash Redis adapter');

  // Test connection
  const pingResult = await cache.ping();
  if (isOk(pingResult)) {
    console.log('✓ Ping:', pingResult.value);
  }

  // Basic cache operations
  console.log('\n=== Basic Cache Operations ===');
  await cache.set('user:name', 'Alice');
  const nameResult = await cache.get('user:name');
  if (isOk(nameResult)) {
    console.log('Name:', nameResult.value);
  }

  // Set with TTL (edge-compatible!)
  console.log('\n=== TTL Example (Edge-Compatible) ===');
  await cache.set('session:123', 'active', 60);
  const ttlResult = await cache.ttl('session:123');
  if (isOk(ttlResult)) {
    console.log('Session TTL:', ttlResult.value, 'seconds');
  }

  // Batch operations
  console.log('\n=== Batch Operations ===');
  await cache.mset({
    'product:1': 'Laptop',
    'product:2': 'Mouse',
    'product:3': 'Keyboard',
  });

  const productsResult = await cache.mget(['product:1', 'product:2', 'product:3']);
  if (isOk(productsResult)) {
    console.log('Products:', productsResult.value);
  }

  // Hash operations
  console.log('\n=== Hash Operations ===');
  await cache.hset('user:1', 'name', 'Bob');
  await cache.hset('user:1', 'email', 'bob@example.com');

  const userResult = await cache.hgetall('user:1');
  if (isOk(userResult)) {
    console.log('User:', userResult.value);
  }

  // List operations (Queue)
  console.log('\n=== List Operations ===');
  await cache.rpush('tasks', ['task1', 'task2', 'task3']);

  const taskResult = await cache.lpop('tasks');
  if (isOk(taskResult)) {
    console.log('Next task:', taskResult.value);
  }

  const remainingResult = await cache.lrange('tasks', 0, -1);
  if (isOk(remainingResult)) {
    console.log('Remaining tasks:', remainingResult.value);
  }

  // Set operations
  console.log('\n=== Set Operations ===');
  await cache.sadd('tags', ['javascript', 'typescript', 'edge']);

  const tagsResult = await cache.smembers('tags');
  if (isOk(tagsResult)) {
    console.log('Tags:', tagsResult.value);
  }

  // Sorted set (Leaderboard)
  console.log('\n=== Sorted Set (Leaderboard) ===');
  await cache.zadd('leaderboard', [
    { score: 1000, member: 'player1' },
    { score: 1500, member: 'player2' },
    { score: 1200, member: 'player3' },
  ]);

  const topPlayersResult = await cache.zrange('leaderboard', 0, -1);
  if (isOk(topPlayersResult)) {
    console.log('Leaderboard:', topPlayersResult.value);
  }

  // Counter operations
  console.log('\n=== Counter Operations ===');
  await cache.incr('page:views');
  await cache.incr('page:views');
  await cache.incrby('page:views', 10);

  const viewsResult = await cache.get('page:views');
  if (isOk(viewsResult)) {
    console.log('Page views:', viewsResult.value);
  }

  // Pattern search
  console.log('\n=== Pattern Search ===');
  const keysResult = await cache.keys('product:*');
  if (isOk(keysResult)) {
    console.log('Product keys:', keysResult.value);
  }

  // Health check
  const healthResult = await cache.health();
  if (isOk(healthResult)) {
    console.log('\n✓ Health status:', healthResult.value.status);
  }

  // Cleanup
  console.log('\n=== Cleanup ===');
  await cache.flushdb();
  console.log('✓ Flushed database');

  await cache.stop();
  await cache.destroy();

  console.log('\n✓ Example completed');
  console.log('\nNote: This adapter works in edge environments like:');
  console.log('  - Cloudflare Workers');
  console.log('  - Deno Deploy');
  console.log('  - Vercel Edge Functions');
  console.log('  - Any runtime with fetch()');
}

main().catch(console.error);
