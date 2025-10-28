# @servicejs/adapter-cloudflare-kv

Cloudflare KV cache adapter for ServiceJS.

## Installation

```bash
bun add @servicejs/adapter-cloudflare-kv
```

## Usage

### In a Cloudflare Worker

```typescript
import { createCloudflareKVAdapter } from '@servicejs/adapter-cloudflare-kv';
import { isOk } from '@servicejs/result';

interface Env {
  CACHE: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cache = createCloudflareKVAdapter();

    await cache.init({ namespace: env.CACHE, defaultTTL: 3600 });
    await cache.start();

    // Set value with 1 hour TTL
    await cache.set('user:123', { name: 'Alice' }, 3600);

    // Get value
    const result = await cache.get<{ name: string }>('user:123');
    if (isOk(result) && result.value) {
      return new Response(JSON.stringify(result.value));
    }

    await cache.stop();
    await cache.destroy();

    return new Response('Not found', { status: 404 });
  }
};
```

### Wrangler Configuration

Create a `wrangler.toml` file:

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"
```

## API

- `init(config)` - Initialize with KV namespace binding
- `start()` - Start the adapter
- `stop()` - Stop the adapter
- `destroy()` - Clean up resources
- `health()` - Check KV connection health
- `get<T>(key)` - Get value by key
- `set<T>(key, value, ttl?)` - Set value with optional TTL (seconds)
- `delete(key)` - Delete key (returns true if existed)
- `exists(key)` - Check if key exists
- `list(prefix?, limit?)` - List keys with optional prefix and limit
- `flush(prefix?)` - Delete all keys (or keys with prefix)

## Configuration

```typescript
interface CloudflareKVConfig {
  namespace: KVNamespace;  // KV namespace binding from Cloudflare Worker
  defaultTTL?: number;     // Default TTL in seconds for all cached values
}
```

## Features

- **Full KV API Support** - Get, set, delete, exists, list, flush operations
- **TTL Support** - Per-key and default TTL configuration
- **Prefix Operations** - List and flush with prefix filtering
- **Type Safety** - Full TypeScript support with generics
- **Result Types** - Rust-style error handling
- **Health Checks** - Monitor KV connection status

## Testing

Tests run in a real Cloudflare Workers environment using Miniflare and Vitest:

```bash
bun test
```

The tests use `@cloudflare/vitest-pool-workers` which:
- Runs tests in an actual Workers environment
- Provides a real KV namespace instance
- Supports all KV operations and features
- No mocking required - tests against real KV API

## License

MIT
