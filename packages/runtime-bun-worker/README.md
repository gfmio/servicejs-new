# @servicejs/runtime-bun-worker

Bun Worker runtime for ServiceJS - provides capability-based access to Bun worker environment using the Web Worker API.

## Overview

This package provides a ServiceJS runtime implementation for Bun workers. It enables you to run ServiceJS applications in isolated worker threads with full access to capabilities including file system, HTTP, crypto, and bidirectional communication with the main thread.

## Features

- 🔒 **Capability-based security** - Explicit capability injection, no ambient authority
- 🧵 **Worker isolation** - Run code in isolated worker contexts
- 📨 **Web Worker API** - Standard postMessage/onmessage communication
- 📁 **File system access** - Bun.file() and Bun.write() integration
- 🌐 **HTTP client** - Native fetch with proper error handling
- 🔐 **Cryptography** - Bun.CryptoHasher for hashing/HMAC
- ⚡ **Bun-optimized** - Leverages Bun's fast Worker implementation

## Installation

```bash
bun add @servicejs/runtime-bun-worker
```

## Usage

### Worker Thread

```typescript
// worker.ts
import { bootstrap } from '@servicejs/runtime-bun-worker';
import { isOk } from '@servicejs/result';

const runtime = bootstrap();

// Handle messages
runtime.self.onMessage(async (message) => {
  const uuid = runtime.crypto.randomUUID();
  if (isOk(uuid)) {
    runtime.self.postMessage({
      type: 'response',
      uuid: uuid.value,
      timestamp: runtime.time.now(),
    });
  }
});

// Send ready message
runtime.self.postMessage({ type: 'ready' });
```

### Main Thread

```typescript
// main.ts
const worker = new Worker('./worker.ts');

worker.onmessage = (event) => {
  console.log('From worker:', event.data);
};

worker.postMessage({ action: 'start' });
```

## API

### `bootstrap(options?: BunWorkerBootstrapOptions): BunWorkerRuntimeCapabilities`

Bootstraps the Bun worker runtime and returns all capabilities.

**Options:**
```typescript
interface BunWorkerBootstrapOptions {
  captureUncaughtErrors?: boolean;      // default: true
  captureUnhandledRejections?: boolean; // default: true
}
```

**Returns:**
```typescript
interface BunWorkerRuntimeCapabilities {
  readonly env: EnvironmentCapability;
  readonly time: TimeCapability;
  readonly lifecycle: LifecycleCapability;
  readonly console: ConsoleCapability;
  readonly http: HTTPCapability;
  readonly crypto: CryptoCapability;
  readonly fs: FilesystemCapability;
  readonly streams: StreamsCapability;
  readonly self: WorkerSelfCapability;
}
```

## Capabilities

### Environment Capability

```typescript
const runtime = bootstrap();

// Platform is always 'web-worker'
console.log(runtime.env.platform); // 'web-worker'

// Access environment variables
const value = runtime.env.get('NODE_ENV');
```

### Worker Self Capability

Communicate with the main thread:

```typescript
// Send message to main thread
const result = runtime.self.postMessage({ type: 'data', value: 123 });

// Listen for messages
const unsubscribe = runtime.self.onMessage((message) => {
  console.log('Received:', message);
});

// Close the worker
runtime.self.close();
```

### Filesystem Capability

```typescript
import { isOk } from '@servicejs/result';

// Write file
const writeResult = await runtime.fs.writeFile('/tmp/test.txt', 'content');

// Read file
const readResult = await runtime.fs.readFile('/tmp/test.txt');
if (isOk(readResult)) {
  console.log('Content:', readResult.value);
}

// List directory
const readdirResult = await runtime.fs.readdir('/tmp');
```

### HTTP Capability

```typescript
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

```typescript
// Generate UUID
const uuidResult = runtime.crypto.randomUUID();

// Generate random bytes
const bytesResult = runtime.crypto.randomBytes(32);

// Hash data (uses Bun.CryptoHasher)
const hashResult = await runtime.crypto.hash('sha256', 'data', 'hex');
```

### Time Capability

```typescript
// Current timestamp
const now = runtime.time.now();

// High resolution time
const hrTime = runtime.time.highResolutionTime();
```

### Lifecycle Capability

```typescript
const registerResult = runtime.lifecycle.onShutdown(async (signal) => {
  console.log('Shutting down:', signal.reason);
});
```

### Streams Capability

**Note:** stdin is not available in workers. stdout/stderr output to console.

```typescript
// stdout
await runtime.streams.stdout.writeLine('Hello World!');

// Check if TTY (always false in workers)
const isTTY = runtime.streams.stdout.isTTY(); // false

// stdin not available
const readResult = await runtime.streams.stdin.readLine();
// Returns error: 'stdin not available in worker threads'
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
- **02-file-operations.ts** - File system operations
- **03-http-requests.ts** - HTTP requests from workers

```bash
bun examples/01-basic-worker.ts
```

## Bun-Specific Features

### Optimized APIs

- **Bun.file()** - Fast file reads
- **Bun.write()** - Fast file writes
- **Bun.CryptoHasher** - Hardware-accelerated hashing
- **Web Worker API** - Bun's optimized Worker implementation

### Performance

Bun workers are optimized for:
- Fast startup times
- Efficient message passing (string and simple object fast paths)
- Low memory overhead

## Differences from Node.js Worker Runtime

| Feature | Node.js Worker | Bun Worker |
|---------|---------------|------------|
| API | parentPort | self (Web Worker) |
| Platform | 'node-worker' | 'web-worker' |
| Communication | parentPort.postMessage() | self.postMessage() |
| Worker Data | workerData | Not available |
| File API | fs/promises | Bun.file/Bun.write |
| Hashing | crypto.createHash() | Bun.CryptoHasher |

## Testing

```bash
bun test
```

Tests use actual Bun workers to ensure real-world behavior.

## Use Cases

- **Parallel processing** - CPU-intensive tasks in isolated threads
- **Background jobs** - Long-running tasks without blocking main thread
- **Isolated execution** - Run code with limited capabilities
- **Data processing** - ETL pipelines with worker pools

## TypeScript

Full TypeScript support with strict types:

```typescript
import type {
  BunWorkerRuntimeCapabilities,
  BunWorkerBootstrapOptions,
  WorkerSelfCapability,
  MessageError,
} from '@servicejs/runtime-bun-worker';
```

## License

MIT

## Related Packages

- [@servicejs/runtime-bun](../runtime-bun) - Main thread Bun runtime
- [@servicejs/runtime-node-worker](../runtime-node-worker) - Node.js worker runtime
- [@servicejs/capability-fs](../capability-fs) - Filesystem capability types
- [@servicejs/capability-http](../capability-http) - HTTP capability types
