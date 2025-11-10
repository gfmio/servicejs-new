# @servicejs/server-websocket-node

Node.js WebSocket Server adapter for ServiceJS - capability-based WebSocket server with bidirectional real-time communication.

## Features

- **Bidirectional Communication**: Full-duplex real-time messaging
- **Connection Management**: Track and manage WebSocket connections
- **Broadcasting**: Send messages to all connected clients
- **Binary Support**: Handle both text and binary messages
- **Ping/Pong**: Built-in heartbeat mechanism
- **Custom Paths**: Support for custom WebSocket endpoints
- **Message Compression**: Per-message deflate compression support
- **Type-Safe**: Full TypeScript support with Result types

## Installation

```bash
bun add @servicejs/server-websocket-node @servicejs/result
```

## Usage

### Basic Echo Server

```typescript
import { createWebSocketServer } from '@servicejs/server-websocket-node';
import { isOk } from '@servicejs/result';

const server = createWebSocketServer();

await server.init({ port: 3000 });

server.onConnection((connection) => {
  console.log('Client connected:', connection.id);
});

server.onMessage(async (message) => {
  // Echo back
  await server.send(message.connectionId, message.data, message.isBinary);
});

await server.start();
```

### Chat Server

```typescript
const server = createWebSocketServer();
await server.init({ port: 3000 });

const users = new Map();

server.onConnection(async (connection) => {
  await server.send(connection.id, 'Welcome! Send your name to join.');
});

server.onMessage(async (message) => {
  const data = JSON.parse(message.data.toString());

  if (data.type === 'join') {
    users.set(message.connectionId, data.name);

    // Broadcast to all
    await server.broadcast(JSON.stringify({
      type: 'user-joined',
      name: data.name
    }));
  } else if (data.type === 'message') {
    const userName = users.get(message.connectionId);

    await server.broadcast(JSON.stringify({
      type: 'message',
      from: userName,
      text: data.text
    }));
  }
});

await server.start();
```

### Real-time Updates with Subscriptions

```typescript
const server = createWebSocketServer();
await server.init({ port: 3000 });

const subscriptions = new Map(); // topic -> Set<connectionId>

server.onMessage(async (message) => {
  const data = JSON.parse(message.data.toString());

  if (data.type === 'subscribe') {
    if (!subscriptions.has(data.topic)) {
      subscriptions.set(data.topic, new Set());
    }
    subscriptions.get(data.topic).add(message.connectionId);
  }
});

// Publish updates to subscribers
async function publishToTopic(topic, data) {
  const subscribers = subscriptions.get(topic);
  if (!subscribers) return;

  for (const connId of subscribers) {
    await server.send(connId, JSON.stringify({
      type: 'update',
      topic,
      data
    }));
  }
}

await server.start();

// Simulate real-time updates
setInterval(() => {
  publishToTopic('stock:AAPL', { price: Math.random() * 200 });
}, 1000);
```

## API Reference

### `createWebSocketServer(): WebSocketServerAdapter`

Creates a new WebSocket server adapter instance.

### Configuration

```typescript
interface WebSocketServerConfig {
  host?: string;              // Default: '0.0.0.0'
  port: number;               // Required
  path?: string;              // WebSocket endpoint path
  perMessageDeflate?: boolean;// Enable compression (default: true)
  maxPayload?: number;        // Max message size (default: 100MB)
  clientTracking?: boolean;   // Track clients (default: true)
}
```

### Lifecycle Methods

#### `init(config: WebSocketServerConfig): Promise<Result<void, Error>>`

Initialize the server with configuration.

#### `start(): Promise<Result<void, Error>>`

Start the WebSocket server.

#### `stop(): Promise<Result<void, Error>>`

Stop the server and close all connections.

#### `destroy(): Promise<Result<void, Error>>`

Destroy the server and clean up resources.

#### `health(): Promise<Result<boolean, Error>>`

Check if the server is running and healthy.

### Event Handlers

#### `onConnection(handler: (connection: WSConnection) => void | Promise<void>): void`

Register a handler for new connections.

