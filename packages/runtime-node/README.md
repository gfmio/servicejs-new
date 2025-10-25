# @servicejs/runtime-node

Node.js runtime for ServiceJS - complete Node.js platform integration as explicit capabilities.

## Features

- **Environment**: Access to process.env with Option types
- **Time**: setTimeout/setInterval with Result types, process.hrtime() support
- **Lifecycle**: Signal handling (SIGINT, SIGTERM, SIGUSR2), graceful shutdown
- **Console**: All log levels via Node.js console
- **Filesystem**: Complete Node.js filesystem API (readFile, writeFile, stat, readdir, etc.)
- **HTTP**: Fetch API with Result types
- **Crypto**: Node.js crypto module (MD5, SHA-1/256/384/512, HMAC, random generation)
- **Streams**: stdin, stdout, stderr with Result types
- **Process**: pid, ppid, argv, cwd, platform, arch, exit, chdir
- **Worker Threads**: Message passing between main thread and workers

## Installation

```bash
bun add @servicejs/runtime-node
```

## Usage

### Basic Example

```typescript
import { bootstrap } from '@servicejs/runtime-node';

const runtime = bootstrap({
  captureShutdownSignals: true,
  captureUncaughtErrors: true,
  captureUnhandledRejections: true,
});

// Use capabilities
const apiKey = runtime.env.get('API_KEY').unwrapOr('default');
runtime.console.log('Starting application...', { apiKey });

// Filesystem operations
const configResult = await runtime.fs.readFile('./config.json', { encoding: 'utf8' });
if (configResult.ok) {
  const config = JSON.parse(configResult.value as string);
  runtime.console.log('Config loaded:', config);
}

// HTTP requests
const response = await runtime.http.get('https://api.example.com/data');
if (response.ok) {
  const data = await response.value.json();
  runtime.console.log('Data fetched:', data);
}

// Graceful shutdown
runtime.lifecycle.onShutdown(async (signal) => {
  runtime.console.log('Shutting down...', { reason: signal.reason });
  // Cleanup resources
});

// Process info
runtime.console.log('Process ID:', runtime.process.pid);
runtime.console.log('Platform:', runtime.process.platform);
runtime.console.log('Architecture:', runtime.process.arch);
```

## API

### NodeRuntimeCapabilities

```typescript
interface NodeRuntimeCapabilities {
  readonly env: EnvironmentCapability;
  readonly time: TimeCapability;
  readonly lifecycle: LifecycleCapability;
  readonly console: ConsoleCapability;
  readonly fs: FilesystemCapability;
  readonly http: HTTPCapability;
  readonly streams: StreamsCapability;
  readonly crypto: CryptoCapability;
  readonly process: NodeProcessCapability;
  readonly worker?: WorkerThreadCapability; // Only in worker threads
}
```

### Bootstrap Options

```typescript
interface NodeBootstrapOptions {
  /**
   * Capture shutdown signals for graceful shutdown
   * @default true
   */
  captureShutdownSignals?: boolean;

  /**
   * Which signals to capture
   * @default { SIGTERM: true, SIGINT: true, SIGUSR2: true }
   */
  signals?: Partial<Record<NodeJS.Signals, boolean>>;

  /**
   * Capture uncaught exceptions
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

```typescript
const nodeEnv = runtime.env.get('NODE_ENV').unwrapOr('development');
const allEnv = runtime.env.getAll(); // Returns frozen object
const platform = runtime.env.platform(); // Returns 'node'
const version = runtime.env.version; // e.g., 'v20.10.0'
```

### Time Capability

```typescript
const now = runtime.time.now(); // Current timestamp
const highRes = runtime.time.hrtime(); // High-resolution time in nanoseconds

const timerId = runtime.time.setTimeout(() => {
  runtime.console.log('Timer fired!');
}, 1000);

if (timerId.ok) {
  const cancel = timerId.value;
  // Later: cancel();
}
```

### Lifecycle Capability

Signal handlers are automatically registered based on bootstrap options:

```typescript
runtime.lifecycle.onShutdown(async (signal) => {
  // Cleanup database connections
  await db.close();
  // Save state
  await runtime.fs.writeFile('./state.json', JSON.stringify(state));
});

