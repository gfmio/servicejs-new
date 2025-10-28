# @servicejs/adapter-memcached

Memcached cache adapter for ServiceJS using memjs.

## Installation

```bash
bun add @servicejs/adapter-memcached
```

## Usage

```typescript
import { createMemcachedAdapter } from '@servicejs/adapter-memcached';
import { isOk } from '@servicejs/result';

const cache = createMemcachedAdapter();

await cache.init({ servers: 'localhost:11211' });
await cache.start();

// Set value with 1 hour TTL
await cache.set('user:123', { name: 'Alice' }, 3600);

// Get value
const result = await cache.get<{ name: string }>('user:123');
if (isOk(result) && result.value) {
  console.log(result.value.name);
}

// Delete
await cache.delete('user:123');

await cache.stop();
await cache.destroy();
```

## API

- `init(config)` - Initialize with Memcached servers
- `start()` - Start the client
- `stop()` - Stop the client
- `destroy()` - Clean up resources
- `health()` - Check connection health
- `get<T>(key)` - Get value by key
- `set<T>(key, value, ttl?)` - Set value with optional TTL (seconds)
- `delete(key)` - Delete key
- `exists(key)` - Check if key exists
- `flush()` - Clear all keys

## Testing

Tests use testcontainers to automatically start a Memcached instance:

```bash
bun test
```

The tests will automatically:
- Pull the memcached:1.6-alpine Docker image
- Start a Memcached container
- Run all tests against the container
- Stop and remove the container

## License

MIT
