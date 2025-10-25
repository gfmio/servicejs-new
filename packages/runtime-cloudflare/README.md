# @servicejs/runtime-cloudflare

Cloudflare Workers runtime for ServiceJS - edge computing platform integration as explicit capabilities.

## Features

- **Environment**: Access to Cloudflare Workers bindings as environment variables
- **Time**: setTimeout/setInterval with Result types, performance.now() support
- **Lifecycle**: Graceful shutdown handlers (no signals in Workers)
- **Console**: All log levels via Workers console
- **HTTP**: Fetch API with Result types
- **Crypto**: Web Crypto API (SHA-1/256/384/512, HMAC, random generation - no MD5)
- **KV**: Optional Workers KV namespace integration

## Installation

```bash
npm add @servicejs/runtime-cloudflare
```

## Usage

### Basic Worker

```typescript
import { bootstrap } from '@servicejs/runtime-cloudflare';

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const runtime = bootstrap({
      bindings: env,
      kvNamespace: env.MY_KV,
    });

    // Use capabilities
    const apiKey = runtime.env.get('API_KEY').unwrapOr('default');
    runtime.console.log('Processing request with API key:', apiKey);

    // Make HTTP request
    const response = await runtime.http.get('https://api.example.com/data');
    if (!response.ok) {
      return new Response('Failed to fetch data', { status: 500 });
    }

    const data = await response.value.json();

    // Store in KV
    if (runtime.kv) {
      await runtime.kv.put('last-data', JSON.stringify(data.value));
    }

    return new Response(JSON.stringify(data.value), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
```

### With Lifecycle Management

```typescript
import { bootstrap } from '@servicejs/runtime-cloudflare';

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const runtime = bootstrap({ bindings: env, kvNamespace: env.MY_KV });

    // Register cleanup handlers
    runtime.lifecycle.onShutdown(async () => {
      runtime.console.log('Request completed, cleaning up...');
    });

    try {
      // Your application logic
      const result = await processRequest(runtime, request);

      // Ensure cleanup runs
      ctx.waitUntil(runtime.lifecycle.shutdown());

      return new Response(result, { status: 200 });
    } catch (error) {
      runtime.console.error('Request failed:', error);
      ctx.waitUntil(runtime.lifecycle.shutdown());
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};

async function processRequest(runtime: any, request: Request) {
  // Your application code using runtime capabilities
  return 'Success';
}
```

## Capabilities

### Environment Capability

Cloudflare Workers don't have traditional environment variables. Instead, they use "bindings" which can be strings, KV namespaces, Durable Objects, etc.

```typescript
// wrangler.toml
// [vars]
// API_KEY = "secret"
// DEBUG = "true"

const runtime = bootstrap({ bindings: env });

const apiKey = runtime.env.get('API_KEY').unwrapOr('default');
const debug = runtime.env.get('DEBUG').unwrapOr('false');
const allEnv = runtime.env.getAll(); // Only string bindings
const platform = runtime.env.platform(); // Returns 'cloudflare'
```

### Time Capability

```typescript
const now = runtime.time.now(); // Current timestamp
const highRes = runtime.time.highResolutionTime(); // Some(performance.now()) or None

const timerId = runtime.time.setTimeout(() => {
  runtime.console.log('Timer fired!');
}, 1000);

runtime.time.clearTimeout(timerId.unwrap());
```

**Note**: Timers in Cloudflare Workers have limitations. Long-running timers may not complete if the request finishes.

### Lifecycle Capability

```typescript
runtime.lifecycle.onShutdown(async () => {
  // Cleanup logic
  runtime.console.log('Shutting down...');
});

// Trigger shutdown manually
// Use with ctx.waitUntil() to ensure it completes
ctx.waitUntil(runtime.lifecycle.shutdown());
```

**Note**: Cloudflare Workers don't have signals. Lifecycle handlers are useful for cleanup after request processing.

### Console Capability

```typescript
runtime.console.log('Info message');
runtime.console.warn('Warning message');
runtime.console.error('Error message');
runtime.console.debug('Debug message');
```

Logs appear in the Cloudflare Workers dashboard and wrangler tail.

### HTTP Capability

```typescript
// GET request
const response = await runtime.http.get('https://api.example.com/users');
if (response.ok) {
  const users = await response.value.json();
  runtime.console.log('Users:', users);
}

// POST request
const createResult = await runtime.http.post(
  'https://api.example.com/users',
  JSON.stringify({ name: 'Alice' }),
  { headers: { 'Content-Type': 'application/json' } }
);

// Other methods
await runtime.http.put(url, body, options);
await runtime.http.patch(url, body, options);
await runtime.http.delete(url, options);
await runtime.http.head(url, options);
```

### Crypto Capability

```typescript
// Random generation
const bytes = runtime.crypto.randomBytes(32).unwrap();
const uuid = runtime.crypto.randomUUID().unwrap();
const randomNum = runtime.crypto.randomInt(1, 100).unwrap();

// Hashing (Web Crypto API - no MD5 support)
const sha256 = await runtime.crypto.hash('sha256', 'data', 'hex');
const sha512 = await runtime.crypto.hash('sha512', new Uint8Array([1, 2, 3]));

// HMAC
const hmac = await runtime.crypto.hmac('sha256', 'secret', 'message', 'hex');

// Timing-safe comparison
const equal = runtime.crypto.timingSafeEqual(
  new Uint8Array([1, 2, 3]),
  new Uint8Array([1, 2, 3])
).unwrap(); // true
```

### KV Namespace Capability

If you provide a KV namespace binding, you'll get a KV capability:

