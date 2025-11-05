# @servicejs/server-http2-node

Node.js HTTP/2 Server adapter for ServiceJS - capability-based HTTP/2 server with stream multiplexing.

## Features

- **HTTP/2 Protocol**: Modern HTTP with multiplexing and server push
- **Stream Multiplexing**: Multiple requests over single connection
- **TLS Support**: Optional HTTPS with HTTP/2
- **HTTP/1.1 Fallback**: Optional fallback for older clients
- **Request/Response Handling**: Handle HTTP/2 streams as messages
- **Type-Safe**: Full TypeScript support with Result types

## Installation

```bash
bun add @servicejs/server-http2-node @servicejs/result
```

## Usage

### Plain HTTP/2 Server

```typescript
import { createHTTP2Server } from '@servicejs/server-http2-node';

const server = createHTTP2Server();

await server.init({
  port: 3000,
});

server.onRequest((request) => {
  return {
    statusCode: 200,
    headers: { 'content-type': 'text/plain' },
    body: 'Hello from HTTP/2!',
  };
});

await server.start();
```

### Secure HTTP/2 (h2)

```typescript
import * as fs from 'fs';

const server = createHTTP2Server();

await server.init({
  port: 3443,
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
  allowHTTP1: true, // Allow HTTP/1.1 fallback
});

server.onRequest((request) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'HTTP/2 is fast!' }),
  };
});

await server.start();
```

## API Reference

### `createHTTP2Server(): HTTP2ServerAdapter`

Creates a new HTTP/2 server adapter instance.

### Configuration

```typescript
interface HTTP2ServerConfig {
  host?: string;
  port: number;
  key?: string | Buffer;      // For HTTPS (h2)
  cert?: string | Buffer;     // For HTTPS (h2)
  allowHTTP1?: boolean;       // Allow HTTP/1.1 fallback
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
- `getActiveStreams()` - Get count of active streams

### Request/Response Types

```typescript
interface HTTP2Request {
  id: string;
  method: string;
  url: string;
  headers: IncomingHttpHeaders;
  body: Buffer;
  query: Record<string, string | string[]>;
}

interface HTTP2Response {
  statusCode: number;
  headers?: Record<string, string | string[]>;
  body: string | Buffer;
}
```

## HTTP/2 Benefits

- **Multiplexing**: Multiple requests over one connection
- **Header Compression**: Reduced overhead with HPACK
- **Server Push**: Proactive resource sending (if implemented)
- **Binary Protocol**: More efficient than HTTP/1.1 text
- **Stream Prioritization**: Better resource allocation

## Testing

Test with curl:

```bash
# HTTP/2 cleartext (h2c)
curl --http2-prior-knowledge http://localhost:3000

# HTTP/2 secure (h2)
curl --http2 https://localhost:3443
```

## Notes

- Plain HTTP/2 (h2c) is supported but rarely used in production
- Most browsers require TLS for HTTP/2 (h2)
- HTTP/2 is backward compatible with HTTP/1.1 when `allowHTTP1: true`
- Stream multiplexing improves performance for multiple requests
- Use HTTPS with HTTP/2 for production deployments

## License

MIT