// Manually trigger shutdown
await runtime.lifecycle.shutdown('Manual shutdown');

// Or wait for SIGINT (Ctrl+C), SIGTERM, etc.
```

### Console Capability

```typescript
runtime.console.log('Info message');
runtime.console.warn('Warning message');
runtime.console.error('Error message');
runtime.console.debug('Debug message');
```

### Filesystem Capability

```typescript
// Read file
const fileResult = await runtime.fs.readFile('/path/to/file.txt', { encoding: 'utf8' });
if (fileResult.ok) {
  runtime.console.log('Content:', fileResult.value);
}

// Write file with parent directory creation
await runtime.fs.writeFile('/path/to/output.txt', 'Hello World', {
  encoding: 'utf8',
  createDirs: true, // Creates parent directories if they don't exist
});

// Check if file exists
const exists = await runtime.fs.exists('/path/to/file.txt');

// Get file stats
const statResult = await runtime.fs.stat('/path/to/file.txt');
if (statResult.ok) {
  runtime.console.log('File size:', statResult.value.size);
  runtime.console.log('Is directory:', statResult.value.isDirectory);
  runtime.console.log('Modified at:', new Date(statResult.value.modifiedAt));
}

// Read directory
const entries = await runtime.fs.readdir('/path/to/directory');
if (entries.ok) {
  for (const entry of entries.value) {
    runtime.console.log(`${entry.name} (${entry.isDirectory ? 'dir' : 'file'})`);
  }
}

// Create directory
await runtime.fs.mkdir('/path/to/new/directory', { recursive: true });

// Remove file or directory
await runtime.fs.remove('/path/to/file.txt');
await runtime.fs.remove('/path/to/directory', { recursive: true });
```

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
  {
    body: JSON.stringify({ name: 'Alice' }),
    headers: { 'Content-Type': 'application/json' }
  }
);

// Other methods
await runtime.http.put(url, options);
await runtime.http.patch(url, options);
await runtime.http.delete(url, options);
await runtime.http.head(url, options);

// With abort controller
const controller = new AbortController();
const result = await runtime.http.get(url, {
  signal: controller.signal
});

// Cancel request
controller.abort();
```

### Crypto Capability

```typescript
// Random generation
const bytes = runtime.crypto.randomBytes(32).unwrap();
const uuid = runtime.crypto.randomUUID().unwrap();
const randomNum = runtime.crypto.randomInt(1, 100).unwrap();

// Hashing (supports MD5, SHA-1, SHA-256, SHA-384, SHA-512)
const md5 = await runtime.crypto.hash('md5', 'data', 'hex');
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

### Streams Capability

```typescript
// Read from stdin
const line = await runtime.streams.stdin.readLine();
if (line.ok) {
  runtime.console.log('You entered:', line.value);
}

// Read all stdin
const allInput = await runtime.streams.stdin.readAll();

// Check if TTY
if (runtime.streams.stdin.isTTY()) {
  runtime.console.log('Running in interactive terminal');
}

// Write to stdout
await runtime.streams.stdout.write('Hello ');
await runtime.streams.stdout.writeLine('World!');

// Write to stderr
await runtime.streams.stderr.writeLine('Error message');

// Check stdout/stderr TTY status
if (runtime.streams.stdout.isTTY()) {
  // Can use colors, etc.
}
```

### Process Capability

```typescript
// Process information
runtime.console.log('PID:', runtime.process.pid);
runtime.console.log('Parent PID:', runtime.process.ppid);
runtime.console.log('Arguments:', runtime.process.argv);
runtime.console.log('Working directory:', runtime.process.cwd);
runtime.console.log('Platform:', runtime.process.platform); // 'darwin', 'linux', 'win32'
runtime.console.log('Architecture:', runtime.process.arch); // 'x64', 'arm64'

