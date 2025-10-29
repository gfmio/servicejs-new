# @servicejs/adapter-lru-cache

In-memory LRU (Least Recently Used) cache adapter for ServiceJS.

## Installation

```bash
npm install @servicejs/adapter-lru-cache
```

## Features

- ✅ In-memory LRU eviction policy
- ✅ Size-based eviction (max entries)
- ✅ TTL (Time To Live) support per entry
- ✅ Default TTL for all entries
- ✅ Eviction callbacks
- ✅ Automatic cleanup of expired entries
- ✅ Introspection methods (size, keys, values, entries)
- ✅ Type-safe with TypeScript
- ✅ Result-based error handling
- ✅ Zero external dependencies (pure TypeScript)

## Usage

### Basic Usage

```typescript
import { createLRUCacheAdapter } from '@servicejs/adapter-lru-cache';
import { isOk } from '@servicejs/result';

const cache = createLRUCacheAdapter();

await cache.init({
  maxSize: 100, // Maximum 100 entries
  defaultTTL: 300, // Default 5 minute TTL
});

await cache.start();

// Basic operations
await cache.set('user:123', 'Alice');
const result = await cache.get('user:123');

if (isOk(result)) {
  console.log('Value:', result.value);
}
```

### With Eviction Callback

```typescript
await cache.init({
  maxSize: 10,
  onEvict: (key, value) => {
    console.log(`Evicted: ${key} = ${value}`);
  },
});
```

### With TTL

```typescript
// Set with specific TTL (60 seconds)
await cache.set('session:abc', 'active', 60);

// Set with default TTL
await cache.set('temp:data', 'value'); // Uses defaultTTL from init

// Check TTL
const ttlResult = await cache.ttl('session:abc');
if (isOk(ttlResult)) {
  console.log('Remaining seconds:', ttlResult.value);
}
```

## Configuration

```typescript
interface LRUCacheConfig {
  /**
   * Maximum number of entries in cache
   * When exceeded, least recently used entry is evicted
   */
  maxSize: number;

  /**
   * Default TTL in seconds for entries without explicit TTL
   */
  defaultTTL?: number;

  /**
   * Callback invoked when an entry is evicted
   */
  onEvict?: (key: string, value: string) => void;
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
await cache.clear(): Promise<Result<void, Error>>
```

### Introspection

```typescript
await cache.size(): Promise<Result<number, Error>>
await cache.keys(): Promise<Result<string[], Error>>
await cache.values(): Promise<Result<string[], Error>>
await cache.entries(): Promise<Result<Array<[string, string]>, Error>>
```

### Batch Operations

```typescript
await cache.mget(keys: string[]): Promise<Result<Array<string | null>, Error>>
await cache.mset(entries: Record<string, string>): Promise<Result<void, Error>>
await cache.mdel(keys: string[]): Promise<Result<number, Error>>
```

## LRU Behavior

The cache evicts the **least recently used** entry when `maxSize` is reached:

```typescript
await cache.init({ maxSize: 3 });

await cache.set('a', '1');
await cache.set('b', '2');
await cache.set('c', '3');

// Access 'a' to make it recently used
await cache.get('a');

// Add 'd' - will evict 'b' (least recently used)
await cache.set('d', '4');

const bResult = await cache.get('b');
// bResult.value === null (evicted)
```

## TTL and Expiration

Entries automatically expire after their TTL:

```typescript
await cache.set('temp', 'value', 1); // 1 second TTL

const result1 = await cache.get('temp');
// result1.value === 'value'

await new Promise(resolve => setTimeout(resolve, 1100));

const result2 = await cache.get('temp');
// result2.value === null (expired)
```

Expired entries are automatically cleaned up on access and periodically.

## Use Cases

- **Application cache**: Fast in-memory caching without external dependencies
- **Session storage**: Limited session cache with automatic eviction
- **Request deduplication**: Cache recent API responses
- **Rate limiting**: Track request counts with TTL
- **Memoization**: Cache computed results
- **Development/testing**: No-dependency cache for local development

## Examples

See `examples/basic.ts` for comprehensive usage examples.

## Comparison with Other Adapters

- **vs adapter-redis**: No external dependencies, but limited to single process
- **vs adapter-upstash-redis**: Not edge-compatible, but no network latency
- **vs adapter-redis-streams**: Simple cache vs event sourcing

## Performance

- **Get**: O(1)
- **Set**: O(1)
- **Eviction**: O(1) (LRU doubly-linked list)
- **Memory**: Proportional to maxSize * average value size

## License

MIT
