/**
 * @servicejs/adapter-redis
 *
 * Complete Redis adapter suite including:
 * - Cache & data structures (standalone and cluster)
 * - Pub/Sub messaging
 */

// Cache/data structures
export {
  createRedisAdapter,
  type RedisConfig,
  type RedisStandaloneConfig,
  type RedisClusterConfig,
  type CacheAdapter,
} from './cache.js';

// Pub/Sub messaging
export {
  createRedisPubSub,
  type RedisPubSubConfig,
} from './pubsub.js';
