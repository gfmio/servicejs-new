/**
 * @servicejs/adapter-redis
 *
 * Complete Redis adapter suite including:
 * - Cache & data structures (standalone and cluster)
 * - Pub/Sub messaging
 * - Streams (event sourcing)
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

// Streams (event sourcing)
export {
  createRedisStreams,
  type RedisStreamsConfig,
  type RedisStreamsAdapter,
  type StreamMessage,
  type StreamReadResult,
  type ConsumerGroupInfo,
} from './streams.js';
