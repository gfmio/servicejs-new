# @servicejs/adapter-node-http

Node.js HTTP adapter for ServiceJS integration framework. Provides production-ready HTTP server capabilities using Node.js built-in `http` and `https` modules.

## Features

- ✅ **Node.js Native**: Uses built-in `http`/`https` modules, no external dependencies
- ✅ **HTTP/HTTPS Support**: Optional HTTPS with custom certificates
- ✅ **Lifecycle Management**: Full init → start → stop → destroy lifecycle
- ✅ **Health Monitoring**: Built-in health checks
- ✅ **Request Parsing**: Automatic JSON and text body parsing
- ✅ **Type Safe**: Full TypeScript support with strict types
- ✅ **Result-Based**: Never throws, returns `Result<T, E>` types
- ✅ **Configurable Timeouts**: Request, keep-alive, and header size limits
- ✅ **Production Ready**: Suitable for real-world applications

## Installation

```bash
bun add @servicejs/adapter-node-http
```

## Usage

### Basic Server

```typescript
import { createNodeHttpAdapter } from '@servicejs/adapter-node-http';

const server = createNodeHttpAdapter();

// Initialize and start
await server.init({ port: 3000, hostname: 'localhost' });
await server.start();

// Handle requests
server.onRequest(async (req) => {
  if (req.method === 'GET' && req.url === '/') {
    return {
      status: 200,
      headers: new Map([['content-type', 'text/html']]),
      body: '<h1>Hello World!</h1>',
    };
  }

  return {
    status: 404,
    headers: new Map([['content-type', 'application/json']]),
    body: { error: 'Not Found' },
  };
});

console.log('Server running at http://localhost:3000');
```

### REST API

```typescript
import { createNodeHttpAdapter } from '@servicejs/adapter-node-http';

const server = createNodeHttpAdapter();

const users = new Map();

await server.init({ port: 3000, hostname: 'localhost' });
await server.start();

server.onRequest(async (req) => {
  // GET /api/users
  if (req.method === 'GET' && req.url === '/api/users') {
    return {
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      body: { users: Array.from(users.values()) },
    };
  }

  // POST /api/users
  if (req.method === 'POST' && req.url === '/api/users') {
    const body = req.body as { name: string; email: string };
    const user = { id: Date.now(), ...body };
    users.set(user.id, user);

    return {
      status: 201,
      headers: new Map([['content-type', 'application/json']]),
      body: { user },
    };
  }

  return {
    status: 404,
    headers: new Map([['content-type', 'application/json']]),
    body: { error: 'Not Found' },
  };
});
```

### HTTPS Server

```typescript
import { createNodeHttpAdapter } from '@servicejs/adapter-node-http';
import { readFileSync } from 'fs';

const server = createNodeHttpAdapter();

await server.init({
  port: 443,
  hostname: 'localhost',
  https: true,
  httpsOptions: {
    key: readFileSync('private-key.pem'),
    cert: readFileSync('certificate.pem'),
  },
});

await server.start();

server.onRequest(async (req) => {
  return {
    status: 200,
    headers: new Map([['content-type', 'text/plain']]),
    body: 'Secure connection!',
  };
});
```

### Graceful Shutdown

```typescript
const server = createNodeHttpAdapter();

await server.init({ port: 3000, hostname: 'localhost' });
await server.start();

server.onRequest(async (req) => {
  // Handle requests
});

// Handle shutdown signals
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  const stopResult = await server.stop();
  if (stopResult.success) {
    await server.destroy();
    process.exit(0);
  } else {
    console.error('Failed to stop server:', stopResult.error);
    process.exit(1);
  }
});
```

## API

### `createNodeHttpAdapter()`

Creates a new Node.js HTTP adapter instance.

### Configuration

```typescript
interface NodeHttpConfig {
  /**
   * Port to listen on
   */
  port: number;

  /**
   * Hostname to bind to (default: 'localhost')
   */
  hostname?: string;

  /**
   * Use HTTPS instead of HTTP
   */
  https?: boolean;

  /**
   * HTTPS options (cert, key, etc.)
   */
  httpsOptions?: https.ServerOptions;

  /**
   * Request timeout in milliseconds
   */
  timeout?: number;

  /**
   * Keep-alive timeout in milliseconds
   */
  keepAliveTimeout?: number;

  /**
   * Max header size in bytes
   */
  maxHeaderSize?: number;
}
```

