# @servicejs/adapter-upstash-redis

Edge-compatible Redis cache adapter using Upstash for ServiceJS.

## Installation

```bash
npm install @servicejs/adapter-upstash-redis @upstash/redis
```

## Features

- ✅ **Edge-compatible** - Works in Cloudflare Workers, Deno Deploy, Vercel Edge
- ✅ REST API based (no TCP connections)
- ✅ Full Redis command support
- ✅ Cache, hash, list, set, sorted set operations
- ✅ Atomic counters
- ✅ Pattern matching
- ✅ TTL support
- ✅ Type-safe with TypeScript
- ✅ Result-based error handling
- ✅ Global database replication

## Usage

### Basic Setup

Get your free Redis database at [https://upstash.com](https://upstash.com)

```typescript
import { createUpstashRedisAdapter } from '@servicejs/adapter-upstash-redis';
import { isOk } from '@servicejs/result';

const cache = createUpstashRedisAdapter();

await cache.init({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

await cache.start();

// Basic operations
await cache.set('key', 'value', 60); // 60 second TTL
const result = await cache.get('key');

if (isOk(result)) {
  console.log('Value:', result.value);
}
```

### Edge Runtime (Cloudflare Workers)

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cache = createUpstashRedisAdapter();

    await cache.init({
      url: env.UPSTASH_REDIS_URL,
      token: env.UPSTASH_REDIS_TOKEN,
      enableTelemetry: false, // Optional: disable telemetry
    });

    await cache.start();

    // Use cache in edge function
    const result = await cache.get('user:session');

    return new Response(JSON.stringify({ session: result.value }));
  }
};
```

## Configuration

```typescript
interface UpstashRedisConfig {
  /**
   * Upstash Redis REST URL
   * Example: 'https://your-instance.upstash.io'
   */
  url: string;

  /**
   * Upstash Redis REST token
   */
  token: string;

  /**
   * Optional key prefix for all operations
   */
  keyPrefix?: string;

  /**
   * Enable/disable Upstash telemetry
   * Default: true
   */
  enableTelemetry?: boolean;

  /**
   * Custom fetch implementation (for testing)
   */
  fetch?: typeof fetch;
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
await cache.ping(): Promise<Result<string, Error>>
await cache.flushdb(): Promise<Result<void, Error>>
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
await cache.zadd(key: string, members: Array<{score: number, member: string}>): Promise<Result<number, Error>>
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

## Edge Runtime Compatibility

This adapter works in any runtime with `fetch()` support:

- ✅ **Cloudflare Workers**
- ✅ **Deno Deploy**
- ✅ **Vercel Edge Functions**
- ✅ **Next.js Edge Runtime**
- ✅ **Netlify Edge Functions**
- ✅ **Fastly Compute@Edge**
- ✅ **Node.js** (v18+)
- ✅ **Bun**

### Why Edge-Compatible?

Unlike traditional Redis adapters that use TCP connections:
- No TCP = works in edge runtimes with no TCP support
- REST API over HTTPS
- Global replication for low latency
- Automatic connection pooling via HTTP/2

## Use Cases

- **Edge caching**: Cache data close to users globally
- **Session storage**: User sessions in edge functions
- **API response cache**: Cache API responses at the edge
- **Rate limiting**: Distributed rate limiting
- **Feature flags**: Global feature flag storage
- **Serverless functions**: Cache in Lambda/Cloud Functions without VPC
- **Static site generation**: Cache data for SSG builds

## Examples

See `examples/basic.ts` for comprehensive usage examples including:
- Basic cache operations
- Batch operations
- Hash operations for user data
- List operations for queues
- Set operations for tags
- Sorted sets for leaderboards
- Counters for analytics

## Performance

- **Latency**: 10-50ms globally (depends on region)
- **Throughput**: Scales automatically
- **Cost**: Pay-per-request pricing
- **Free tier**: 10,000 commands/day

## Comparison with Other Adapters

- **vs adapter-redis**: Edge-compatible, REST-based, no self-hosting
- **vs adapter-lru-cache**: Distributed, persistent, but higher latency
- **vs adapter-redis-streams**: Simple cache vs event sourcing

## Related Packages

- [@servicejs/adapter-redis](../adapter-redis) - Traditional Redis with TCP
- [@servicejs/adapter-lru-cache](../adapter-lru-cache) - In-memory LRU cache
- [@servicejs/adapter-redis-streams](../adapter-redis-streams) - Redis Streams for event sourcing

## Testing

The test suite includes unit tests and optional integration tests.

To run integration tests with a real Upstash instance:

```bash
export UPSTASH_REDIS_URL=https://your-instance.upstash.io
export UPSTASH_REDIS_TOKEN=your-token
bun test
```

## License

MIT
