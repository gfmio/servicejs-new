# @servicejs/runtime-deno

Deno runtime for ServiceJS - complete Deno platform integration as explicit capabilities.

## Features

- **Environment**: Deno.env access with Option types
- **Time**: setTimeout/setInterval with Result types, performance.now() support
- **Lifecycle**: Signal handling (SIGINT, SIGTERM), graceful shutdown
- **Console**: All log levels via Deno console
- **Filesystem**: Complete Deno filesystem API (readFile, writeFile, stat, readdir, etc.)
- **HTTP**: Fetch API with Result types
- **Crypto**: Web Crypto API (SHA-1/256/384/512, HMAC, random generation - no MD5)
- **Process**: pid, ppid, argv, cwd, platform, arch, exit, chdir

## Installation

```bash
# Using npm
npm add @servicejs/runtime-deno

# Using deno
import { bootstrap } from "https://deno.land/x/servicejs_runtime_deno/mod.ts";
```

## Usage

```typescript
import { bootstrap } from '@servicejs/runtime-deno';

// Bootstrap the runtime
const runtime = bootstrap({
  captureShutdownSignals: true,
  signals: ['SIGINT', 'SIGTERM'],
  captureUncaughtErrors: true,
  captureUnhandledRejections: true,
});

// Use capabilities
const apiKey = runtime.env.get('API_KEY').unwrapOr('default');

const configResult = await runtime.fs.readFile('./config.json', { encoding: 'utf8' });
if (configResult.ok) {
  const config = JSON.parse(configResult.value as string);
  runtime.console.log('Config loaded:', config);
}

const response = await runtime.http.get('https://api.example.com/data');
if (response.ok) {
  const data = await response.value.json();
  runtime.console.log('Data:', data);
}

// Graceful shutdown on signals
runtime.lifecycle.onShutdown(async () => {
  runtime.console.log('Shutting down...');
  // Cleanup logic here
});

// Process information
runtime.console.log('Process ID:', runtime.process.pid);
runtime.console.log('Platform:', runtime.process.platform);
runtime.console.log('Architecture:', runtime.process.arch);
```

## Capabilities

### Environment Capability

```typescript
const nodeEnv = runtime.env.get('NODE_ENV').unwrapOr('development');
const allEnv = runtime.env.getAll(); // Returns frozen object
const platform = runtime.env.platform(); // Returns 'deno'
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
  // Cleanup database connections
  await db.close();
  // Save state
  await runtime.fs.writeFile('./state.json', JSON.stringify(state));
});

// Manually trigger shutdown
await runtime.lifecycle.shutdown();
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

// Write file
await runtime.fs.writeFile('/path/to/output.txt', 'Hello World', {
  encoding: 'utf8',
  createDirs: true, // Create parent directories if they don't exist
});

// Check if file exists
const exists = await runtime.fs.exists('/path/to/file.txt');

// Get file stats
const statResult = await runtime.fs.stat('/path/to/file.txt');
if (statResult.ok) {
  runtime.console.log('File size:', statResult.value.size);
  runtime.console.log('Is directory:', statResult.value.isDirectory);
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

### Process Capability

```typescript
// Process information
runtime.console.log('PID:', runtime.process.pid);
runtime.console.log('Parent PID:', runtime.process.ppid);
runtime.console.log('Arguments:', runtime.process.argv);
runtime.console.log('Working directory:', runtime.process.cwd);
runtime.console.log('Platform:', runtime.process.platform); // 'darwin', 'linux', 'windows'
runtime.console.log('Architecture:', runtime.process.arch); // 'x86_64', 'aarch64'

// Change directory
const chdirResult = runtime.process.chdir('/new/directory');
if (chdirResult.ok) {
  runtime.console.log('Changed to:', runtime.process.cwd);
}

// Exit process
runtime.process.exit(0);
```

## Bootstrap Options

```typescript
export interface DenoBootstrapOptions {
  /**
   * Capture shutdown signals for graceful shutdown
   * @default true
   */
  captureShutdownSignals?: boolean;

  /**
   * Which signals to capture
   * @default ['SIGINT', 'SIGTERM']
   */
  signals?: ('SIGINT' | 'SIGTERM' | 'SIGQUIT')[];

  /**
   * Capture uncaught errors via error event
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

## Permissions

Deno requires explicit permissions. Run your application with:

```bash
# All permissions (development)
deno run --allow-all main.ts

# Specific permissions (production)
deno run \
  --allow-env \
  --allow-net \
  --allow-read \
  --allow-write \
  --allow-run \
  main.ts
```

## Differences from Node.js Runtime

### Similarities
- Same capability-based architecture
- Same Result/Option types for error handling
- Compatible filesystem, HTTP, crypto interfaces
- Signal handling for graceful shutdown

### Differences
- Uses Deno.env instead of process.env
- Uses Deno filesystem APIs (Deno.readFile, Deno.writeFile, etc.)
- Uses Web Crypto API (no MD5 support, like browser)
- Signal listeners use Deno.addSignalListener
- Process info uses Deno.pid, Deno.ppid, Deno.args, etc.
- Requires explicit --allow-* permissions

## Testing

For testing, use the mock implementations from capability packages:

```typescript
import { createInMemoryEnv } from '@servicejs/capability-env';
import { createFakeTime } from '@servicejs/capability-time';
import { createInMemoryFS } from '@servicejs/capability-fs';
import { createMockHTTP } from '@servicejs/capability-http';
import { createDeterministicCrypto } from '@servicejs/capability-crypto';

// Create test runtime with mocks
const mockRuntime = {
  env: createInMemoryEnv({ API_KEY: 'test' }),
  time: createFakeTime(),
  fs: createInMemoryFS({ '/config.json': '{"key": "value"}' }),
  http: createMockHTTP(),
  crypto: createDeterministicCrypto({ seed: 42 }),
  // ... other capabilities
};

// Test your application with deterministic behavior
```

## Example Application

```typescript
import { bootstrap } from '@servicejs/runtime-deno';

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
  await runtime.fs.writeFile('./results.json', JSON.stringify(data.value, null, 2));

  runtime.console.log('Done!');
}

// Graceful shutdown
runtime.lifecycle.onShutdown(async () => {
  runtime.console.log('Cleaning up...');
});

main().catch((error) => {
  runtime.console.error('Fatal error:', error);
  runtime.process.exit(1);
});
```

## License

MIT
