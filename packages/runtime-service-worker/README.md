# @servicejs/runtime-service-worker

Service Worker runtime for ServiceJS - offline-first web applications with explicit capabilities.

## Features

- **Environment**: Configuration via bootstrap options (no traditional env vars)
- **Time**: setTimeout/setInterval with Result types, performance.now() support
- **Lifecycle**: Minimal lifecycle (Service Workers have different lifecycle model)
- **Console**: All log levels via Service Worker console
- **HTTP**: Use native fetch (capability provided for compatibility)
- **Crypto**: Web Crypto API (random generation, timing-safe comparison)
- **Cache API**: Full Cache Storage API with Result types
- **Clients API**: Access to controlled clients

## Installation

```bash
npm add @servicejs/runtime-service-worker
```

## Usage

### Basic Service Worker

```typescript
import { bootstrap } from '@servicejs/runtime-service-worker';

const runtime = bootstrap({
  config: {
    API_URL: 'https://api.example.com',
    VERSION: '1.0.0',
  },
});

// Install event
self.addEventListener('install', (event) => {
  runtime.console.log('Service Worker installing...');

  event.waitUntil(
    (async () => {
      const cacheResult = await runtime.cache.open('v1');
      if (cacheResult.ok) {
        const cache = cacheResult.value;
        await cache.addAll([
          '/',
          '/styles/main.css',
          '/scripts/main.js',
        ]);
        runtime.console.log('Assets cached');
      }
    })()
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  runtime.console.log('Service Worker activating...');

  event.waitUntil(
    (async () => {
      // Clean up old caches
      const keysResult = await runtime.cache.keys();
      if (keysResult.ok) {
        const keys = keysResult.value;
        await Promise.all(
          keys
            .filter(key => key !== 'v1')
            .map(key => runtime.cache.delete(key))
        );
      }
    })()
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    (async () => {
      // Try cache first
      const cachedResult = await runtime.cache.match(event.request);
      if (cachedResult.ok && cachedResult.value) {
        return cachedResult.value;
      }

      // Fallback to network
      try {
        const response = await fetch(event.request);

        // Cache successful responses
        if (response.ok) {
          const cacheResult = await runtime.cache.open('v1');
          if (cacheResult.ok) {
            const cache = cacheResult.value;
            cache.put(event.request, response.clone());
          }
        }

        return response;
      } catch (error) {
        runtime.console.error('Fetch failed:', error);
        return new Response('Offline', { status: 503 });
      }
    })()
  );
});
```

## API

### ServiceWorkerRuntimeCapabilities

```typescript
interface ServiceWorkerRuntimeCapabilities {
  readonly env: EnvironmentCapability;
  readonly time: TimeCapability;
  readonly lifecycle: LifecycleCapability;
  readonly console: ConsoleCapability;
  readonly http: HTTPCapability; // Use native fetch instead
  readonly crypto: CryptoCapability;
  readonly cache: CacheCapability;
  readonly clients: Clients; // Native Service Worker Clients API
}
```

### Bootstrap Options

```typescript
interface ServiceWorkerBootstrapOptions {
  /**
   * Configuration object (Service Workers don't have environment variables)
   */
  config?: Record<string, string>;

  /**
   * Capture uncaught errors
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

## Capabilities

### Environment Capability

Service Workers don't have traditional environment variables. Use the config option:

```typescript
const runtime = bootstrap({
  config: {
    API_URL: 'https://api.example.com',
    VERSION: '1.0.0',
    DEBUG: 'true',
  },
});

const apiUrl = runtime.env.get('API_URL').unwrapOr('https://default.com');
const version = runtime.env.get('VERSION').unwrapOr('unknown');
const allConfig = runtime.env.getAll(); // All config values
const platform = runtime.env.platform(); // 'service-worker'
```

### Time Capability

```typescript
const now = runtime.time.now(); // Current timestamp
const highRes = runtime.time.highResolutionTime(); // Some(performance.now())

const timerId = runtime.time.setTimeout(() => {
  runtime.console.log('Timer fired!');
}, 1000);

if (timerId.ok) {
  const cancel = timerId.value;
  // Later: cancel();
}
```

### Lifecycle Capability

Service Workers have a different lifecycle model (install/activate/fetch events). The lifecycle capability is minimal:

```typescript
// No-op in Service Workers (use install/activate events instead)
runtime.lifecycle.onShutdown(() => {
  // This won't be called in Service Workers
});

runtime.console.log(runtime.lifecycle.isShuttingDown()); // Always false
```

### Console Capability

```typescript
runtime.console.log('Info message');
runtime.console.warn('Warning message');
runtime.console.error('Error message');
runtime.console.debug('Debug message');