```typescript
export interface WSConnection {
  id: string;
  remoteAddress?: string;
  protocol?: string;
  extensions?: string;
}
```

#### `onMessage(handler: (message: WSMessage) => void | Promise<void>): void`

Register a handler for incoming messages.

```typescript
export interface WSMessage {
  connectionId: string;
  data: Buffer | string;
  isBinary: boolean;
}
```

#### `onClose(handler: (connectionId: string, code: number, reason: string) => void): void`

Register a handler for connection closures.

#### `onError(handler: (error: Error, connectionId?: string) => void): void`

Register a handler for errors.

#### `onPing(handler: (connectionId: string, data: Buffer) => void): void`

Register a handler for ping frames.

#### `onPong(handler: (connectionId: string, data: Buffer) => void): void`

Register a handler for pong frames.

### Communication Methods

#### `send(connectionId: string, data: string | Buffer, isBinary?: boolean): Promise<Result<void, Error>>`

Send a message to a specific connection.

#### `broadcast(data: string | Buffer, isBinary?: boolean): Promise<Result<void, Error>>`

Broadcast a message to all connected clients.

#### `closeConnection(connectionId: string, code?: number, reason?: string): Promise<Result<void, Error>>`

Close a specific connection.

Close codes:
- `1000` - Normal closure
- `1001` - Going away
- `1002` - Protocol error
- `1003` - Unsupported data
- `1008` - Policy violation
- `1011` - Server error

#### `ping(connectionId: string, data?: Buffer): Promise<Result<void, Error>>`

Send a ping frame to a connection.

#### `getConnections(): Promise<Result<WSConnection[], Error>>`

Get all active connections.

## Examples

See the `examples/` directory:

- **`echo-server.ts`** - Simple echo server
- **`chat-server.ts`** - Multi-user chat with JSON protocol
- **`realtime-updates.ts`** - Pub/sub with real-time data streaming

Run examples:

```bash
bun run examples/echo-server.ts
bun run examples/chat-server.ts
bun run examples/realtime-updates.ts
```

Connect with:
- **wscat**: `wscat -c ws://localhost:3000`
- **Browser**: `const ws = new WebSocket('ws://localhost:3000')`
- **Node.js**: `const WebSocket = require('ws'); const ws = new WebSocket('ws://localhost:3000')`

## Testing

```bash
bun test
```

## WebSocket Protocol

WebSocket provides full-duplex communication over a single TCP connection:

- **Upgrade**: HTTP connection upgraded to WebSocket
- **Framing**: Messages sent in frames (text or binary)
- **Close Handshake**: Graceful connection termination
- **Ping/Pong**: Keepalive mechanism

## Common Patterns

### Heartbeat

```typescript
server.onConnection(async (connection) => {
  const interval = setInterval(async () => {
    await server.ping(connection.id);
  }, 30000); // Every 30 seconds

  server.onClose((connId) => {
    if (connId === connection.id) {
      clearInterval(interval);
    }
  });
});
```

### Authentication

```typescript
const authenticated = new Set();

server.onMessage(async (message) => {
  if (!authenticated.has(message.connectionId)) {
    // Require auth first
    const data = JSON.parse(message.data.toString());
    if (data.type === 'auth' && data.token === 'secret') {
      authenticated.add(message.connectionId);
      await server.send(message.connectionId, JSON.stringify({ type: 'authenticated' }));
    } else {
      await server.closeConnection(message.connectionId, 1008, 'Unauthorized');
    }
  } else {
    // Handle authenticated messages
  }
});
```

### Room/Channel System

```typescript
const rooms = new Map(); // roomId -> Set<connectionId>

function joinRoom(connectionId, roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId).add(connectionId);
}

async function broadcastToRoom(roomId, data) {
  const members = rooms.get(roomId);
  if (!members) return;

  for (const connId of members) {
    await server.send(connId, data);
  }
}
```

## Notes

- WebSocket connections are persistent and bidirectional
- All event handlers support both sync and async functions
- Automatic ping/pong handling for connection keepalive
- Connections are tracked with unique IDs for easy management
- Broadcast efficiently sends to all open connections
- Result types ensure type-safe error handling throughout

## License

MIT
