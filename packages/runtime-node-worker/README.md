# @servicejs/runtime-node-worker

Node.js Worker Threads runtime for ServiceJS - provides capability-based access to worker_threads environment.

## Overview

This package provides a ServiceJS runtime implementation for Node.js worker threads (`worker_threads` module). It enables you to run ServiceJS applications in isolated worker threads with full access to capabilities including file system, HTTP, crypto, and bidirectional communication with the main thread.

## Features

- 🔒 **Capability-based security** - Explicit capability injection, no ambient authority
- 🧵 **Worker thread isolation** - Run code in isolated worker contexts
- 📨 **Bidirectional communication** - Message passing between main and worker threads
- 📁 **File system access** - Full filesystem capabilities in workers
- 🌐 **HTTP client** - Make HTTP requests from worker threads
- 🔐 **Cryptographic operations** - Secure random generation, hashing, HMAC
- ⏱️ **Time and lifecycle** - Timestamps and graceful shutdown handling
- 📊 **Environment access** - Read environment variables and worker data

## Installation

```bash
npm install @servicejs/runtime-node-worker
# or
bun add @servicejs/runtime-node-worker
```

## Usage

### Worker Thread

In your worker file, bootstrap the runtime and use capabilities:

```typescript
// worker.ts
import { bootstrap } from '@servicejs/runtime-node-worker';
import { isOk } from '@servicejs/result';

// Bootstrap the runtime
const runtime = bootstrap();

// Access environment (workerData)
const config = runtime.env.get('MY_CONFIG');
console.log('Platform:', runtime.env.platform); // 'node-worker'

// Handle messages from main thread
runtime.parentPort.onMessage(async (message) => {
  console.log('Received:', message);

  // Use capabilities
  const uuid = runtime.crypto.randomUUID();
  if (isOk(uuid)) {
    runtime.parentPort.postMessage({
      type: 'response',
      uuid: uuid.value,
      timestamp: runtime.time.now(),
    });
  }
});

// Send initial ready message
runtime.parentPort.postMessage({ type: 'ready' });
```

### Main Thread

In your main thread, create and communicate with the worker:

```typescript
// main.ts
import { Worker } from 'worker_threads';

const worker = new Worker('./worker.ts', {
  workerData: {
    MY_CONFIG: 'value',
  },
});

worker.on('message', (message) => {
  console.log('From worker:', message);
});

worker.postMessage({ action: 'start' });
```

## API

### `bootstrap(options?: NodeWorkerBootstrapOptions): NodeWorkerRuntimeCapabilities`

Bootstraps the Node.js worker runtime and returns all capabilities.

**Options:**

```typescript
interface NodeWorkerBootstrapOptions {
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

**Returns:**

```typescript
interface NodeWorkerRuntimeCapabilities {
  readonly env: EnvironmentCapability;
  readonly time: TimeCapability;
  readonly lifecycle: LifecycleCapability;
  readonly console: ConsoleCapability;
  readonly http: HTTPCapability;
  readonly crypto: CryptoCapability;
  readonly fs: FilesystemCapability;
  readonly streams: StreamsCapability;
  readonly parentPort: ParentPortCapability;
}
```

## Capabilities

### Environment Capability

Access environment variables and worker data:

```typescript
const runtime = bootstrap();

// Get workerData passed from main thread
const config = runtime.env.get('CONFIG_KEY');

// Platform is always 'node-worker'
console.log(runtime.env.platform); // 'node-worker'

// Get all environment
const allVars = runtime.env.getAll();
```

### ParentPort Capability

Communicate with the main thread:

```typescript
// Send message to main thread
const result = runtime.parentPort.postMessage({ type: 'data', value: 123 });
if (isOk(result)) {
  console.log('Message sent');
}

// Listen for messages from main thread
const unsubscribe = runtime.parentPort.onMessage((message) => {
  console.log('Received:', message);
});

// Close the worker
runtime.parentPort.close();
```

### Filesystem Capability

Perform file operations:

```typescript
import { isOk } from '@servicejs/result';

// Write file
const writeResult = await runtime.fs.writeFile('/tmp/test.txt', 'content');
if (isOk(writeResult)) {
  console.log('File written');
}

// Read file
const readResult = await runtime.fs.readFile('/tmp/test.txt');
if (isOk(readResult)) {
  console.log('Content:', readResult.value);
}

// Check existence
const existsResult = await runtime.fs.exists('/tmp/test.txt');

// List directory
const readdirResult = await runtime.fs.readdir('/tmp');
if (isOk(readdirResult)) {
  for (const entry of readdirResult.value) {
    console.log(entry.name, entry.isFile ? 'file' : 'dir');
  }
}
```

### HTTP Capability

Make HTTP requests:

```typescript
import { isOk } from '@servicejs/result';

