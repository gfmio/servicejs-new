# @servicejs/adapter-redis

Complete Redis adapter suite for ServiceJS.

## Installation

```bash
npm install @servicejs/adapter-redis ioredis
```

## Features

### Cache & Data Structures
- ✅ Standalone and Cluster modes
- ✅ Full Redis command support
- ✅ Cache, hash, list, set, sorted set operations
- ✅ Atomic counters
- ✅ Pattern matching and scanning
- ✅ TTL support
- ✅ Connection pooling

### Pub/Sub Messaging
- ✅ Real-time message distribution
- ✅ Producer/Consumer pattern
- ✅ Fan-out messaging (multiple subscribers)
- ✅ Message attributes support
- ✅ Type-safe messaging

### General
- ✅ Type-safe with TypeScript
- ✅ Result-based error handling

## Usage

### Standalone Mode

```typescript
import { createRedisAdapter } from '@servicejs/adapter-redis';
import { isOk } from '@servicejs/result';

const cache = createRedisAdapter();

await cache.init({
  mode: 'standalone',
  host: 'localhost',
  port: 6379,
});

await cache.start();

// Basic operations
await cache.set('key', 'value', 60); // 60 second TTL
const result = await cache.get('key');

if (isOk(result)) {
  console.log('Value:', result.value);
}
```

### Cluster Mode

```typescript
await cache.init({
  mode: 'cluster',
  nodes: [
    { host: 'localhost', port: 7000 },
    { host: 'localhost', port: 7001 },
    { host: 'localhost', port: 7002 },
  ],
  password: 'your-password',
});
```

## Configuration

### Standalone Mode

```typescript
interface RedisStandaloneConfig {
  mode: 'standalone';
  host?: string; // Default: 'localhost'
  port?: number; // Default: 6379
  password?: string;
  db?: number; // Default: 0
  keyPrefix?: string;
  connectTimeout?: number; // Default: 10000ms
  commandTimeout?: number; // Default: 5000ms
}
```

### Cluster Mode

```typescript
interface RedisClusterConfig {
  mode: 'cluster';
  nodes: Array<{ host: string; port: number }>;
  password?: string;
  keyPrefix?: string;
  enableReadyCheck?: boolean; // Default: true
  clusterRetryStrategy?: (times: number) => number | null;
  redisOptions?: Partial<RedisOptions>;
}
```

## API Reference

### Basic Cache Operations

```typescript
await cache.get(key: string): Promise<Result<string | null, Error>>
await cache.set(key: string, value: string, ttlSeconds?: number): Promise<Result<void, Error>>
await cache.del(key: string): Promise<Result<number, Error>>
await cache.exists(key: string): Promise<Result<number, Error>>
await cache.expire(key: string, ttlSeconds: number): Promise<Result<number, Error>>
await cache.ttl(key: string): Promise<Result<number, Error>>
```

### Batch Operations

```typescript
await cache.mget(keys: string[]): Promise<Result<Array<string | null>, Error>>
await cache.mset(entries: Record<string, string>): Promise<Result<void, Error>>
await cache.mdel(keys: string[]): Promise<Result<number, Error>>
```

### Hash Operations

```typescript
await cache.hget(key: string, field: string): Promise<Result<string | null, Error>>
await cache.hset(key: string, field: string, value: string): Promise<Result<number, Error>>
await cache.hgetall(key: string): Promise<Result<Record<string, string>, Error>>
await cache.hdel(key: string, fields: string[]): Promise<Result<number, Error>>
```

### List Operations

```typescript
await cache.lpush(key: string, values: string[]): Promise<Result<number, Error>>
await cache.rpush(key: string, values: string[]): Promise<Result<number, Error>>
await cache.lpop(key: string): Promise<Result<string | null, Error>>
await cache.rpop(key: string): Promise<Result<string | null, Error>>
await cache.lrange(key: string, start: number, stop: number): Promise<Result<string[], Error>>
await cache.llen(key: string): Promise<Result<number, Error>>
```

### Set Operations

```typescript
await cache.sadd(key: string, members: string[]): Promise<Result<number, Error>>
await cache.srem(key: string, members: string[]): Promise<Result<number, Error>>
await cache.smembers(key: string): Promise<Result<string[], Error>>
await cache.sismember(key: string, member: string): Promise<Result<number, Error>>
```

### Sorted Set Operations

```typescript
await cache.zadd(key: string, members: Array<{score: number, value: string}>): Promise<Result<number, Error>>
await cache.zrange(key: string, start: number, stop: number): Promise<Result<string[], Error>>
await cache.zrangebyscore(key: string, min: number, max: number): Promise<Result<string[], Error>>
await cache.zrem(key: string, members: string[]): Promise<Result<number, Error>>
await cache.zscore(key: string, member: string): Promise<Result<string | null, Error>>
```