```typescript
// wrangler.toml
// [[kv_namespaces]]
// binding = "MY_KV"
// id = "..."

const runtime = bootstrap({ bindings: env, kvNamespace: env.MY_KV });

if (runtime.kv) {
  // Get value
  const valueResult = await runtime.kv.get('myKey');
  if (valueResult.ok && valueResult.value) {
    runtime.console.log('Value:', valueResult.value);
  }

  // Get with metadata
  const withMeta = await runtime.kv.getWithMetadata('myKey');
  if (withMeta.ok) {
    runtime.console.log('Value:', withMeta.value.value);
    runtime.console.log('Metadata:', withMeta.value.metadata);
  }

  // Put value
  await runtime.kv.put('myKey', 'myValue', {
    expirationTtl: 3600, // 1 hour
    metadata: { createdAt: Date.now() },
  });

  // List keys
  const listResult = await runtime.kv.list({ prefix: 'user:' });
  if (listResult.ok) {
    for (const key of listResult.value.keys) {
      runtime.console.log('Key:', key.name);
    }
  }

  // Delete key
  await runtime.kv.delete('myKey');
}
```

## Bootstrap Options

```typescript
export interface CloudflareBootstrapOptions {
  /**
   * Cloudflare Workers environment bindings
   * Pass the `env` parameter from your fetch handler
   */
  bindings?: Record<string, unknown>;

  /**
   * KV namespace binding (if available)
   * Example: env.MY_KV
   */
  kvNamespace?: any;

  /**
   * Capture unhandled errors
   * @default true
   */
  captureUncaughtErrors?: boolean;

  /**
   * Capture unhandled promise rejections
   * @default true
   */
  captureUnhandledRejections?: boolean;
}
```

## Cloudflare Workers Configuration

### wrangler.toml

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
API_KEY = "your-api-key"
DEBUG = "true"

[[kv_namespaces]]
binding = "MY_KV"
id = "your-kv-namespace-id"
```

### TypeScript Configuration

Your `tsconfig.json` should include Workers types:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "WebWorker"],
    "types": ["@cloudflare/workers-types"]
  }
}
```

## Limitations

Cloudflare Workers have specific constraints:

- **No filesystem**: Workers don't have filesystem access (use KV, R2, or Durable Objects)
- **No process info**: No pid, argv, etc. (edge runtime, not OS process)
- **No signals**: SIGINT/SIGTERM don't exist (use lifecycle handlers instead)
- **No MD5**: Web Crypto API doesn't support MD5 (use SHA-256)
- **Limited timers**: Long-running timers may not complete
- **Request timeout**: Workers have a CPU time limit (typically 50ms-30s depending on plan)
- **No streams**: stdin/stdout/stderr not available

## Differences from Other Runtimes

### vs Node.js
- No filesystem (use KV/R2 instead)
- No process info
- No streams
- Bindings instead of environment variables
- Request-scoped execution model

### vs Browser
- Similar Web APIs (fetch, crypto, etc.)
- KV storage instead of localStorage
- No window or DOM
- Request-scoped instead of page-scoped

### vs Deno
- No filesystem
- No process management
- Bindings instead of Deno.env
- More constrained runtime

## Testing

For testing, use the mock implementations from capability packages:

```typescript
import { createInMemoryEnv } from '@servicejs/capability-env';
import { createFakeTime } from '@servicejs/capability-time';
import { createMockHTTP } from '@servicejs/capability-http';
import { createDeterministicCrypto } from '@servicejs/capability-crypto';

// Create test runtime with mocks
const mockRuntime = {
  env: createInMemoryEnv({ API_KEY: 'test' }),
  time: createFakeTime(),
  http: createMockHTTP(),
  crypto: createDeterministicCrypto({ seed: 42 }),
  // ... other capabilities
};

// Test your application logic
```

For integration testing with wrangler:

```bash
# Run locally
wrangler dev

# Run tests
wrangler deploy --dry-run
```

## Example Application

```typescript
import { bootstrap } from '@servicejs/runtime-cloudflare';

interface Env {
  API_KEY: string;
  MY_KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const runtime = bootstrap({
      bindings: env,
      kvNamespace: env.MY_KV,
    });

    try {
      // Register cleanup
      runtime.lifecycle.onShutdown(async () => {
        runtime.console.log('Request processing complete');
      });

      // Parse request
      const url = new URL(request.url);
      const userId = url.searchParams.get('userId');

      if (!userId) {
        return new Response('Missing userId', { status: 400 });
      }

      // Check cache
      if (runtime.kv) {
        const cached = await runtime.kv.get(`user:${userId}`);
        if (cached.ok && cached.value) {
          runtime.console.log('Cache hit for user:', userId);
          return new Response(cached.value, {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // Fetch from API
      const apiKey = runtime.env.get('API_KEY').unwrapOr('');
      const response = await runtime.http.get(
        `https://api.example.com/users/${userId}`,
        { headers: { 'Authorization': `Bearer ${apiKey}` } }
      );

      if (!response.ok) {
        runtime.console.error('API request failed:', response.error);
        return new Response('Failed to fetch user', { status: 500 });
      }

      const userData = await response.value.json();
      const userJson = JSON.stringify(userData.value);

      // Cache the result
      if (runtime.kv) {
        await runtime.kv.put(`user:${userId}`, userJson, {
          expirationTtl: 3600, // 1 hour
        });
      }

      // Cleanup
      ctx.waitUntil(runtime.lifecycle.shutdown());

      return new Response(userJson, {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      runtime.console.error('Unexpected error:', error);
      ctx.waitUntil(runtime.lifecycle.shutdown());
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};
```

## License

MIT
