# @servicejs/server-websocket-bun

WebSocket server adapter for ServiceJS using Bun's native WebSocket support.

## Installation

```bash
bun add @servicejs/server-websocket-bun
```

## Features

- 🚀 Built on Bun's ultra-fast WebSocket implementation
- 🔥 High performance bidirectional communication
- 📡 Broadcasting support
- 🔌 Text and binary messages
- 💓 Ping/pong heartbeat
- 🗜️ Per-message deflate compression
- 🛡️ Type-safe with TypeScript
- 🎯 Capability-based API

## Usage

```typescript
import { createWebSocketServer } from '@servicejs/server-websocket-bun';

const server = createWebSocketServer();

await server.init({ port: 3000 });

server.onConnection((connection) => {
  console.log(`New connection: ${connection.id}`);
});

server.onMessage(async (connectionId, data, isBinary) => {
  console.log(`Received from ${connectionId}:`, data.toString());

  // Echo back
  await server.send(connectionId, data, isBinary);
});

await server.start();
```

## API

### `createWebSocketServer()`

Creates a new WebSocket server adapter instance.

### Configuration

```typescript
interface WebSocketServerConfig {
  port: number;                  // Port to listen on
  hostname?: string;             // Hostname (default: '0.0.0.0')
  path?: string;                 // WebSocket path (default: '/')
  perMessageDeflate?: boolean;   // Compression (default: false)
  maxPayloadLength?: number;     // Max message size (default: 16MB)
  idleTimeout?: number;          // Idle timeout in seconds (default: 120)
}
```

### Methods

- `init(config: WebSocketServerConfig): Promise<Result<void, Error>>` - Initialize server
- `start(): Promise<Result<void, Error>>` - Start listening
- `stop(): Promise<Result<void, Error>>` - Stop server and close connections
- `destroy(): Promise<Result<void, Error>>` - Cleanup resources
- `health(): Promise<Result<boolean, Error>>` - Check server health
- `send(connectionId: string, data: Buffer | string, isBinary?: boolean): Promise<Result<void, Error>>` - Send to connection
- `broadcast(data: Buffer | string, isBinary?: boolean): Promise<Result<void, Error>>` - Send to all connections
- `closeConnection(connectionId: string, code?: number, reason?: string): Promise<Result<void, Error>>` - Close connection
- `ping(connectionId: string, data?: Buffer): Promise<Result<void, Error>>` - Send ping
- `getConnections(): Promise<Result<WSConnection[], Error>>` - Get active connections

### Event Handlers

- `onConnection(handler: ConnectionHandler)` - New connection
- `onMessage(handler: MessageHandler)` - Message received
- `onClose(handler: CloseHandler)` - Connection closed
- `onError(handler: ErrorHandler)` - Error occurred
- `onPing(handler: PingHandler)` - Ping received
- `onPong(handler: PongHandler)` - Pong received

## Examples

See the [examples](./examples) directory for:

- `echo-server.ts` - Simple echo server
- `chat-server.ts` - Multi-user chat server
- `realtime-updates.ts` - Pub/sub with real-time updates

## License

MIT