// Change directory
const chdirResult = runtime.process.chdir('/new/directory');
if (chdirResult.ok) {
  runtime.console.log('Changed to:', runtime.process.cwd);
}

// Exit process
runtime.process.exit(0);
```

### Worker Thread Capability

Available only when running in a worker thread:

```typescript
// In worker thread
if (runtime.worker) {
  // Send message to parent
  const result = runtime.worker.postMessage({ type: 'result', data: 42 });

  // Receive messages from parent
  const unsubscribe = runtime.worker.onMessage((message) => {
    runtime.console.log('Received from parent:', message);

    if (message.type === 'stop') {
      runtime.worker?.terminate();
    }
  });

  // Later: unsubscribe()

  runtime.console.log('Thread ID:', runtime.worker.threadId);
  runtime.console.log('Is main thread:', runtime.worker.isMainThread); // false
}
```

## Examples

### Complete Application

```typescript
import { bootstrap } from '@servicejs/runtime-node';

const runtime = bootstrap();

async function main() {
  // Load configuration
  const configResult = await runtime.fs.readFile('./config.json', { encoding: 'utf8' });
  if (!configResult.ok) {
    runtime.console.error('Failed to load config:', configResult.error.message);
    runtime.process.exit(1);
  }

  const config = JSON.parse(configResult.value as string);

  // Fetch data
  const response = await runtime.http.get(config.apiUrl);
  if (!response.ok) {
    runtime.console.error('API request failed:', response.error.message);
    runtime.process.exit(1);
  }

  const data = await response.value.json();
  runtime.console.log('Received data:', data);

  // Save results
  await runtime.fs.writeFile(
    './results.json',
    JSON.stringify(data.value, null, 2),
    { createDirs: true }
  );

  runtime.console.log('Done!');
}

// Graceful shutdown
runtime.lifecycle.onShutdown(async (signal) => {
  runtime.console.log('Cleaning up...', { signal: signal.signal });
  // Close connections, save state, etc.
});

main().catch((error) => {
  runtime.console.error('Fatal error:', error);
  runtime.process.exit(1);
});
```

### Signal Handling

```typescript
const runtime = bootstrap({
  captureShutdownSignals: true,
  signals: {
    SIGTERM: true,  // Graceful shutdown
    SIGINT: true,   // Ctrl+C
    SIGUSR2: false, // Disable USR2
  },
});

runtime.lifecycle.onShutdown(async (signal) => {
  runtime.console.log(`Received signal: ${signal.signal}`);

  if (signal.signal === 'SIGTERM') {
    // Graceful shutdown with cleanup
    await gracefulShutdown();
  } else if (signal.signal === 'SIGINT') {
    // User interrupt
    await quickShutdown();
  }
});

// Process will exit after handlers complete
```

### File Operations

```typescript
// Copy file
async function copyFile(src: string, dest: string) {
  const content = await runtime.fs.readFile(src, { encoding: 'binary' });
  if (!content.ok) {
    runtime.console.error('Read failed:', content.error);
    return;
  }

  const writeResult = await runtime.fs.writeFile(dest, content.value, {
    encoding: 'binary',
    createDirs: true,
  });

  if (writeResult.ok) {
    runtime.console.log(`Copied ${src} to ${dest}`);
  }
}