// GET request
const response = await runtime.http.get('https://api.example.com/data');
if (isOk(response)) {
  const jsonResult = await response.value.json();
  if (isOk(jsonResult)) {
    console.log('Data:', jsonResult.value);
  }
}

// POST request
const postResult = await runtime.http.post('https://api.example.com/items', {
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'test' }),
});
```

### Crypto Capability

Cryptographic operations:

```typescript
import { isOk } from '@servicejs/result';

// Generate UUID
const uuidResult = runtime.crypto.randomUUID();
if (isOk(uuidResult)) {
  console.log('UUID:', uuidResult.value);
}

// Generate random bytes
const bytesResult = runtime.crypto.randomBytes(32);
if (isOk(bytesResult)) {
  console.log('Random bytes:', bytesResult.value);
}

// Hash data
const hashResult = await runtime.crypto.hash('sha256', 'data', 'hex');
if (isOk(hashResult)) {
  console.log('Hash:', hashResult.value);
}
```

### Time Capability

```typescript
// Get current timestamp (milliseconds since epoch)
const now = runtime.time.now();
console.log('Timestamp:', now);

// Sleep (async delay)
await runtime.time.sleep(1000); // 1 second
```

### Lifecycle Capability

Handle shutdown gracefully:

```typescript
import { isOk } from '@servicejs/result';

const registerResult = runtime.lifecycle.onShutdown(async (signal) => {
  console.log('Shutting down:', signal.reason);
  // Cleanup resources
});

if (isOk(registerResult)) {
  const unregister = registerResult.value;
  // Later: unregister() to remove handler
}
```

### Console Capability

Logging output:

```typescript
runtime.console.log('Info message');
runtime.console.error('Error message');
runtime.console.warn('Warning message');
runtime.console.debug('Debug message');
```

### Streams Capability

**Note:** stdin is not available in worker threads. stdout and stderr output to console.

```typescript
// stdout
await runtime.streams.stdout.write('Hello ');
await runtime.streams.stdout.writeLine('World!');

// Check if TTY (always false in workers)
const isTTY = runtime.streams.stdout.isTTY(); // false

// stdin not available
const readResult = await runtime.streams.stdin.readLine();
// Returns error: 'stdin not available in worker threads'
```

## Worker Data vs Environment Variables

Workers can access both `workerData` passed from the main thread and process environment variables:

```typescript
// Main thread
const worker = new Worker('./worker.ts', {
  workerData: {
    CUSTOM_VAR: 'from-worker-data',
  },
});

// Worker thread
const runtime = bootstrap();

// Gets from workerData first, then process.env
const customVar = runtime.env.get('CUSTOM_VAR'); // 'from-worker-data'
const pathVar = runtime.env.get('PATH'); // from process.env
```

## Error Handling

All fallible operations return `Result<T, E>` types:

```typescript
import { isOk, isErr } from '@servicejs/result';

const result = await runtime.fs.readFile('/path/to/file');

if (isOk(result)) {
  console.log('Content:', result.value);
} else {
  console.error('Error:', result.error.code, result.error.message);
}
```

## Examples

See the [examples](./examples/) directory for complete working examples:

- **01-basic-worker.ts** - Basic worker communication
- **02-file-operations.ts** - File system operations in workers
- **03-http-requests.ts** - Making HTTP requests from workers

Run examples:

```bash
cd examples
bun 01-basic-worker.ts
bun 02-file-operations.ts
bun 03-http-requests.ts
```

## TypeScript

Full TypeScript support with strict types:

```typescript
import type {
  NodeWorkerRuntimeCapabilities,
  NodeWorkerBootstrapOptions,
  ParentPortCapability,
  MessageError,
} from '@servicejs/runtime-node-worker';
```

## Differences from Main Thread Runtime

| Feature | Main Thread | Worker Thread |
|---------|-------------|---------------|
| stdin | Available | Not available (returns error) |
| TTY detection | Real | Always false |
| Environment | process.env | workerData + process.env |
| Communication | N/A | ParentPort capability |
| Isolation | Shared context | Isolated context |

## Testing

```bash
bun test
```

Tests use actual worker threads to ensure real-world behavior.

## Use Cases

- **Parallel processing** - CPU-intensive tasks in isolated threads
- **Background jobs** - Long-running tasks without blocking main thread
- **Isolated execution** - Run untrusted code with limited capabilities
- **Microservices** - Worker threads as internal service boundaries
- **Data processing** - ETL pipelines with worker pools

## License

MIT

## Related Packages

- [@servicejs/runtime-node](../runtime-node) - Main thread Node.js runtime
- [@servicejs/runtime-bun](../runtime-bun) - Bun runtime
- [@servicejs/runtime-deno](../runtime-deno) - Deno runtime
- [@servicejs/capability-fs](../capability-fs) - Filesystem capability types
- [@servicejs/capability-http](../capability-http) - HTTP capability types
