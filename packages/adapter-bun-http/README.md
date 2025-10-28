# @servicejs/adapter-bun-http

Real Bun HTTP server adapter for ServiceJS using `Bun.serve()`.

## Overview

This adapter provides a production-ready HTTP server implementation using Bun's native HTTP server. It's optimized for maximum performance and leverages Bun's blazing-fast request handling.

## Features

- **Native Bun Performance**: Uses `Bun.serve()` for optimal speed
- **Automatic JSON Handling**: Parses JSON request bodies and stringifies JSON responses
- **Full Lifecycle Management**: Standard init → start → stop → destroy flow
- **Health Monitoring**: Built-in health checks
- **Type Safety**: Fully typed with TypeScript

## Installation

```bash
bun add @servicejs/adapter-bun-http
```

## Usage

### Basic HTTP Server

```typescript
import { createBunHttpAdapter } from '@servicejs/adapter-bun-http';

const server = createBunHttpAdapter();

await server.init({ port: 3000, hostname: 'localhost' });
await server.start();

server.onRequest(async (req) => {
  return {
    status: 200,
    headers: new Map([['content-type', 'application/json']]),
    body: { message: 'Hello from Bun!' },
  };
});

// Server is now running on http://localhost:3000
```

### With Routing

```typescript
import { createBunHttpAdapter } from '@servicejs/adapter-bun-http';

const server = createBunHttpAdapter();

await server.init({ port: 3000 });
await server.start();

server.onRequest(async (req) => {
  // Simple routing
  if (req.method === 'GET' && req.url === '/') {
    return {
      status: 200,
      headers: new Map([['content-type', 'text/plain']]),
      body: 'Welcome!',
    };
  }

  if (req.method === 'GET' && req.url === '/api/users') {
    return {
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      body: { users: ['alice', 'bob'] },
    };
  }

  if (req.method === 'POST' && req.url === '/api/users') {
    const userData = req.body; // Already parsed as JSON
    return {
      status: 201,
      headers: new Map([['content-type', 'application/json']]),
      body: { id: '123', ...userData },
    };
  }

  return {
    status: 404,
    headers: new Map([['content-type', 'text/plain']]),
    body: 'Not Found',
  };
});
```

### With ServiceJS Components

```typescript
import { createBunHttpAdapter } from '@servicejs/adapter-bun-http';
import { createComponent } from '@servicejs/core';

// Create an HTTP server component
const { component: httpServer, capability: httpCap } = createComponent(
  'urn:service:http-server',
  { adapter: createBunHttpAdapter() },
  (state, message) => {
    if (message.type === 'init') {
      state.adapter.init({ port: 3000 });
      state.adapter.start();

      state.adapter.onRequest(async (req) => {
        // Handle requests...
        return {
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          body: { ok: true },
        };
      });
    }

    return stay(state, reducer);
  }
);
```

## API

### createBunHttpAdapter()

Creates a new Bun HTTP server adapter.

Returns: `ServerAdapter`

### Configuration

```typescript
interface BunHttpConfig {
  port: number;           // Port to listen on (required)
  hostname?: string;      // Hostname to bind to (default: 'localhost')
  development?: boolean;  // Enable development mode (default: false)
}
```

### Lifecycle Methods

```typescript
await server.init(config);    // Initialize with configuration
await server.start();          // Start listening for requests
await server.stop();           // Stop accepting new requests
await server.destroy();        // Clean up resources
const health = await server.health(); // Check server health
```

### Request Handler

```typescript
server.onRequest((req: ServerRequest) => Promise<ServerResponse>);
```

**ServerRequest:**
```typescript
interface ServerRequest {
  readonly method: string;  // HTTP method (GET, POST, etc.)
  readonly url: string;     // URL path with query string
  readonly headers: ReadonlyMap<string, string>;
  readonly body?: unknown;  // Parsed request body (JSON if content-type is application/json)
}
```

**ServerResponse:**
```typescript
interface ServerResponse {
  status: number;           // HTTP status code
  headers: Map<string, string>;
  body?: unknown;          // Response body (auto-serialized to JSON if content-type is application/json)
}
```

## Performance

This adapter uses Bun's native HTTP server, which is significantly faster than Node.js:

- **3x faster** than Node.js HTTP
- **Zero-copy** request/response handling
- **Native JSON parsing** with SIMD acceleration

## Graceful Shutdown

```typescript
const server = createBunHttpAdapter();

await server.init({ port: 3000 });
await server.start();

server.onRequest(async (req) => {
  // Handle requests...
});

// When shutting down
await server.stop();    // Stops accepting new requests
await server.destroy(); // Cleans up resources
```

## Related Packages

- **[@servicejs/integration-server](../integration-server)**: Base server adapter interfaces
- **[@servicejs/integrations](../integrations)**: Base integration framework

## License

MIT