### Lifecycle Methods

#### `init(config: NodeHttpConfig): Promise<Result<void, Error>>`

Initialize the adapter with configuration. Must be called before `start()`.

#### `start(): Promise<Result<void, Error>>`

Start the HTTP server and begin accepting connections.

#### `stop(): Promise<Result<void, Error>>`

Stop the server and close all connections gracefully.

#### `destroy(): Promise<Result<void, Error>>`

Clean up resources. Automatically calls `stop()` if needed.

### Request Handling

#### `onRequest(handler: ServerRequestHandler): void`

Register a function to handle incoming HTTP requests.

```typescript
type ServerRequestHandler = (
  req: ServerRequest
) => Promise<ServerResponse> | ServerResponse;

interface ServerRequest {
  method: string;
  url: string;
  headers: ReadonlyMap<string, string>;
  body?: unknown;
}

interface ServerResponse {
  status: number;
  headers: ReadonlyMap<string, string>;
  body?: unknown;
}
```

### Health Checks

#### `health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy' }, Error>>`

Check the health status of the server.

- **healthy**: Server is running and accepting requests
- **degraded**: Server is initialized but not started
- **unhealthy**: Server is uninitialized or destroyed

## Body Parsing

The adapter automatically parses request bodies based on Content-Type:

- **`application/json`**: Parsed as JSON object
- **Other types**: Parsed as plain text string
- **GET/HEAD requests**: No body parsing

## Response Serialization

The adapter automatically serializes response bodies:

- **String**: Sent as-is
- **null/undefined**: Empty response
- **Object**: Serialized as JSON (sets `content-type: application/json` if not set)

## Performance

Node.js HTTP module provides:

- ✅ Stable and battle-tested
- ✅ Wide compatibility
- ✅ Good performance for most use cases
- ✅ Large ecosystem support

For higher performance in Bun runtime, consider `@servicejs/adapter-bun-http`.

## Error Handling

All methods return `Result<T, Error>` types. Check results with type guards:

```typescript
import { isOk, isErr } from '@servicejs/result';

const result = await server.start();

if (isOk(result)) {
  console.log('Server started successfully');
} else {
  console.error('Failed to start:', result.error);
}
```

## Best Practices

### 1. Always Initialize Before Starting

```typescript
// ✅ Correct
await server.init(config);
await server.start();

// ❌ Wrong
await server.start(); // Will fail
```

### 2. Handle Shutdown Gracefully

```typescript
process.on('SIGTERM', async () => {
  await server.stop();
  await server.destroy();
  process.exit(0);
});
```

### 3. Set Appropriate Timeouts

```typescript
await server.init({
  port: 3000,
  timeout: 30000, // 30 second request timeout
  keepAliveTimeout: 5000, // 5 second keep-alive
});
```

### 4. Validate Request Bodies

```typescript
server.onRequest(async (req) => {
  if (req.method === 'POST') {
    const body = req.body as { name?: string };

    if (!body || !body.name) {
      return {
        status: 400,
        headers: new Map([['content-type', 'application/json']]),
        body: { error: 'Missing required field: name' },
      };
    }

    // Process valid request
  }
});
```

### 5. Use Structured Logging

```typescript
server.onRequest(async (req) => {
  const start = Date.now();

  const response = await handleRequest(req);

  const duration = Date.now() - start;
  console.log(JSON.stringify({
    method: req.method,
    url: req.url,
    status: response.status,
    duration,
  }));

  return response;
});
```

## Examples

See the `examples/` directory:

- `basic-server.ts` - Simple HTTP server with routing
- `rest-api.ts` - Complete RESTful API with CRUD operations

Run examples:

```bash
cd packages/adapter-node-http
bun examples/basic-server.ts
bun examples/rest-api.ts
```

## Testing

```bash
bun test
```

## License

MIT
