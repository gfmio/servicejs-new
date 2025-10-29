/**
 * Basic Redis adapter usage example
 */

import { createRedisAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const cache = createRedisAdapter();

  // Initialize in standalone mode
  const initResult = await cache.init({
    mode: 'standalone',
    host: 'localhost',
    port: 6379,
  });

  if (!isOk(initResult)) {
    console.error('Failed to initialize:', initResult.error);
    return;
  }

  console.log('✓ Initialized Redis adapter');

  await cache.start();
  console.log('✓ Started Redis adapter');

  // Basic cache operations
  console.log('\n=== Basic Cache Operations ===');
  await cache.set('user:name', 'Alice');
  const nameResult = await cache.get('user:name');
  if (isOk(nameResult)) {
    console.log('Name:', nameResult.value);
  }

  // Set with TTL
  console.log('\n=== TTL Example ===');
  await cache.set('session:123', 'active', 60); // 60 seconds
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
  await cache.hset('user:1', 'age', '30');

  const userResult = await cache.hgetall('user:1');
  if (isOk(userResult)) {
    console.log('User:', userResult.value);
  }

  // List operations (Queue)
  console.log('\n=== List Operations (Queue) ===');
  await cache.rpush('tasks', ['task1', 'task2', 'task3']);

  const taskResult = await cache.lpop('tasks');
  if (isOk(taskResult)) {
    console.log('Next task:', taskResult.value);
  }

  const remainingResult = await cache.lrange('tasks', 0, -1);
  if (isOk(remainingResult)) {
    console.log('Remaining tasks:', remainingResult.value);
  }

  // Set operations (Tags)
  console.log('\n=== Set Operations (Tags) ===');
  await cache.sadd('post:1:tags', ['javascript', 'typescript', 'node']);

  const tagsResult = await cache.smembers('post:1:tags');
  if (isOk(tagsResult)) {
    console.log('Post tags:', tagsResult.value);
  }

  const hasTagResult = await cache.sismember('post:1:tags', 'typescript');
  if (isOk(hasTagResult)) {
    console.log('Has typescript tag:', hasTagResult.value === 1);
  }

  // Sorted set operations (Leaderboard)
  console.log('\n=== Sorted Set Operations (Leaderboard) ===');
  await cache.zadd('leaderboard', [
    { score: 1000, value: 'player1' },
    { score: 1500, value: 'player2' },
    { score: 1200, value: 'player3' },
  ]);

  const topPlayersResult = await cache.zrange('leaderboard', 0, -1);
  if (isOk(topPlayersResult)) {
    console.log('Leaderboard (ascending):', topPlayersResult.value);
  }

  const scoreResult = await cache.zscore('leaderboard', 'player2');
  if (isOk(scoreResult)) {
    console.log('Player2 score:', scoreResult.value);
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
  await cache.flushdb();
  await cache.stop();
  await cache.destroy();

  console.log('\n✓ Example completed');
}

main().catch(console.error);