// List directory recursively
async function listRecursive(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await runtime.fs.readdir(dir);

  if (!entries.ok) return files;

  for (const entry of entries.value) {
    const fullPath = `${dir}/${entry.name}`;

    if (entry.isDirectory) {
      const subFiles = await listRecursive(fullPath);
      files.push(...subFiles);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}
```

### HTTP with Error Handling

```typescript
async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await runtime.http.get(url);

    if (response.ok) {
      return response;
    }

    runtime.console.warn(`Request failed (attempt ${i + 1}/${maxRetries}):`, response.error);

    if (i < maxRetries - 1) {
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts`);
}
```

### Cryptographic Operations

```typescript
// Hash password
async function hashPassword(password: string): Promise<string> {
  const salt = runtime.crypto.randomBytes(16).unwrap();
  const saltHex = Array.from(salt)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const hash = await runtime.crypto.hmac('sha256', saltHex, password, 'hex');

  if (hash.ok) {
    return `${saltHex}:${hash.value}`;
  }

  throw new Error('Failed to hash password');
}

// Verify password
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, expectedHash] = stored.split(':');

  const hash = await runtime.crypto.hmac('sha256', salt, password, 'hex');

  if (!hash.ok) return false;

  const equal = runtime.crypto.timingSafeEqual(hash.value, expectedHash);

  return equal.ok ? equal.value : false;
}
```

### Interactive CLI

```typescript
async function askQuestion(question: string): Promise<string> {
  await runtime.streams.stdout.write(question + ' ');

  const answer = await runtime.streams.stdin.readLine();

  if (answer.ok) {
    return answer.value;
  }

  throw new Error('Failed to read input');
}

async function main() {
  runtime.console.log('Interactive CLI Example\n');

  const name = await askQuestion('What is your name?');
  const age = await askQuestion('How old are you?');

  runtime.console.log(`\nHello, ${name}! You are ${age} years old.`);
}
```

## Error Handling

All capability methods return `Result<T, E>` types:

```typescript
import { isOk, isErr } from '@servicejs/result';

const result = await runtime.fs.readFile('/path/to/file.txt');

if (isOk(result)) {
  console.log('Success:', result.value);
} else {
  console.error('Error:', result.error.code, result.error.message);
}
```

### Error Codes

Different capabilities have different error codes. See individual capability packages for details:

- `FilesystemError`: NOT_FOUND, PERMISSION_DENIED, NOT_A_FILE, READ_ERROR, etc.
- `HTTPError`: NETWORK_ERROR, INVALID_URL, ABORTED, INVALID_RESPONSE
- `CryptoError`: INVALID_LENGTH, INVALID_ALGORITHM, INVALID_DATA, OPERATION_FAILED
- `StreamError`: READ_ERROR, WRITE_ERROR
- `ProcessError`: INVALID_DIRECTORY, PERMISSION_DENIED

## Testing

For testing, use the mock implementations from capability packages:

```typescript
import { createInMemoryEnv } from '@servicejs/capability-env';
import { createFakeTime } from '@servicejs/capability-time';
import { createInMemoryLifecycle } from '@servicejs/capability-lifecycle';
import { createBufferedConsole } from '@servicejs/capability-console';
import { createInMemoryFS } from '@servicejs/capability-fs';
import { createMockHTTP } from '@servicejs/capability-http';

// Create test runtime with mocks
const mockRuntime = {
  env: createInMemoryEnv({ API_KEY: 'test' }),
  time: createFakeTime(),
  lifecycle: createInMemoryLifecycle(),
  console: createBufferedConsole(),
  fs: createInMemoryFS({ '/config.json': '{"key": "value"}' }),
  http: createMockHTTP(),
  // ...other capabilities
};

// Test your application with deterministic behavior
```

## Differences from Other Runtimes

### vs Browser Runtime
- Has filesystem access (browser doesn't)
- Has streams (stdin/stdout/stderr)
- Has process information
- Can capture OS signals
- Has Node.js crypto (includes MD5)

### vs Deno Runtime
- Uses process.env (Deno uses Deno.env)
- Uses Node.js fs module (Deno has different APIs)
- Same Result/Option types
- Same capability-based architecture

### vs Cloudflare Runtime
- Has filesystem (Workers don't)
- Has process info (Workers don't)
- Has streams (Workers don't)
- Can run indefinitely (Workers have time limits)

## Design Philosophy

This package follows ServiceJS's capability-based security model:

1. **No Ambient Authority** - Applications don't access Node.js globals directly
2. **Explicit Grants** - All platform access is explicitly granted via bootstrap
3. **Testable** - Easy to substitute with mocks for deterministic tests
4. **Type Safe** - Full TypeScript support with Result types for error handling
5. **Platform Agnostic** - Same patterns work across all runtimes

## License

MIT
