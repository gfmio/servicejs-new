# @servicejs/server-tcp-bun

TCP server adapter for ServiceJS using Bun's native TCP API.

**⚠️ Experimental**: This adapter uses Bun's `socket` mode in `Bun.serve()` which is still evolving. For production use, consider using `@servicejs/server-tcp-node` instead.

## Installation

```bash
bun add @servicejs/server-tcp-bun
```

## Features

- 🚀 Built on Bun's native TCP server
- 🔌 Bidirectional communication
- 📡 Broadcasting support
- 🔐 Connection tracking
- ⚡ High performance
- 🛡️ Type-safe with TypeScript
- 🎯 Capability-based API

## Usage

```typescript
import { createTCPServer } from '@servicejs/server-tcp-bun';

const server = createTCPServer();

// Initialize with configuration
await server.init({ port: 3000 });

// Handle connections
server.onConnection((connection) => {
  console.log(`New connection: ${connection.id}`);
});

// Handle incoming data
server.onData(async (connectionId, data) => {
  console.log(`Received from ${connectionId}:`, data.toString());

  // Echo back
  await server.send(connectionId, data);
});

// Handle disconnections
server.onClose((connectionId) => {
  console.log(`Connection closed: ${connectionId}`);
});

// Start the server
await server.start();
```

## API

### `createTCPServer()`

Creates a new TCP server adapter instance.

### Configuration

```typescript
interface TCPServerConfig {
  port: number;                  // Port to listen on
  hostname?: string;             // Hostname (default: '0.0.0.0')
  maxConnections?: number;       // Max concurrent connections
  timeout?: number;              // Connection timeout in ms
}
```

### Methods

- `init(config: TCPServerConfig): Promise<Result<void, Error>>` - Initialize server
- `start(): Promise<Result<void, Error>>` - Start listening
- `stop(): Promise<Result<void, Error>>` - Stop server and close connections
- `destroy(): Promise<Result<void, Error>>` - Cleanup resources
- `health(): Promise<Result<boolean, Error>>` - Check server health
- `send(connectionId: string, data: Buffer | string): Promise<Result<void, Error>>` - Send to connection
- `broadcast(data: Buffer | string): Promise<Result<void, Error>>` - Send to all connections
- `closeConnection(connectionId: string): Promise<Result<void, Error>>` - Close specific connection
- `getConnections(): Promise<Result<TCPConnection[], Error>>` - Get active connections

### Event Handlers

- `onConnection(handler: ConnectionHandler)` - New connection
- `onData(handler: DataHandler)` - Data received
- `onClose(handler: CloseHandler)` - Connection closed
- `onError(handler: ErrorHandler)` - Error occurred

## Examples

See the [examples](./examples) directory for:

- `echo-server.ts` - Simple echo server
- `chat-server.ts` - Multi-user chat server
- `connection-manager.ts` - Connection limits and timeouts

## License

MIT
