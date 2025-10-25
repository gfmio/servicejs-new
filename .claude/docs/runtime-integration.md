# Runtime Integration Guide

**Last Updated:** 2025-10-25

---

## Table of Contents

1. [Introduction](#introduction)
2. [How Runtime Capabilities Work](#how-runtime-capabilities-work)
3. [Platform Capability Mapping](#platform-capability-mapping)
4. [Choosing a Runtime](#choosing-a-runtime)
5. [Using Runtimes](#using-runtimes)
6. [Creating Custom Runtime Adapters](#creating-custom-runtime-adapters)
7. [Runtime-Specific Optimizations](#runtime-specific-optimizations)
8. [Testing Across Multiple Runtimes](#testing-across-multiple-runtimes)
9. [Deployment Considerations](#deployment-considerations)
10. [Migration Between Runtimes](#migration-between-runtimes)

---

## Introduction

ServiceJS provides **8 runtime packages** that wrap platform-specific APIs into a uniform capability interface. This enables:

- **Platform Agnostic Code**: Write once, run anywhere
- **Easy Testing**: Swap runtime for test implementations
- **Security**: No ambient authority - all platform access is explicit
- **Flexibility**: Switch runtimes without changing application code

**Available Runtimes:**
- `@servicejs/runtime-node` - Node.js (server-side)
- `@servicejs/runtime-deno` - Deno (server-side)
- `@servicejs/runtime-bun` - Bun (server-side)
- `@servicejs/runtime-browser` - Browser (client-side)
- `@servicejs/runtime-web-worker` - Web Worker (client-side)
- `@servicejs/runtime-shared-worker` - Shared Worker (client-side)
- `@servicejs/runtime-service-worker` - Service Worker (client-side, offline-first)
- `@servicejs/runtime-cloudflare` - Cloudflare Workers (edge)

---

## How Runtime Capabilities Work

### Architecture

```
┌─────────────────────────────────────────────────┐
│         Your Application Code                    │
│  (depends only on capability interfaces)        │
└─────────────────────────────────────────────────┘
                      │
                      │ Uses capability interfaces
                      ▼
┌─────────────────────────────────────────────────┐
│       Capability Interfaces                      │
│  @servicejs/capability-env                      │
│  @servicejs/capability-time                     │
│  @servicejs/capability-fs                       │
│  @servicejs/capability-http                     │
│  ... etc                                        │
└─────────────────────────────────────────────────┘
                      │
                      │ Implemented by
                      ▼
┌─────────────────────────────────────────────────┐
│         Runtime Package                          │
│  @servicejs/runtime-node (or deno, bun, etc)   │
│  - Wraps platform-specific APIs                 │
│  - Provides bootstrap() function                │
│  - Returns all capabilities                      │
└─────────────────────────────────────────────────┘
                      │
                      │ Wraps
                      ▼
┌─────────────────────────────────────────────────┐
│         Platform APIs                            │
│  Node.js: process, fs, timers, etc             │
│  Deno: Deno.*, etc                              │
│  Browser: window, localStorage, etc             │
└─────────────────────────────────────────────────┘
```

### Key Concepts

1. **Capability Interfaces**: Platform-agnostic interfaces (e.g., `FileSystemCapability`)
2. **Runtime Adapters**: Platform-specific implementations (e.g., Node.js wraps `fs.promises`)
3. **Bootstrap Function**: Entry point that sets up all capabilities
4. **No Ambient Authority**: Application code can't access platform APIs directly

---

## Platform Capability Mapping

### Capabilities by Platform

| Capability | Node | Deno | Bun | Browser | Web Worker | Service Worker | Cloudflare |
|------------|------|------|-----|---------|------------|----------------|------------|
| **env** | ✅ `process.env` | ✅ `Deno.env` | ✅ `process.env` | ❌ N/A | ❌ N/A | ❌ N/A | ✅ `env` bindings |
| **time** | ✅ timers | ✅ timers | ✅ timers | ✅ timers | ✅ timers | ✅ timers | ✅ timers |
| **lifecycle** | ✅ signals | ✅ signals | ✅ signals | ✅ beforeunload | ✅ N/A | ✅ install/activate | ⚠️ Per-request |
| **fs** | ✅ `fs.promises` | ✅ `Deno.*` | ✅ `Bun.file` | ❌ N/A | ❌ N/A | ❌ N/A | ❌ N/A |
| **http** | ✅ `fetch` | ✅ `fetch` | ✅ `fetch` | ✅ `fetch` | ✅ `fetch` | ✅ `fetch` | ✅ `fetch` |
| **console** | ✅ `console` | ✅ `console` | ✅ `console` | ✅ `console` | ✅ `console` | ✅ `console` | ✅ `console` |
| **streams** | ✅ stdin/out/err | ✅ stdin/out/err | ✅ stdin/out/err | ❌ N/A | ❌ N/A | ❌ N/A | ❌ N/A |
| **crypto** | ✅ `crypto` | ✅ `crypto` | ✅ `crypto` | ✅ Web Crypto | ✅ Web Crypto | ✅ Web Crypto | ✅ Web Crypto |
| **storage** | ❌ N/A | ❌ N/A | ❌ N/A | ✅ localStorage | ⚠️ No DOM | ⚠️ No DOM | ⚠️ KV/R2/DO |
| **cache** | ❌ N/A | ❌ N/A | ❌ N/A | ✅ Cache API | ❌ N/A | ✅ Cache API | ⚠️ Cache API |

**Legend:**
- ✅ Fully supported
- ⚠️ Partially supported or different API
- ❌ Not applicable

### Platform-Specific Capabilities

Some runtimes provide unique capabilities:

**Node.js:**
```typescript
interface NodeRuntimeCapabilities extends BaseRuntimeCapabilities {
  process: NodeProcessCapability;  // pid, cwd, argv, platform, arch
}
```

**Browser:**
```typescript
interface BrowserRuntimeCapabilities extends BaseRuntimeCapabilities {
  window: WindowCapability;        // location, history, etc
  storage: StorageCapability;      // localStorage, sessionStorage
}
```

**Service Worker:**
```typescript
interface ServiceWorkerRuntimeCapabilities extends BaseRuntimeCapabilities {
  cache: CacheCapability;          // Cache Storage API
  clients: ClientsCapability;      // Client management
}
```

**Cloudflare:**
```typescript
interface CloudflareRuntimeCapabilities extends BaseRuntimeCapabilities {
  kv: KVNamespaceCapability;       // KV storage
  r2: R2BucketCapability;          // R2 object storage
  do: DurableObjectCapability;     // Durable Objects
}
```

---

## Choosing a Runtime

### Decision Matrix

```
┌─────────────────────────────────────────────────────────┐
│ Need file system access?                                 │
│ ├─ Yes → Node.js, Deno, or Bun                          │
│ └─ No → Browser or Edge runtime                         │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Need offline-first / PWA?                                │
│ ├─ Yes → Service Worker                                 │
│ └─ No → Continue                                         │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Need global state across tabs?                           │
│ ├─ Yes → Shared Worker                                  │
│ └─ No → Continue                                         │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Need background processing in browser?                   │
│ ├─ Yes → Web Worker                                     │
│ └─ No → Browser                                          │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Need edge deployment (CDN)?                              │
│ ├─ Yes → Cloudflare Workers                             │
│ └─ No → Continue                                         │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Server-side: Which runtime?                              │
│ ├─ Fast startup, modern → Bun                           │
│ ├─ Security, modern → Deno                              │
│ └─ Ecosystem, compatibility → Node.js                   │
└─────────────────────────────────────────────────────────┘
```

### Runtime Characteristics

| Runtime | Startup | Performance | Ecosystem | TypeScript | Security |
|---------|---------|-------------|-----------|------------|----------|
| Node.js | Medium | Good | ⭐⭐⭐⭐⭐ | Via tools | Permissive |
| Deno | Fast | Good | ⭐⭐⭐ | Built-in | Secure-by-default |
| Bun | Very Fast | Excellent | ⭐⭐⭐ | Built-in | Permissive |
| Browser | N/A | Good | ⭐⭐⭐⭐ | Via tools | Sandboxed |
| Cloudflare | Instant | Excellent | ⭐⭐⭐ | Built-in | Sandboxed |

---

## Using Runtimes

### Basic Usage

```typescript
// 1. Import the runtime
import { bootstrap } from '@servicejs/runtime-node';

// 2. Bootstrap to get capabilities
const runtime = bootstrap({
  captureShutdownSignals: true,
  signals: {
    SIGTERM: true,
    SIGINT: true,
    SIGUSR2: false,
  }
});

// 3. Use capabilities in your application
async function main() {
  // Read environment variable
  const portResult = runtime.env.get('PORT');
  const port = portResult.ok ? parseInt(portResult.value) : 3000;

  // Read configuration file
  const configResult = await runtime.fs.readFile('./config.json');
  if (!configResult.ok) {
    runtime.console.error('Failed to read config:', configResult.error);
    return;
  }

  // Set up shutdown handler
  runtime.lifecycle.onShutdown(async (signal) => {
    runtime.console.log(`Shutting down due to ${signal}`);
    // Clean up resources
  });

  // Start your application
  runtime.console.log(`Server listening on port ${port}`);
}

main();
```

### Platform-Specific Usage

**Node.js:**
```typescript
import { bootstrap } from '@servicejs/runtime-node';

const runtime = bootstrap({
  captureShutdownSignals: true,
  signals: { SIGTERM: true, SIGINT: true }
});

// Access Node-specific capabilities
console.log('Process ID:', runtime.process.pid());
console.log('Platform:', runtime.process.platform());
```

**Browser:**
```typescript
import { bootstrap } from '@servicejs/runtime-browser';

const runtime = bootstrap();

// Access browser-specific capabilities
const userAgent = runtime.window.navigator.userAgent;

// Use localStorage
runtime.storage.local.setItem('key', 'value');
```

**Service Worker:**
```typescript
import { bootstrap } from '@servicejs/runtime-service-worker';

const runtime = bootstrap();

// Cache assets
const cacheResult = await runtime.cache.open('v1');
if (cacheResult.ok) {
  await cacheResult.value.addAll([
    '/',
    '/styles.css',
    '/script.js'
  ]);
}
```

**Cloudflare:**
```typescript
import { bootstrap } from '@servicejs/runtime-cloudflare';

export default {
  async fetch(request: Request, env: any) {
    const runtime = bootstrap({ env });

    // Access KV storage
    const value = await runtime.kv.get('key');

    return new Response('Hello World');
  }
};
```

---

## Creating Custom Runtime Adapters

You can create your own runtime adapter for custom platforms:

```typescript
import type {
  EnvironmentCapability,
  TimeCapability,
  // ... other capabilities
} from '@servicejs/capability-*';

export interface MyRuntimeCapabilities {
  env: EnvironmentCapability;
  time: TimeCapability;
  // ... other capabilities
}

export function bootstrap(options?: MyBootstrapOptions): MyRuntimeCapabilities {
  return {
    env: createMyEnvCapability(),
    time: createMyTimeCapability(),
    // ... implement all capabilities
  };
}

// Implement each capability by wrapping platform APIs
function createMyEnvCapability(): EnvironmentCapability {
  return {
    platform: () => 'my-platform',
    get: (key) => {
      const value = MY_PLATFORM.env[key];
      return value !== undefined ? Some(value) : None();
    },
    getAll: () => Ok(MY_PLATFORM.env),
  };
}
```

### Adapter Requirements

1. **Implement all base capabilities**: env, time, lifecycle, console, crypto
2. **Use Result types**: Never throw, always return `Result<T, E>`
3. **Handle platform limitations**: Return appropriate errors if capability not available
4. **Document platform-specific behavior**: Note any differences from other runtimes
5. **Provide tests**: Test your adapter with the test suite
6. **Export bootstrap function**: Single entry point for initialization

---

## Runtime-Specific Optimizations

### Bun Optimizations

Bun provides faster file operations:

```typescript
// Standard approach (works everywhere)
const result = await runtime.fs.readFile('./file.txt');

// Bun-specific (optimized)
// The Bun runtime internally uses Bun.file() for better performance
// No code changes needed - optimization is automatic!
```

**What Bun runtime optimizes:**
- File reading: Uses `Bun.file()` instead of `fs.promises.readFile()`
- File writing: Uses `Bun.write()` for better performance
- Hashing: Uses `Bun.CryptoHasher` for MD5 (faster than Node.js crypto)

### Deno Optimizations

Deno has built-in TypeScript and web-standard APIs:

```typescript
// Deno runtime uses Deno namespace directly
const runtime = bootstrap();

// All operations use Deno.* under the hood
// - Deno.env for environment
// - Deno.readFile, Deno.writeFile for FS
// - Web Crypto API for crypto
```

### Service Worker Optimizations

Cache assets for offline use:

```typescript
const runtime = bootstrap();

// Cache all static assets
const cache = await runtime.cache.open('app-v1');
if (cache.ok) {
  await cache.value.addAll([
    '/',
    '/app.js',
    '/styles.css',
    '/images/logo.png'
  ]);
}

// Serve from cache, fall back to network
async function handleRequest(request: Request) {
  const cached = await runtime.cache.match(request);
  if (cached.ok && cached.value) {
    return cached.value;
  }

  const response = await fetch(request);
  if (response.ok) {
    cache.value.put(request, response.clone());
  }
  return response;
}
```

### Cloudflare Optimizations

Use edge storage for fast access:

```typescript
const runtime = bootstrap({ env });

// Use KV for fast reads (edge-replicated)
const userConfig = await runtime.kv.get('user:123:config');

// Use R2 for large objects
const file = await runtime.r2.get('uploads/file.pdf');

// Use Durable Objects for coordination
const roomDO = await runtime.do.get('chat-room-123');
```

---

## Testing Across Multiple Runtimes

### Strategy 1: Write Platform-Agnostic Code

```typescript
// app.ts - works on all platforms
export async function createApp(runtime: RuntimeCapabilities) {
  const port = runtime.env.get('PORT').unwrapOr('3000');

  runtime.lifecycle.onShutdown(async () => {
    runtime.console.log('Shutting down...');
  });

  // ... rest of app logic
}
```

```typescript
// node.ts
import { bootstrap } from '@servicejs/runtime-node';
import { createApp } from './app';

createApp(bootstrap());
```

```typescript
// deno.ts
import { bootstrap } from '@servicejs/runtime-deno';
import { createApp } from './app';

createApp(bootstrap());
```

### Strategy 2: Test with Multiple Runtimes

```typescript
// app.test.ts
import { describe, test } from 'bun:test';
import { createInMemoryEnv } from '@servicejs/capability-env';
import { createFakeTime } from '@servicejs/capability-time';
import { createInMemoryLifecycle } from '@servicejs/capability-lifecycle';
import { createApp } from './app';

describe('App', () => {
  test('initializes correctly', async () => {
    // Create test runtime with fake capabilities
    const runtime = {
      env: createInMemoryEnv({ PORT: '8080' }),
      time: createFakeTime(0),
      lifecycle: createInMemoryLifecycle(),
      console: createBufferedConsole(),
      // ... other capabilities
    };

    const app = await createApp(runtime);

    // Test app with fake runtime
    expect(app.port).toBe(8080);
  });
});
```

### Strategy 3: Integration Tests per Runtime

```bash
# Run tests on Node.js
bun test --runtime=node

# Run tests on Deno
deno test

# Run tests on Bun
bun test
```

---

## Deployment Considerations

### Node.js Deployment

**Recommended for:**
- Traditional servers
- Long-running processes
- Mature ecosystem needs

```bash
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --production
COPY . .
CMD ["node", "dist/index.js"]
```

### Deno Deployment

**Recommended for:**
- Security-conscious applications
- Modern TypeScript-first projects
- Deno Deploy edge platform

```bash
# Deploy to Deno Deploy
deno deploy --project=my-app main.ts
```

### Bun Deployment

**Recommended for:**
- Performance-critical applications
- Fast startup requirements
- Development simplicity

```bash
# Dockerfile
FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --production
COPY . .
CMD ["bun", "run", "src/index.ts"]
```

### Cloudflare Workers Deployment

**Recommended for:**
- Edge computing
- Global low-latency
- Serverless/FaaS

```bash
# Deploy to Cloudflare Workers
wrangler publish
```

### Browser/Worker Deployment

**Recommended for:**
- Client-side applications
- Progressive Web Apps (PWAs)
- Background processing

```html
<!-- Load as module -->
<script type="module">
  import { bootstrap } from '@servicejs/runtime-browser';
  const runtime = bootstrap();
  // ... use runtime
</script>
```

---

## Migration Between Runtimes

### Step 1: Ensure Code Uses Only Capabilities

```typescript
// ❌ Bad: Direct platform usage
import fs from 'fs';

function readConfig() {
  return fs.readFileSync('./config.json');
}
```

```typescript
// ✅ Good: Capability-based
function readConfig(fs: FileSystemCapability) {
  return fs.readFile('./config.json');
}
```

### Step 2: Abstract Runtime Bootstrap

```typescript
// runtime.ts - Abstract runtime creation
export type Runtime = NodeRuntime | DenoRuntime | BunRuntime;

export function createRuntime(): Runtime {
  // Detect runtime and bootstrap appropriately
  if (typeof Deno !== 'undefined') {
    return import('@servicejs/runtime-deno').then(m => m.bootstrap());
  } else if (typeof Bun !== 'undefined') {
    return import('@servicejs/runtime-bun').then(m => m.bootstrap());
  } else {
    return import('@servicejs/runtime-node').then(m => m.bootstrap());
  }
}
```

### Step 3: Test Migration

```typescript
// Test with multiple runtimes to ensure compatibility
describe('App (cross-runtime)', () => {
  for (const runtimeName of ['node', 'deno', 'bun']) {
    test(`works on ${runtimeName}`, async () => {
      const runtime = await createRuntimeForTest(runtimeName);
      const app = await createApp(runtime);
      expect(app).toBeDefined();
    });
  }
});
```

### Step 4: Update Build/Deploy

Update package.json, Dockerfile, or deployment configuration to use the new runtime.

---

## Summary

**Key Takeaways:**

1. **Runtime packages wrap platform APIs into uniform capabilities**
2. **Choose runtime based on deployment target and feature requirements**
3. **Write platform-agnostic code using capability interfaces**
4. **Test with fake capabilities for deterministic, fast tests**
5. **Leverage runtime-specific optimizations when available**
6. **Migration between runtimes requires only changing bootstrap code**

**Best Practices:**

- ✅ Depend on capability interfaces, not runtime packages
- ✅ Use appropriate runtime for your deployment platform
- ✅ Test with fake capabilities for unit tests
- ✅ Test with real runtime for integration tests
- ✅ Document runtime-specific behavior and limitations
- ✅ Provide fallbacks for missing capabilities

For runtime-specific documentation, see:
- `packages/runtime-node/README.md`
- `packages/runtime-deno/README.md`
- `packages/runtime-bun/README.md`
- `packages/runtime-browser/README.md`
- `packages/runtime-web-worker/README.md`
- `packages/runtime-service-worker/README.md`
- `packages/runtime-cloudflare/README.md`
