# @servicejs/capability-http

HTTP client capability interface for ServiceJS.

Provides platform-agnostic HTTP operations without ambient authority.

## Installation

```bash
bun add @servicejs/capability-http
```

## Features

- **No Ambient Authority** - HTTP access is explicitly granted via capabilities
- **Platform Agnostic** - Same interface works across Node.js, browser, Deno, edge runtimes
- **Type Safe** - Full TypeScript support with Result types
- **Test Friendly** - Mock implementation for easy testing
- **Never Throws** - All operations return `Result<T, E>` instead of throwing exceptions
- **Request Capture** - Built-in request history for test assertions

## Usage

### In Tests

```typescript
import { createMockHTTP } from '@servicejs/capability-http';

const http = createMockHTTP();

// Mock a successful response
http.mockRoute('https://api.example.com/users', {
  status: 200,
  body: [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ],
});

// Make request
const response = await http.get('https://api.example.com/users');
if (response.ok && response.value.ok) {
  const users = await response.value.json();
  if (users.ok) {
    console.log(users.value); // [{ id: 1, name: 'Alice' }, ...]
  }
}

// Verify request was made
const requests = http.getCapturedRequests();
expect(requests.length).toBe(1);
expect(requests[0].url).toBe('https://api.example.com/users');
```

### In Production

```typescript
import { bootstrap } from '@servicejs/runtime-node';

const runtime = bootstrap();

// GET request
const response = await runtime.http.get('https://api.example.com/users');
if (response.ok && response.value.ok) {
  const usersResult = await response.value.json();
  if (usersResult.ok) {
    const users = usersResult.value;
    // Use users...
  }
}

// POST request with JSON body
const createResult = await runtime.http.post(
  'https://api.example.com/users',
  {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Charlie' }),
  }
);
```

## API

### HTTPCapability

```typescript
interface HTTPCapability {
  request(url: string, options?: HTTPRequestOptions): Promise<Result<HTTPResponse, HTTPError>>;
  get(url: string, options?: Omit<HTTPRequestOptions, 'method' | 'body'>): Promise<Result<HTTPResponse, HTTPError>>;
  post(url: string, options?: Omit<HTTPRequestOptions, 'method'>): Promise<Result<HTTPResponse, HTTPError>>;
  put(url: string, options?: Omit<HTTPRequestOptions, 'method'>): Promise<Result<HTTPResponse, HTTPError>>;
  patch(url: string, options?: Omit<HTTPRequestOptions, 'method'>): Promise<Result<HTTPResponse, HTTPError>>;
  delete(url: string, options?: Omit<HTTPRequestOptions, 'method' | 'body'>): Promise<Result<HTTPResponse, HTTPError>>;
  head(url: string, options?: Omit<HTTPRequestOptions, 'method' | 'body'>): Promise<Result<HTTPResponse, HTTPError>>;
}
```

### HTTPRequestOptions

```typescript
interface HTTPRequestOptions {
  method?: HTTPMethod; // 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
  headers?: HTTPHeaders; // Record<string, string>
  body?: HTTPBody; // string | Uint8Array | ArrayBuffer | Blob | FormData | URLSearchParams
  timeout?: number; // Timeout in milliseconds
  signal?: AbortSignal; // For request cancellation
  redirect?: 'follow' | 'error' | 'manual'; // Default: 'follow'
  credentials?: 'omit' | 'same-origin' | 'include';
}
```

### HTTPResponse

```typescript
interface HTTPResponse {
  readonly status: number;
  readonly statusText: string;
  readonly headers: Readonly<HTTPHeaders>;
  readonly ok: boolean; // true if status 200-299

  text(): Promise<Result<string, HTTPError>>;
  json<T = unknown>(): Promise<Result<T, HTTPError>>;
  arrayBuffer(): Promise<Result<ArrayBuffer, HTTPError>>;
  blob?(): Promise<Result<Blob, HTTPError>>;
}
```

### HTTPError

```typescript
interface HTTPError {
  readonly code: HTTPErrorCode;
  readonly message: string;
  readonly url?: string;
  readonly statusCode?: number;
}

type HTTPErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'INVALID_URL'
  | 'INVALID_REQUEST'
  | 'INVALID_RESPONSE'
  | 'ABORTED'
  | 'UNKNOWN';
```

## Mock Implementation

### createMockHTTP

Create a mock HTTP client for testing.

```typescript
function createMockHTTP(routes?: MockRoute[]): MockHTTPCapability;
```

**Features:**
- Route-based response mocking
- String, RegExp, and function matchers
- Request capture for assertions
- Default response configuration
- Delay simulation

### Mock Routes

```typescript
// String matcher (exact or prefix match)
http.mockRoute('https://api.example.com/users', {
  status: 200,
  body: [{ id: 1, name: 'Alice' }],
});

// RegExp matcher
http.mockRoute(/\/users\/\d+/, {
  status: 200,
  body: { id: 123, name: 'Bob' },
});

// Function matcher
http.mockRoute(
  (url, options) => url.includes('/search') && options?.method === 'GET',
  {
    status: 200,
    body: { results: [] },
  }
);

// Mock error response
http.mockRoute('https://api.example.com/error', {
  code: 'TIMEOUT',
  message: 'Request timed out',
});

// Delay simulation
http.mockRoute('https://api.example.com/slow', {
  status: 200,
  body: { data: 'slow' },
  delay: 1000, // 1 second delay
});
```

### Request Capture

