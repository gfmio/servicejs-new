# @servicejs/runtime-bun

Bun runtime for ServiceJS - complete Bun platform integration as explicit capabilities.

## Features

- **Environment**: Access to process.env with Option types, Bun version info
- **Time**: setTimeout/setInterval with Result types, performance.now() support
- **Lifecycle**: Signal handling (SIGTERM, SIGINT, SIGUSR2), graceful shutdown
- **Console**: All log levels via Bun console
- **Filesystem**: Bun.file API for optimized file operations
- **HTTP**: Fetch API with Result types
- **Crypto**: Web Crypto API + Bun.CryptoHasher for MD5 support
- **Streams**: stdin, stdout, stderr with Result types
- **Process**: pid, argv, cwd, platform, arch, version, exit, chdir

## Installation

```bash
bun add @servicejs/runtime-bun
```

## Usage

### Basic Example

```typescript
import { bootstrap } from '@servicejs/runtime-bun';

const runtime = bootstrap({
  captureShutdownSignals: true,
  signals: ['SIGTERM', 'SIGINT'],
  captureUncaughtErrors: true,
  captureUnhandledRejections: true,
});

// Use capabilities
const apiKey = runtime.env.get('API_KEY').unwrapOr('default');
runtime.console.log('Starting application...', { apiKey });

// Filesystem operations (using Bun's optimized APIs)
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
runtime.console.log('Bun version:', runtime.process.version);
runtime.console.log('Platform:', runtime.process.platform);
```

## API

### BunRuntimeCapabilities

```typescript
interface BunRuntimeCapabilities {
  readonly env: EnvironmentCapability;
  readonly time: TimeCapability;
  readonly lifecycle: LifecycleCapability;
  readonly console: ConsoleCapability;
  readonly fs: FilesystemCapability;
  readonly http: HTTPCapability;
  readonly streams: StreamsCapability;
  readonly crypto: CryptoCapability;
  readonly process: BunProcessCapability;
}
```

### Bootstrap Options

```typescript
interface BunBootstrapOptions {
  /**
   * Capture shutdown signals for graceful shutdown
   * @default true
   */
  captureShutdownSignals?: boolean;

  /**
   * Which signals to capture
   * @default ['SIGTERM', 'SIGINT']
   */
  signals?: ('SIGTERM' | 'SIGINT' | 'SIGUSR2')[];

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
const platform = runtime.env.platform(); // Returns 'bun'
const version = runtime.env.version; // Bun version, e.g., '1.0.15'
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

// Or wait for SIGTERM/SIGINT
```

### Console Capability

```typescript
runtime.console.log('Info message');
runtime.console.warn('Warning message');
runtime.console.error('Error message');
runtime.console.debug('Debug message');
```

### Filesystem Capability

Bun runtime uses `Bun.file()` and `Bun.write()` APIs for optimized performance:

```typescript
// Read file (uses Bun.file API)
const fileResult = await runtime.fs.readFile('/path/to/file.txt', { encoding: 'utf8' });
if (fileResult.ok) {
  runtime.console.log('Content:', fileResult.value);
}

// Write file (uses Bun.write API)
await runtime.fs.writeFile('/path/to/output.txt', 'Hello World');

// Check if file exists (uses Bun.file().exists())
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
```

### Crypto Capability

Bun runtime uses Web Crypto API with `Bun.CryptoHasher` for MD5 support:

```typescript
// Random generation
const bytes = runtime.crypto.randomBytes(32).unwrap();
const uuid = runtime.crypto.randomUUID().unwrap();
const randomNum = runtime.crypto.randomInt(1, 100).unwrap();

// Hashing (supports MD5 via Bun.CryptoHasher, others via Web Crypto)
const md5 = await runtime.crypto.hash('md5', 'data', 'hex');
const sha256 = await runtime.crypto.hash('sha256', 'data', 'hex');
const sha512 = await runtime.crypto.hash('sha512', new Uint8Array([1, 2, 3]));

// HMAC (Web Crypto API)
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
```

### Process Capability