### Counter Operations

```typescript
await cache.incr(key: string): Promise<Result<number, Error>>
await cache.decr(key: string): Promise<Result<number, Error>>
await cache.incrby(key: string, increment: number): Promise<Result<number, Error>>
await cache.decrby(key: string, decrement: number): Promise<Result<number, Error>>
```

### Pattern Operations

```typescript
await cache.keys(pattern: string): Promise<Result<string[], Error>>
await cache.scan(cursor: string, pattern?: string, count?: number): Promise<Result<{cursor: string, keys: string[]}, Error>>
```

---

## Pub/Sub Messaging

### Basic Pub/Sub

```typescript
import { createRedisPubSub } from '@servicejs/adapter-redis';
import { isOk } from '@servicejs/result';

const mq = createRedisPubSub();

await mq.init({ host: 'localhost', port: 6379 });
await mq.start();

// Create consumer
const consumerResult = await mq.createConsumer();
if (isOk(consumerResult)) {
  const consumer = consumerResult.value;

  await consumer.subscribe('events', async (msg) => {
    console.log('Received:', msg.data);
    await msg.ack();
  });
}

// Create producer
const producerResult = await mq.createProducer();
if (isOk(producerResult)) {
  const producer = producerResult.value;
  await producer.publish('events', {
    type: 'user.created',
    userId: '123',
  });
  await producer.close();
}
```

### Quick Publish

For simple one-off messages:

```typescript
await mq.publish('notifications', {
  message: 'Hello World!',
  timestamp: Date.now(),
});
```

### Fan-Out Pattern

Multiple consumers receive all messages:

```typescript
// Email service consumer
const emailConsumer = (await mq.createConsumer()).value;
await emailConsumer.subscribe('user.events', async (msg) => {
  await sendWelcomeEmail(msg.data.userId);
  await msg.ack();
});

// Analytics service consumer
const analyticsConsumer = (await mq.createConsumer()).value;
await analyticsConsumer.subscribe('user.events', async (msg) => {
  await trackUserCreation(msg.data.userId);
  await msg.ack();
});

// Both consumers receive all messages
await mq.publish('user.events', {
  type: 'user.created',
  userId: '456',
});
```

### Pub/Sub Configuration

```typescript
interface RedisPubSubConfig {
  host?: string;        // Redis host (default: 'localhost')
  port?: number;        // Redis port (default: 6379)
  password?: string;    // Redis password (optional)
  db?: number;          // Redis database number (default: 0)
  keyPrefix?: string;   // Key prefix for all operations (optional)
}
```

### Pub/Sub Limitations

**No Message Persistence**: Messages are only delivered to currently connected subscribers. If no subscribers are listening, the message is lost.

**No Acknowledgment Guarantees**: The `ack()` and `nack()` methods are no-ops (they exist for interface compatibility).

**No Message Ordering Guarantees**: Messages may arrive out of order.

**When to Use Redis Pub/Sub:**
- ✅ Real-time notifications
- ✅ Chat applications
- ✅ Live updates/dashboards
- ✅ Event broadcasting
- ✅ Cache invalidation

**When NOT to use Redis Pub/Sub:**
- ❌ Task queues (use Redis Streams or RabbitMQ)
- ❌ Guaranteed message delivery
- ❌ Message persistence

---

## Use Cases

### Cache & Data Structures
- **Application cache**: High-performance caching layer
- **Session storage**: User session management
- **Leaderboards**: Real-time scoring with sorted sets
- **Rate limiting**: Counter-based rate limiting
- **Job queues**: List-based task queues
- **Distributed locks**: Coordination between services

### Pub/Sub Messaging
- **Real-time notifications**: Push notifications to users
- **Chat applications**: Real-time messaging
- **Live dashboards**: Real-time data updates
- **Event broadcasting**: Distribute events to multiple services
- **Cache invalidation**: Notify services of cache changes

## Examples

- `examples/basic.ts` - Cache and data structures usage
- `examples/pubsub.ts` - Pub/Sub messaging and chat demo

## Related Packages

- [@servicejs/adapter-lru-cache](../adapter-lru-cache) - In-memory LRU cache
- [@servicejs/adapter-upstash-redis](../adapter-upstash-redis) - Edge-compatible Redis
- [@servicejs/adapter-redis-streams](../adapter-redis-streams) - Redis Streams for event sourcing

## License

MIT
