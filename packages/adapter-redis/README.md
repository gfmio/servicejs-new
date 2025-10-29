# @servicejs/adapter-redis

Redis cache adapter with Cluster support for ServiceJS.

## Installation

```bash
npm install @servicejs/adapter-redis ioredis
```

## Features

- ✅ Standalone and Cluster modes
- ✅ Full Redis command support
- ✅ Cache, hash, list, set, sorted set operations
- ✅ Atomic counters
- ✅ Pattern matching and scanning
- ✅ TTL support
- ✅ Connection pooling
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

## Use Cases

- **Application cache**: High-performance caching layer
- **Session storage**: User session management
- **Leaderboards**: Real-time scoring with sorted sets
- **Rate limiting**: Counter-based rate limiting
- **Job queues**: List-based task queues
- **Pub/Sub messaging**: Real-time messaging
- **Distributed locks**: Coordination between services

## Examples

See `examples/basic.ts` for comprehensive usage examples.

## Related Packages

- [@servicejs/adapter-lru-cache](../adapter-lru-cache) - In-memory LRU cache
- [@servicejs/adapter-upstash-redis](../adapter-upstash-redis) - Edge-compatible Redis
- [@servicejs/adapter-redis-streams](../adapter-redis-streams) - Redis Streams for event sourcing

## License

MIT
