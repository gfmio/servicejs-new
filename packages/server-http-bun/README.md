# @servicejs/server-http-bun

HTTP server adapter for ServiceJS using Bun's native HTTP server.

## Installation

```bash
bun add @servicejs/server-http-bun
```

## Features

- 🚀 Built on Bun's ultra-fast HTTP server
- 🔥 High performance
- 📝 Request/response handling
- 🎯 Query parameter parsing
- 📦 Body parsing
- 🛡️ Type-safe with TypeScript
- 🎯 Capability-based API

## Usage

```typescript
import { createHTTPServer } from '@servicejs/server-http-bun';

const server = createHTTPServer();

await server.init({ port: 3000 });

server.onRequest((request) => ({
  statusCode: 200,
  headers: {
    'Content-Type': 'text/plain',
  },
  body: `Hello, ${request.method} ${request.url}`,
}));

await server.start();
```

## API

### `createHTTPServer()`

Creates a new HTTP server adapter instance.

### Configuration

```typescript
interface HTTPServerConfig {
  port: number;              // Port to listen on
  hostname?: string;         // Hostname (default: '0.0.0.0')
  development?: boolean;     // Development mode (default: false)
}
```

### Methods

- `init(config: HTTPServerConfig): Promise<Result<void, Error>>` - Initialize server
- `start(): Promise<Result<void, Error>>` - Start listening
- `stop(): Promise<Result<void, Error>>` - Stop server
- `destroy(): Promise<Result<void, Error>>` - Cleanup resources
- `health(): Promise<Result<boolean, Error>>` - Check server health

### Event Handlers

- `onRequest(handler: RequestHandler)` - Handle HTTP requests
- `onError(handler: ErrorHandler)` - Handle errors

## Examples

See the [examples](./examples) directory for:

- `basic-server.ts` - Simple HTTP server
- `rest-api.ts` - REST API with routing
- `file-server.ts` - Static file server

## License

MIT