```typescript
// Process information
runtime.console.log('PID:', runtime.process.pid);
runtime.console.log('Arguments:', runtime.process.argv);
runtime.console.log('Working directory:', runtime.process.cwd);
runtime.console.log('Platform:', runtime.process.platform); // 'darwin', 'linux', 'win32'
runtime.console.log('Architecture:', runtime.process.arch); // 'x64', 'arm64'
runtime.console.log('Bun version:', runtime.process.version); // e.g., '1.0.15'

// Change directory
const chdirResult = runtime.process.chdir('/new/directory');
if (chdirResult.ok) {
  runtime.console.log('Changed to:', runtime.process.cwd);
}

// Exit process
runtime.process.exit(0);
```

## Examples

### Complete Application

```typescript
import { bootstrap } from '@servicejs/runtime-bun';

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

  // Save results (uses Bun.write for fast I/O)
  await runtime.fs.writeFile(
    './results.json',
    JSON.stringify(data.value, null, 2)
  );

  runtime.console.log('Done!');
}

// Graceful shutdown
runtime.lifecycle.onShutdown(async (signal) => {
  runtime.console.log('Cleaning up...', { signal: signal.signal });
});

main().catch((error) => {
  runtime.console.error('Fatal error:', error);
  runtime.process.exit(1);
});
```

### Fast File Operations with Bun

Bun's file APIs are optimized for performance:

```typescript
// Read file (uses Bun.file)
const content = await runtime.fs.readFile('./large-file.json', { encoding: 'utf8' });

// Write file (uses Bun.write)
await runtime.fs.writeFile('./output.json', JSON.stringify(data));

// Bun automatically handles binary data efficiently
const binary = await runtime.fs.readFile('./image.png', { encoding: 'binary' });
```

### MD5 Hashing with Bun.CryptoHasher

Bun provides MD5 support via `Bun.CryptoHasher`:

```typescript
// MD5 hash (uses Bun.CryptoHasher)
const md5Hash = await runtime.crypto.hash('md5', 'password123', 'hex');
runtime.console.log('MD5:', md5Hash);

// SHA-256 (uses Web Crypto API)
const sha256Hash = await runtime.crypto.hash('sha256', 'password123', 'hex');
runtime.console.log('SHA-256:', sha256Hash);

// Password hashing example
async function hashPassword(password: string): Promise<string> {
  const salt = runtime.crypto.randomBytes(16).unwrap();
  const saltHex = Array.from(salt)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const hash = await runtime.crypto.hash('md5', `${saltHex}:${password}`, 'hex');

  if (hash.ok) {
    return `${saltHex}:${hash.value}`;
  }

  throw new Error('Failed to hash password');
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

## Bun-Specific Optimizations

This runtime leverages Bun's optimized APIs:

1. **`Bun.file()`** - Fast file reading with automatic buffering
2. **`Bun.write()`** - Optimized file writing
3. **`Bun.CryptoHasher`** - Native MD5 support (not available in Web Crypto)
4. **`performance.now()`** - High-resolution timestamps
5. **`Bun.version`** - Runtime version information

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

### vs Node.js Runtime
- Uses `Bun.file()` and `Bun.write()` for filesystem (faster)
- Uses `Bun.CryptoHasher` for MD5 (Node uses crypto module)
- Has `Bun.version` instead of `process.version`
- Same Result/Option types
- Same capability-based architecture

### vs Browser Runtime
- Has filesystem access (browser doesn't)
- Has streams (stdin/stdout/stderr)
- Has process information
- Can capture OS signals
- Supports MD5 hashing

### vs Deno Runtime
- Similar APIs but uses Bun-specific optimizations
- Both use Web Crypto API (with Bun adding MD5)
- Bun doesn't require `--allow-*` permissions
- Same capability patterns

## Why Use Bun Runtime?

1. **Performance** - Bun's optimized APIs for file I/O and crypto
2. **Compatibility** - Drop-in replacement for Node.js applications
3. **Modern** - Built on modern web standards (Fetch, Web Crypto)
4. **Fast Startup** - Bun starts applications quickly
5. **Native TS** - TypeScript support without compilation

## Design Philosophy

This package follows ServiceJS's capability-based security model:

1. **No Ambient Authority** - Applications don't access Bun globals directly
2. **Explicit Grants** - All platform access is explicitly granted via bootstrap
3. **Testable** - Easy to substitute with mocks for deterministic tests
4. **Type Safe** - Full TypeScript support with Result types for error handling
5. **Platform Agnostic** - Same patterns work across all runtimes

## License

MIT
