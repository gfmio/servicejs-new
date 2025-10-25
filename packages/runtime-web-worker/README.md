# @servicejs/runtime-web-worker

Web Worker runtime for ServiceJS - browser worker thread integration as explicit capabilities.

## Features

- **Environment**: Configuration passed from main thread
- **Time**: setTimeout/setInterval with Result types, performance.now() support
- **Lifecycle**: Graceful shutdown handlers
- **Console**: All log levels via worker console
- **HTTP**: Fetch API with Result types
- **Crypto**: Web Crypto API (SHA-1/256/384/512, HMAC, random generation - no MD5)
- **Message Port**: Communication with main thread via postMessage

## Installation

```bash
npm add @servicejs/runtime-web-worker
```

## Usage

### Worker Script (worker.ts)

```typescript
import { bootstrap } from '@servicejs/runtime-web-worker';

// Bootstrap the runtime
const runtime = bootstrap({
  config: {}, // Will be populated via initial message from main thread
});

// Listen for messages from main thread
runtime.messagePort.onMessage(async (event) => {
  runtime.console.log('Received message:', event.data);

  const { type, payload } = event.data;

  if (type === 'config') {
    // Update configuration
    runtime.console.log('Updated config:', payload);
  } else if (type === 'process') {
    // Process data
    const result = await processData(runtime, payload);

    // Send result back to main thread
    runtime.messagePort.postMessage({
      type: 'result',
      payload: result,
    });
  } else if (type === 'shutdown') {
    // Graceful shutdown
    await runtime.lifecycle.shutdown();
    runtime.messagePort.close();
  }
});

async function processData(runtime: any, data: any) {
  // Use capabilities
  const response = await runtime.http.get('https://api.example.com/process');
  if (!response.ok) {
    return { error: response.error.message };
  }

  const apiData = await response.value.json();
  return { success: true, data: apiData.value };
}

// Signal ready
runtime.messagePort.postMessage({ type: 'ready' });
```

### Main Thread (main.ts)

```typescript
// Create worker
const worker = new Worker(new URL('./worker.ts', import.meta.url), {
  type: 'module',
});

// Send initial config
worker.postMessage({
  type: 'config',
  payload: { apiKey: 'secret', debug: 'true' },
});

// Listen for messages from worker
worker.addEventListener('message', (event) => {
  console.log('Message from worker:', event.data);

  if (event.data.type === 'ready') {
    // Worker is ready, send task
    worker.postMessage({
      type: 'process',
      payload: { id: 123, data: 'example' },
    });
  } else if (event.data.type === 'result') {
    console.log('Result:', event.data.payload);
  }
});

// Handle errors
worker.addEventListener('error', (event) => {
  console.error('Worker error:', event.message);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  worker.postMessage({ type: 'shutdown' });
  worker.terminate();
});
```

## Capabilities

### Environment Capability

Web Workers don't have access to environment variables. Use configuration passed from the main thread:

```typescript
const runtime = bootstrap({
  config: {
    API_KEY: 'secret',
    DEBUG: 'true',
  },
});

const apiKey = runtime.env.get('API_KEY').unwrapOr('default');
const debug = runtime.env.get('DEBUG').unwrapOr('false');
const allConfig = runtime.env.getAll();
const platform = runtime.env.platform(); // Returns 'web-worker'
```

### Time Capability

```typescript
const now = runtime.time.now(); // Current timestamp
const highRes = runtime.time.highResolutionTime(); // Some(performance.now())

const timerId = runtime.time.setTimeout(() => {
  runtime.console.log('Timer fired!');
}, 1000);

runtime.time.clearTimeout(timerId.unwrap());
```

### Lifecycle Capability

```typescript
runtime.lifecycle.onShutdown(async () => {
  runtime.console.log('Cleaning up worker...');
  // Cleanup logic here
});

// Trigger shutdown (e.g., when receiving shutdown message)
runtime.messagePort.onMessage(async (event) => {
  if (event.data.type === 'shutdown') {
    await runtime.lifecycle.shutdown();
    runtime.messagePort.close();
  }
});
```

### Console Capability

```typescript
runtime.console.log('Info message');
runtime.console.warn('Warning message');
runtime.console.error('Error message');
runtime.console.debug('Debug message');
```

Console output appears in the browser's developer console.

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

### Message Port Capability

```typescript
// Send message to main thread
runtime.messagePort.postMessage({ type: 'status', message: 'Processing...' });

// Send with transferable objects (e.g., ArrayBuffer)
const buffer = new ArrayBuffer(1024);
runtime.messagePort.postMessage(
  { type: 'data', buffer },
  [buffer] // Transfer ownership
);

// Listen for messages
const unsubscribe = runtime.messagePort.onMessage((event) => {
  runtime.console.log('Received:', event.data);
});

// Stop listening
unsubscribe();

// Close worker
runtime.messagePort.close();
```

## Bootstrap Options

