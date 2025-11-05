# @servicejs/server-https-node

Node.js HTTPS Server adapter for ServiceJS - capability-based HTTPS server with TLS support.

## Features

- **TLS/SSL Support**: Secure HTTPS with certificate management
- **Same API as HTTP**: Compatible with HTTP server adapter
- **Certificate Options**: Support for key, cert, CA, and passphrase
- **Request/Response Handling**: Handle HTTPS requests as messages
- **Type-Safe**: Full TypeScript support with Result types

## Installation

```bash
bun add @servicejs/server-https-node @servicejs/result
```

## Usage

### Basic HTTPS Server

```typescript
import { createHTTPSServer } from '@servicejs/server-https-node';
import * as fs from 'fs';

const server = createHTTPSServer();

await server.init({
  port: 3443,
  key: fs.readFileSync('path/to/key.pem'),
  cert: fs.readFileSync('path/to/cert.pem'),
});

server.onRequest((request) => {
  return {
    statusCode: 200,
    headers: { 'content-type': 'text/plain' },
    body: 'Hello from HTTPS!',
  };
});

await server.start();
```

### With Self-Signed Certificate

For development, you can generate a self-signed certificate:

```bash
openssl req -nodes -new -x509 -keyout key.pem -out cert.pem -days 365
```

## API Reference

### `createHTTPSServer(): HTTPSServerAdapter`

Creates a new HTTPS server adapter instance.

### Configuration

```typescript
interface HTTPSServerConfig {
  host?: string;
  port: number;
  key: string | Buffer;       // Private key (required)
  cert: string | Buffer;      // Certificate (required)
  ca?: string | Buffer;       // Certificate authority
  passphrase?: string;        // Private key passphrase
  keepAliveTimeout?: number;
  headersTimeout?: number;
  requestTimeout?: number;
}
```

### Methods

Same as HTTP server adapter:

- `init(config)` - Initialize with configuration
- `start()` - Start the server
- `stop()` - Stop the server
- `destroy()` - Clean up resources
- `health()` - Check if running
- `onRequest(handler)` - Register request handler
- `onError(handler)` - Register error handler
- `getActiveRequests()` - Get count of active requests

## Notes

- Requires valid TLS certificate and private key
- Use Let's Encrypt for production certificates
- Self-signed certificates work for development
- Clients must trust the certificate (or use `--insecure` for testing)
- Same request/response API as HTTP server

## License

MIT
