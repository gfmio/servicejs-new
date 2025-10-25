# @servicejs/runtime-react-native

React Native runtime capabilities for ServiceJS - capability-based access to React Native platform APIs.

## Features

- **Mobile Platform Support**: iOS, Android, and other React Native targets
- **AsyncStorage Integration**: Persistent key-value storage capability
- **Platform Detection**: OS, version, and device information
- **Network State**: NetInfo integration for connectivity monitoring
- **App Lifecycle**: AppState integration for background/foreground events
- **Dimensions API**: Window and screen size with change notifications
- **Type-Safe**: Full TypeScript support with strict typing
- **Result Types**: All fallible operations return `Result<T, E>`

## Installation

```bash
npm install @servicejs/runtime-react-native
```

### Peer Dependencies

This package requires React Native:

```bash
npm install react-native
```

### Optional Dependencies

For full functionality, install these packages:

```bash
# For AsyncStorage capability
npm install @react-native-async-storage/async-storage

# For NetInfo capability
npm install @react-native-community/netinfo
```

## Usage

### Basic Bootstrap

```typescript
import { bootstrap } from '@servicejs/runtime-react-native';

// Bootstrap with default options
const runtime = bootstrap();

// Access capabilities
runtime.console.log('Hello from React Native!');
runtime.time.now(); // Current timestamp
```

### With Options

```typescript
const runtime = bootstrap({
  captureUncaughtErrors: true,
  captureUnhandledRejections: true,
  enableNetInfo: true, // Enable NetInfo capability
});
```

### Platform Information

```typescript
const { platform } = runtime;

console.log(platform.OS); // 'ios' | 'android' | 'windows' | 'macos' | 'web'
console.log(platform.Version); // OS version
console.log(platform.isTV); // Running on TV?

// Platform-specific values
const value = platform.select({
  ios: 'iOS value',
  android: 'Android value',
  default: 'Default value',
});
```

### Storage (AsyncStorage)

```typescript
const { storage } = runtime;

// Set item
const setResult = await storage.setItem('key', 'value');
if (setResult.ok) {
  console.log('Stored successfully');
}

// Get item
const getResult = await storage.getItem('key');
if (getResult.ok) {
  console.log('Value:', getResult.value); // string | null
}

// Multi-operations
await storage.multiSet([
  ['key1', 'value1'],
  ['key2', 'value2'],
]);

const multiResult = await storage.multiGet(['key1', 'key2']);
if (multiResult.ok) {
  console.log('Values:', multiResult.value); // [['key1', 'value1'], ['key2', 'value2']]
}

// Get all keys
const keysResult = await storage.getAllKeys();
if (keysResult.ok) {
  console.log('Keys:', keysResult.value);
}

// Clear all
await storage.clear();
```

### Dimensions

```typescript
const { dimensions } = runtime;

// Get current dimensions
const window = dimensions.get('window');
console.log(window.width, window.height, window.scale);

const screen = dimensions.get('screen');
console.log(screen.width, screen.height);

// Listen for changes
const unsubscribe = dimensions.addEventListener('change', ({ window, screen }) => {
  console.log('Dimensions changed:', window, screen);
});

// Clean up
unsubscribe();
```

### App State

```typescript
const { appState } = runtime;

// Get current state
console.log(appState.currentState); // 'active' | 'background' | 'inactive'

// Listen for changes
const unsubscribe = appState.addEventListener('change', (state) => {
  console.log('App state:', state);
  if (state === 'background') {
    // App went to background
  }
});

// Clean up
unsubscribe();
```

### Network Info

```typescript
const { netInfo } = runtime; // Only if enableNetInfo: true

if (netInfo) {
  // Fetch current state
  const stateResult = await netInfo.fetch();
  if (stateResult.ok) {
    const { type, isConnected, isInternetReachable } = stateResult.value;
    console.log('Network:', type, isConnected, isInternetReachable);
  }

  // Listen for changes
  const unsubscribe = netInfo.addEventListener((state) => {
    if (state.isConnected === false) {
      console.log('Network disconnected');
    }
  });

  // Clean up
  unsubscribe();
}
```

### HTTP Requests

```typescript
const { http } = runtime;

const result = await http.fetch('https://api.example.com/data');

if (result.ok) {
  const response = result.value;
  const data = await response.json();
  console.log('Data:', data);
} else {
  console.error('HTTP error:', result.error.code, result.error.message);
}
```

### Timers

```typescript
const { time } = runtime;

// setTimeout
const timeoutResult = time.setTimeout(() => {
  console.log('Timeout fired');
}, 1000);

if (timeoutResult.ok) {
  const handle = timeoutResult.value;
  // Cancel if needed
  time.clearTimeout(handle);
}

// setInterval
const intervalResult = time.setInterval(() => {
  console.log('Interval tick');
}, 1000);

if (intervalResult.ok) {
  const handle = intervalResult.value;
  // Cancel later
  setTimeout(() => {
    time.clearInterval(handle);
  }, 5000);
}
```

### Lifecycle Management

```typescript
const { lifecycle } = runtime;

// Register shutdown handler
const unregister = lifecycle.onShutdown(async () => {
  console.log('App shutting down');
  // Clean up resources
  await saveState();
});

// Manually trigger shutdown
await lifecycle.shutdown();
```

### Crypto

```typescript
const { crypto } = runtime;

// Generate UUID
const id = crypto.randomUUID();
console.log('UUID:', id);

// Generate random bytes
const buffer = new Uint8Array(16);
crypto.getRandomValues(buffer);
console.log('Random bytes:', buffer);
```

## Capabilities

### Core Capabilities

- **env**: Environment variables (limited in React Native)
- **time**: Timers and timestamps
- **lifecycle**: App lifecycle management
- **console**: Logging
- **http**: Network requests via fetch
- **crypto**: Random number generation and UUIDs

### React Native Specific

- **storage**: AsyncStorage key-value persistence
- **platform**: OS and platform information
- **dimensions**: Screen and window dimensions
- **appState**: Foreground/background state
- **netInfo**: Network connectivity (optional)

## Type Safety

All capabilities are fully typed with TypeScript:

```typescript
import type { ReactNativeRuntimeCapabilities } from '@servicejs/runtime-react-native';

function useRuntime(runtime: ReactNativeRuntimeCapabilities) {
  // Full type safety
  const platform: 'react-native' = runtime.env.platform();
  const now: number = runtime.time.now();

  // Result types for error handling
  const result: Result<Response, HTTPError> = await runtime.http.fetch('...');
}
```

## Error Handling

All fallible operations return `Result<T, E>`:

```typescript
const result = await runtime.storage.setItem('key', 'value');

if (result.ok) {
  // Success: result.value is void
} else {
  // Error: result.error has code and message
  console.error(result.error.code); // 'STORAGE_ERROR'
  console.error(result.error.message);
}
```

## Notes

- **AsyncStorage**: The storage capability requires `@react-native-async-storage/async-storage` to be installed
- **NetInfo**: The netInfo capability requires `@react-native-community/netinfo` and `enableNetInfo: true`
- **Platform APIs**: Some capabilities are stubs that need actual React Native modules to function
- **Environment Variables**: React Native doesn't have built-in env vars - use react-native-dotenv or similar
- **Metro Bundler**: This package is designed to work with React Native's Metro bundler

## License

MIT
