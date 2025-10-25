# @servicejs/runtime-browser

Browser runtime for ServiceJS - complete web platform integration as explicit capabilities.

## Features

- **Environment**: Limited environment access (browser platform identification)
- **Time**: setTimeout/setInterval with Result types, performance.now() support
- **Lifecycle**: beforeunload event handling, graceful shutdown
- **Console**: All log levels via browser console
- **HTTP**: Fetch API with Result types
- **Crypto**: Web Crypto API (SHA-1/256/384/512, HMAC, random generation)
- **Window**: Location, dimensions, navigation
- **Storage**: localStorage and sessionStorage with Result types

## Installation

```bash
bun add @servicejs/runtime-browser
```

## Usage

```typescript
import { bootstrap } from '@servicejs/runtime-browser';

// Bootstrap the runtime
const runtime = bootstrap({
  captureBeforeUnload: true,
  captureUnhandledErrors: true,
  captureUnhandledRejections: true,
});

// Use capabilities
const apiKey = runtime.localStorage.get('apiKey').unwrapOr('default');

const response = await runtime.http.get('https://api.example.com/data');
if (response.ok) {
  const data = await response.value.json();
  runtime.console.log('Data:', data);
}

// Graceful shutdown on page unload
runtime.lifecycle.onShutdown(async () => {
  runtime.console.log('Shutting down...');
  // Cleanup logic here
});

// Access window information
runtime.console.log('Current URL:', runtime.window.location.href);
runtime.console.log('Window size:', runtime.window.innerWidth, 'x', runtime.window.innerHeight);

// Generate cryptographically secure random data
const randomBytes = runtime.crypto.randomBytes(32);
const uuid = runtime.crypto.randomUUID();

// Hash data
const hash = await runtime.crypto.hash('sha256', 'hello world');
runtime.console.log('Hash:', hash);
```

## Capabilities

### Environment Capability

Browsers don't have traditional environment variables:

```typescript
runtime.env.get('NODE_ENV'); // Returns None (browsers don't have env vars)
runtime.env.platform(); // Returns 'browser'
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
  // Save state before page unload
  runtime.localStorage.set('lastVisit', Date.now().toString());
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

### Window Capability

```typescript
// Read-only location information
runtime.console.log('URL:', runtime.window.location.href);
runtime.console.log('Protocol:', runtime.window.location.protocol);
runtime.console.log('Host:', runtime.window.location.host);
runtime.console.log('Path:', runtime.window.location.pathname);

// Window dimensions
runtime.console.log('Width:', runtime.window.innerWidth);
runtime.console.log('Height:', runtime.window.innerHeight);
runtime.console.log('Pixel ratio:', runtime.window.devicePixelRatio);

// Navigation
runtime.window.navigate('https://example.com');
runtime.window.reload();
```

### Storage Capabilities

```typescript
// localStorage
const saveResult = runtime.localStorage.set('key', 'value');
const loadResult = runtime.localStorage.get('key'); // Ok('value')
const removeResult = runtime.localStorage.remove('key');
const clearResult = runtime.localStorage.clear();
const keysResult = runtime.localStorage.keys();

// sessionStorage (same API)
runtime.sessionStorage.set('sessionKey', 'sessionValue');
```

## Bootstrap Options

```typescript
export interface BrowserBootstrapOptions {
  /**
   * Capture beforeunload event for graceful shutdown
   * @default true
   */
  captureBeforeUnload?: boolean;

  /**
   * Capture uncaught errors via window error event
   * @default true
   */
  captureUnhandledErrors?: boolean;

  /**
   * Capture unhandled promise rejections
   * @default true
   */
  captureUnhandledRejections?: boolean;
}
```

## Browser Compatibility

- Modern browsers with ES2022 support
- Web Crypto API required for cryptographic operations
- Fetch API required for HTTP operations
- localStorage/sessionStorage required for storage operations

## Limitations

- No environment variables (use build-time constants or config files)
- No filesystem access (use storage APIs or IndexedDB)
- No streams (stdin/stdout/stderr - not applicable in browser)
- MD5 not supported in Web Crypto API (use SHA-256 instead)
- beforeunload handlers may be limited by browser policies

## Testing

For testing browser code, use the mock implementations from capability packages:

```typescript
import { createInMemoryEnv } from '@servicejs/capability-env';
import { createFakeTime } from '@servicejs/capability-time';
import { createMockHTTP } from '@servicejs/capability-http';
import { createDeterministicCrypto } from '@servicejs/capability-crypto';

// Create test runtime with mocks
const mockRuntime = {
  env: createInMemoryEnv({ DEBUG: 'true' }),
  time: createFakeTime(),
  http: createMockHTTP(),
  crypto: createDeterministicCrypto({ seed: 42 }),
  // ... other capabilities
};

// Test your application with deterministic behavior
```

## License

MIT
