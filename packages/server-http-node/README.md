# @servicejs/server-http-node

Node.js HTTP Server adapter for ServiceJS - capability-based HTTP server with request/response handling.

## Features

- **Request/Response Handling**: Handle HTTP requests as messages
- **Query Parameter Parsing**: Automatic query string parsing
- **Body Reading**: Automatic request body buffering
- **Custom Headers**: Full control over request and response headers
- **Configurable Timeouts**: Keep-alive, headers, and request timeouts
- **Active Request Tracking**: Monitor concurrent requests
- **Type-Safe**: Full TypeScript support with Result types

## Installation

```bash
bun add @servicejs/server-http-node @servicejs/result
```

## Usage

### Basic Server

```typescript
import { createHTTPServer } from '@servicejs/server-http-node';

const server = createHTTPServer();

await server.init({ port: 3000 });

server.onRequest((request) => {
  return {
    statusCode: 200,
    headers: { 'content-type': 'text/plain' },
    body: `Hello! You requested ${request.method} ${request.url}`,
  };
});

await server.start();
```

### REST API

```typescript
const todos = [];

server.onRequest((request) => {
  if (request.method === 'GET' && request.url === '/todos') {
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(todos),
    };
  }

  if (request.method === 'POST' && request.url === '/todos') {
    const data = JSON.parse(request.body.toString());
    const todo = { id: Date.now(), title: data.title };
    todos.push(todo);

    return {
      statusCode: 201,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(todo),
    };
  }

  return {
    statusCode: 404,
    body: 'Not Found',
  };
});
```

## API Reference

### `createHTTPServer(): HTTPServerAdapter`

Creates a new HTTP server adapter instance.

### Configuration

```typescript
interface HTTPServerConfig {
  host?: string;              // Default: '0.0.0.0'
  port: number;               // Required
  keepAliveTimeout?: number;  // Keep-alive timeout in ms
  headersTimeout?: number;    // Headers timeout in ms
  requestTimeout?: number;    // Request timeout in ms
  maxHeaderSize?: number;     // Max header size in bytes
}
```

### Methods

- `init(config)` - Initialize with configuration
- `start()` - Start the server
- `stop()` - Stop the server
- `destroy()` - Clean up resources
- `health()` - Check if running
- `onRequest(handler)` - Register request handler
- `onError(handler)` - Register error handler
- `getActiveRequests()` - Get count of active requests

### Request/Response Types

```typescript
interface HTTPRequest {
  id: string;
  method: string;
  url: string;
  headers: IncomingHttpHeaders;
  body: Buffer;
  query: Record<string, string | string[]>;
  params: Record<string, string>;
}

interface HTTPResponse {
  statusCode: number;
  headers?: Record<string, string | string[]>;
  body: string | Buffer;
}
```

## Examples

- `basic-server.ts` - Simple HTTP server
- `rest-api.ts` - REST API with CRUD operations
- `file-server.ts` - Static file serving

Run: `bun run examples/basic-server.ts`

## License

MIT