// Logs appear in browser DevTools console
```

### HTTP Capability

For Service Workers, use native `fetch()` directly instead of the HTTP capability:

```typescript
// ✅ Recommended: Use native fetch
const response = await fetch('https://api.example.com/data');

// ❌ HTTP capability returns error (use fetch directly)
const result = await runtime.http.get('https://api.example.com/data');
// result.error.message === 'Use fetch directly in Service Worker'
```

### Crypto Capability

```typescript
// Random generation
const bytes = runtime.crypto.randomBytes(32).unwrap();
const uuid = runtime.crypto.randomUUID().unwrap();
const randomNum = runtime.crypto.randomInt(1, 100).unwrap();

// For hashing, use crypto.subtle directly
const data = new TextEncoder().encode('hello');
const hashBuffer = await crypto.subtle.digest('SHA-256', data);
const hashArray = new Uint8Array(hashBuffer);

// Timing-safe comparison
const equal = runtime.crypto.timingSafeEqual(
  new Uint8Array([1, 2, 3]),
  new Uint8Array([1, 2, 3])
).unwrap(); // true
```

### Cache Capability

Full Cache Storage API with Result types:

```typescript
// Open cache
const cacheResult = await runtime.cache.open('my-cache-v1');
if (cacheResult.ok) {
  const cache = cacheResult.value;

  // Add resources to cache
  await cache.add('/index.html');
  await cache.addAll(['/styles.css', '/script.js']);

  // Put specific response in cache
  const response = new Response('Hello', {
    headers: { 'Content-Type': 'text/plain' }
  });
  await cache.put('/hello', response);

  // Match request in cache
  const cached = await cache.match('/index.html');
  if (cached) {
    const html = await cached.text();
    runtime.console.log('Cached HTML:', html);
  }

  // Delete from cache
  await cache.delete('/old-file.js');
}

// Check if cache exists
const hasCache = await runtime.cache.has('my-cache-v1');
if (hasCache.ok && hasCache.value) {
  runtime.console.log('Cache exists');
}

// Delete cache
const deleted = await runtime.cache.delete('old-cache-v0');
if (deleted.ok && deleted.value) {
  runtime.console.log('Old cache deleted');
}

// List all caches
const keysResult = await runtime.cache.keys();
if (keysResult.ok) {
  runtime.console.log('All caches:', keysResult.value);
}

// Match across all caches
const matchResult = await runtime.cache.match('/index.html');
if (matchResult.ok && matchResult.value) {
  runtime.console.log('Found in cache');
}
```

### Clients API

Access to Service Worker clients (native API):

```typescript
// Get all clients
const clients = await runtime.clients.matchAll();
for (const client of clients) {
  runtime.console.log('Client:', client.url);
  client.postMessage({ type: 'update', version: '1.0.0' });
}

// Get specific client
const client = await runtime.clients.get(clientId);
if (client) {
  client.postMessage({ type: 'notification', message: 'Hello!' });
}

// Open window
const windowClient = await runtime.clients.openWindow('/');

// Claim clients
await runtime.clients.claim();
```

## Examples

### Offline-First Service Worker

```typescript
import { bootstrap } from '@servicejs/runtime-service-worker';

const runtime = bootstrap({
  config: {
    CACHE_NAME: 'app-v1',
  },
});

const CACHE_NAME = runtime.env.get('CACHE_NAME').unwrap();