```typescript
export interface WebWorkerBootstrapOptions {
  /**
   * Configuration passed from main thread
   * Use this instead of environment variables
   */
  config?: Record<string, string>;

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

## Common Patterns

### Request-Response Pattern

```typescript
// Worker
runtime.messagePort.onMessage(async (event) => {
  const { id, type, payload } = event.data;

  try {
    const result = await handleRequest(runtime, type, payload);
    runtime.messagePort.postMessage({ id, success: true, result });
  } catch (error: any) {
    runtime.messagePort.postMessage({ id, success: false, error: error.message });
  }
});

// Main Thread
let requestId = 0;
const pendingRequests = new Map();

function sendRequest(type, payload) {
  return new Promise((resolve, reject) => {
    const id = requestId++;
    pendingRequests.set(id, { resolve, reject });
    worker.postMessage({ id, type, payload });
  });
}

worker.addEventListener('message', (event) => {
  const { id, success, result, error } = event.data;
  const pending = pendingRequests.get(id);

  if (pending) {
    pendingRequests.delete(id);
    if (success) {
      pending.resolve(result);
    } else {
      pending.reject(new Error(error));
    }
  }
});
```

### Long-Running Background Tasks

```typescript
// Worker
const runtime = bootstrap();

runtime.messagePort.onMessage(async (event) => {
  if (event.data.type === 'start') {
    await runBackgroundTask(runtime);
  }
});

async function runBackgroundTask(runtime: any) {
  while (true) {
    // Fetch data periodically
    const response = await runtime.http.get('https://api.example.com/data');

    if (response.ok) {
      const data = await response.value.json();
      runtime.messagePort.postMessage({ type: 'update', data: data.value });
    }

    // Wait before next fetch
    await new Promise((resolve) => {
      runtime.time.setTimeout(resolve, 5000); // 5 seconds
    });
  }
}
```

### Parallel Processing

```typescript
// Main Thread: Distribute work across multiple workers
const workers = Array.from({ length: 4 }, () =>
  new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
);

async function processInParallel(items: any[]) {
  const chunkSize = Math.ceil(items.length / workers.length);
  const promises = workers.map((worker, index) => {
    const chunk = items.slice(index * chunkSize, (index + 1) * chunkSize);
    return new Promise((resolve) => {
      worker.addEventListener('message', (event) => {
        if (event.data.type === 'result') {
          resolve(event.data.payload);
        }
      });
      worker.postMessage({ type: 'process', payload: chunk });
    });
  });

  return Promise.all(promises);
}

// Worker
runtime.messagePort.onMessage(async (event) => {
  if (event.data.type === 'process') {
    const items = event.data.payload;
    const results = await Promise.all(items.map(processItem));
    runtime.messagePort.postMessage({ type: 'result', payload: results });
  }
});
```

## Limitations

Web Workers have specific constraints:

- **No DOM access**: Cannot manipulate the page (use message passing instead)
- **No localStorage/sessionStorage**: Not available in workers
- **No synchronous storage**: Use async APIs only
- **No window object**: Worker global scope is different
- **Limited APIs**: Some browser APIs unavailable in workers
- **No filesystem**: Like browsers, no filesystem access
- **No MD5**: Web Crypto API doesn't support MD5

## Differences from Other Runtimes

### vs Browser (Main Thread)
- No DOM/window access
- No localStorage/sessionStorage
- Message-based communication
- Runs on separate thread (true parallelism)

### vs Node.js
- No filesystem
- No process management
- Web APIs instead of Node APIs
- Message passing instead of IPC

### vs Cloudflare Workers
- Runs in browser, not edge
- No KV storage (use main thread + localStorage)
- True multi-threading (separate thread)

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

// Test your worker logic
```

## Example: Image Processing Worker

```typescript
// image-worker.ts
import { bootstrap } from '@servicejs/runtime-web-worker';

const runtime = bootstrap();

runtime.messagePort.onMessage(async (event) => {
  const { type, imageData } = event.data;

  if (type === 'process') {
    runtime.console.log('Processing image...');

    // Simulate heavy processing
    const processed = await processImage(imageData);

    // Send result back (transferring the ArrayBuffer for efficiency)
    runtime.messagePort.postMessage(
      { type: 'result', imageData: processed },
      [processed.buffer]
    );
  }
});

async function processImage(imageData: ImageData): Promise<ImageData> {
  // Heavy image processing logic
  const processed = new ImageData(imageData.width, imageData.height);

  for (let i = 0; i < imageData.data.length; i += 4) {
    // Apply some transformation
    processed.data[i] = 255 - imageData.data[i];     // R
    processed.data[i + 1] = 255 - imageData.data[i + 1]; // G
    processed.data[i + 2] = 255 - imageData.data[i + 2]; // B
    processed.data[i + 3] = imageData.data[i + 3];   // A
  }

  return processed;
}

runtime.messagePort.postMessage({ type: 'ready' });
```

```typescript
// main.ts
const worker = new Worker(new URL('./image-worker.ts', import.meta.url), {
  type: 'module',
});

// Get image data from canvas
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

// Send to worker
worker.postMessage({ type: 'process', imageData }, [imageData.data.buffer]);

// Receive result
worker.addEventListener('message', (event) => {
  if (event.data.type === 'result') {
    ctx.putImageData(event.data.imageData, 0, 0);
  }
});
```

## License

MIT