```typescript
const http = createMockHTTP();

http.mockRoute('https://api.example.com', { status: 200 });

await http.get('https://api.example.com/users');
await http.post('https://api.example.com/users', {
  body: JSON.stringify({ name: 'Test' }),
});

// Get captured requests
const requests = http.getCapturedRequests();
console.log(requests[0].url); // 'https://api.example.com/users'
console.log(requests[0].options?.method); // 'GET'
console.log(requests[1].options?.method); // 'POST'

// Clear history
http.clearCapturedRequests();
```

### Default Response

```typescript
const http = createMockHTTP();

// Set default for unmatched requests
http.setDefaultResponse({
  status: 404,
  body: { error: 'Not found' },
});

// Any unmatched request returns 404
const result = await http.get('https://api.example.com/unknown');
// result.value.status === 404
```

### MockHTTPCapability API

```typescript
interface MockHTTPCapability extends HTTPCapability {
  mockRoute(matcher: string | RegExp | RequestMatcher, response: MockHTTPResult): void;
  clearRoutes(): void;
  getCapturedRequests(): readonly CapturedRequest[];
  clearCapturedRequests(): void;
  setDefaultResponse(response: MockHTTPResult): void;
}
```

## createNoOpHTTP

Create a no-op HTTP client where all requests fail.

```typescript
function createNoOpHTTP(): HTTPCapability;
```

**Use cases:**
- Testing error handling
- Disabling network access
- Security sandboxing

```typescript
const http = createNoOpHTTP();

const result = await http.get('https://api.example.com');
// result.ok === false
// result.error.code === 'NETWORK_ERROR'
```

## Response Handling

All response methods return `Result<T, HTTPError>`.

```typescript
import { isOk, isErr } from '@servicejs/result';

const response = await http.get('https://api.example.com/users');

if (isOk(response)) {
  if (response.value.ok) {
    // Status 200-299
    const jsonResult = await response.value.json();
    if (isOk(jsonResult)) {
      console.log('Data:', jsonResult.value);
    }
  } else {
    // Status 400+, 500+, etc.
    console.error('HTTP error:', response.value.status);
  }
} else {
  // Network error, timeout, etc.
  console.error('Request failed:', response.error.code, response.error.message);
}
```

## Examples

### JSON API

```typescript
const http = createMockHTTP();

http.mockRoute('https://api.example.com/users', {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
  body: [{ id: 1, name: 'Alice' }], // Auto-stringified to JSON
});

const response = await http.get('https://api.example.com/users');
if (isOk(response) && response.value.ok) {
  const users = await response.value.json();
  // users.value is typed as unknown by default
  // or users.value as User[] if you specify the generic
}
```

### Binary Data

```typescript
const http = createMockHTTP();

const binaryData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
http.mockRoute('https://api.example.com/binary', {
  status: 200,
  headers: { 'Content-Type': 'application/octet-stream' },
  body: binaryData,
});

const response = await http.get('https://api.example.com/binary');
if (isOk(response) && response.value.ok) {
  const buffer = await response.value.arrayBuffer();
  if (isOk(buffer)) {
    const data = new Uint8Array(buffer.value);
    console.log(data); // Uint8Array(5) [72, 101, 108, 108, 111]
  }
}
```

### Error Handling

```typescript
const http = createMockHTTP();

// Network error
http.mockRoute('https://api.example.com/error', {
  code: 'NETWORK_ERROR',
  message: 'Connection refused',
});

// HTTP error (status 4xx/5xx)
http.mockRoute('https://api.example.com/notfound', {
  status: 404,
  body: { error: 'Not found' },
});

const networkError = await http.get('https://api.example.com/error');
// isErr(networkError) === true

const httpError = await http.get('https://api.example.com/notfound');
// isOk(httpError) === true (request succeeded)
// httpError.value.ok === false (HTTP status not 2xx)
```

### Testing

```typescript
import { test, expect } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createMockHTTP } from '@servicejs/capability-http';

test('fetches users from API', async () => {
  const http = createMockHTTP();

  http.mockRoute('https://api.example.com/users', {
    status: 200,
    body: [{ id: 1, name: 'Alice' }],
  });

  const response = await http.get('https://api.example.com/users');

  expect(isOk(response)).toBe(true);
  if (isOk(response)) {
    expect(response.value.status).toBe(200);
    expect(response.value.ok).toBe(true);

    const users = await response.value.json();
    expect(isOk(users)).toBe(true);
    if (isOk(users)) {
      expect(users.value).toEqual([{ id: 1, name: 'Alice' }]);
    }
  }

  // Verify request was made correctly
  const requests = http.getCapturedRequests();
  expect(requests.length).toBe(1);
  expect(requests[0].url).toBe('https://api.example.com/users');
  expect(requests[0].options?.method).toBe('GET');
});
```

## Platform Implementations

This package provides the interface and mock implementation. Platform-specific implementations are provided by runtime packages:

- **@servicejs/runtime-node** - Node.js (fetch or https)
- **@servicejs/runtime-browser** - Browser (fetch API)
- **@servicejs/runtime-deno** - Deno (fetch)
- **@servicejs/runtime-cloudflare** - Cloudflare Workers (fetch)

## Design Philosophy

This package follows ServiceJS's capability-based security model:

1. **No Ambient Authority** - Applications don't access the network directly; they receive a capability
2. **Explicit Grants** - Network access must be explicitly granted by the runtime
3. **Testable** - Easy to substitute with mock implementation
4. **Type Safe** - Full TypeScript support with Result types for error handling
5. **Platform Agnostic** - Same interface across all JavaScript runtimes

## License

MIT