// Install event - cache resources
self.addEventListener('install', (event) => {
  runtime.console.log('Installing Service Worker...');

  event.waitUntil(
    (async () => {
      const cacheResult = await runtime.cache.open(CACHE_NAME);
      if (cacheResult.ok) {
        const cache = cacheResult.value;
        await cache.addAll([
          '/',
          '/index.html',
          '/styles/main.css',
          '/scripts/main.js',
          '/images/logo.png',
        ]);
        runtime.console.log('Assets cached successfully');
      }
    })()
  );

  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  runtime.console.log('Activating Service Worker...');

  event.waitUntil(
    (async () => {
      const keysResult = await runtime.cache.keys();
      if (keysResult.ok) {
        await Promise.all(
          keysResult.value
            .filter(key => key !== CACHE_NAME)
            .map(key => {
              runtime.console.log('Deleting old cache:', key);
              return runtime.cache.delete(key);
            })
        );
      }

      await runtime.clients.claim();
      runtime.console.log('Service Worker activated');
    })()
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    (async () => {
      // Try cache first
      const cachedResult = await runtime.cache.match(event.request);
      if (cachedResult.ok && cachedResult.value) {
        runtime.console.log('Cache hit:', event.request.url);
        return cachedResult.value;
      }

      // Fetch from network
      try {
        runtime.console.log('Network fetch:', event.request.url);
        const response = await fetch(event.request);

        // Cache successful responses
        if (response.ok && event.request.method === 'GET') {
          const cacheResult = await runtime.cache.open(CACHE_NAME);
          if (cacheResult.ok) {
            const cache = cacheResult.value;
            cache.put(event.request, response.clone());
          }
        }

        return response;
      } catch (error) {
        runtime.console.error('Fetch failed:', error);

        // Return offline page
        const offlinePage = await runtime.cache.match('/offline.html');
        return offlinePage.ok && offlinePage.value
          ? offlinePage.value
          : new Response('Offline', { status: 503 });
      }
    })()
  );
});
```

### Background Sync

```typescript
// Register sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      (async () => {
        runtime.console.log('Syncing data...');

        try {
          const response = await fetch('/api/sync', {
            method: 'POST',
            body: JSON.stringify({ data: 'offline-data' }),
          });

          if (response.ok) {
            runtime.console.log('Sync successful');

            // Notify clients
            const clients = await runtime.clients.matchAll();
            clients.forEach(client => {
              client.postMessage({ type: 'sync-complete' });
            });
          }
        } catch (error) {
          runtime.console.error('Sync failed:', error);
        }
      })()
    );
  }
});
```

### Push Notifications

```typescript
// Push event
self.addEventListener('push', (event) => {
  let data = { title: 'Notification', body: 'You have a new message' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (error) {
      runtime.console.error('Failed to parse push data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/images/icon.png',
      badge: '/images/badge.png',
    })
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    runtime.clients.openWindow('/')
  );
});
```

### Message Passing with Clients

```typescript
// Listen for messages from clients
self.addEventListener('message', (event) => {
  runtime.console.log('Message from client:', event.data);

  if (event.data.type === 'skip-waiting') {
    self.skipWaiting();
  } else if (event.data.type === 'get-version') {
    event.ports[0].postMessage({ version: '1.0.0' });
  }
});

// Send messages to all clients
async function broadcastMessage(message: any) {
  const clients = await runtime.clients.matchAll({ includeUncontrolled: true });
  clients.forEach(client => {
    client.postMessage(message);
  });
}

// Usage in fetch event
self.addEventListener('fetch', (event) => {
  // ... fetch logic ...

  // Notify clients of cache update
  if (event.request.url.includes('/api/')) {
    broadcastMessage({ type: 'cache-updated', url: event.request.url });
  }
});
```

## Service Worker Limitations

Service Workers have specific constraints:

- **No filesystem**: Use Cache Storage instead
- **No environment variables**: Use config object in bootstrap
- **No stdin/stdout/stderr**: Not applicable in browser context
- **No process info**: Running in browser, not OS process
- **No signals**: Use install/activate/fetch events
- **Limited timers**: May not complete if Service Worker is terminated
- **Same-origin only**: Can only intercept requests for same origin

## Differences from Other Runtimes

### vs Browser Runtime
- Has Cache Storage API (browser doesn't expose it this way)
- Has Clients API (Service Worker specific)
- Runs in Service Worker context (different lifecycle)
- Can intercept network requests
- Can work offline

### vs Node.js Runtime
- No filesystem (use Cache Storage)
- No process info
- No streams
- Uses Web APIs
- Runs in browser background

### vs Web Worker Runtime
- Has Cache Storage API (Web Workers don't)
- Has fetch event interception
- Can control pages
- Can show notifications
- Different lifecycle (install/activate)

## Design Philosophy

This package follows ServiceJS's capability-based security model:

1. **No Ambient Authority** - Applications don't access Service Worker globals directly
2. **Explicit Grants** - All platform access is explicitly granted via bootstrap
3. **Testable** - Easy to substitute with mocks for deterministic tests
4. **Type Safe** - Full TypeScript support with Result types for error handling
5. **Platform Agnostic** - Same patterns work across all runtimes

## Testing

For testing Service Worker code, use the mock implementations:

```typescript
import { createInMemoryEnv } from '@servicejs/capability-env';
import { createFakeTime } from '@servicejs/capability-time';
import { createBufferedConsole } from '@servicejs/capability-console';

// Create test runtime with mocks
const mockRuntime = {
  env: createInMemoryEnv({ API_URL: 'https://test.com' }),
  time: createFakeTime(),
  console: createBufferedConsole(),
  // ... other capabilities
};

// Test your Service Worker logic
```

## License

MIT
