# @servicejs/server-tcp-node

Node.js TCP Server adapter for ServiceJS - capability-based TCP server with connection management and message handling.

## Features

- **Connection Management**: Track and manage multiple client connections
- **Message-Based Communication**: Handle data as messages with connection IDs
- **Event-Driven**: Subscribe to connection, data, error, and close events
- **Bidirectional Communication**: Send data to specific connections
- **Connection Tracking**: Query active connections and their details
- **Graceful Shutdown**: Cleanly close all connections on shutdown
- **Type-Safe**: Full TypeScript support with Result types

## Installation

```bash
bun add @servicejs/server-tcp-node @servicejs/result
```

## Usage

### Basic Echo Server

```typescript
import { createTCPServer } from '@servicejs/server-tcp-node';
import { isOk } from '@servicejs/result';

const server = createTCPServer();

await server.init({
  port: 3000,
  host: 'localhost',
});

server.onConnection((connection) => {
  console.log('New connection:', connection.id);
});

server.onData(async (message) => {
  console.log('Received:', message.data.toString());
  // Echo back
  await server.send(message.connectionId, message.data);
});

await server.start();
```

### Chat Server

```typescript
const server = createTCPServer();
await server.init({ port: 3000 });

const usernames = new Map<string, string>();

server.onConnection((connection) => {
  const username = `User${connection.id.split('_')[1]}`;
  usernames.set(connection.id, username);

  server.send(connection.id, `Welcome ${username}!\n`);
  broadcastMessage(`${username} joined the chat\n`, connection.id);
});

server.onData(async (message) => {
  const username = usernames.get(message.connectionId);
  const text = message.data.toString().trim();

  if (text) {
    await broadcastMessage(`${username}: ${text}\n`);
  }
});

async function broadcastMessage(text: string, excludeId?: string) {
  const connections = await server.getConnections();
  if (isOk(connections)) {
    for (const conn of connections.value) {
      if (conn.id !== excludeId) {
        await server.send(conn.id, text);
      }
    }
  }
}

await server.start();
```

### Connection Management

```typescript
const server = createTCPServer();
await server.init({ port: 3000, backlog: 100 });

server.onConnection(async (connection) => {
  console.log(`New connection: ${connection.id}`);
  console.log(`Remote: ${connection.remoteAddress}:${connection.remotePort}`);

  // Send welcome
  await server.send(connection.id, 'Connected!\n');
});

server.onData(async (message) => {
  const command = message.data.toString().trim();

  if (command === 'connections') {
    const connections = await server.getConnections();
    if (isOk(connections)) {
      const list = connections.value
        .map(c => `${c.id}: ${c.remoteAddress}:${c.remotePort}`)
        .join('\n');
      await server.send(message.connectionId, list + '\n');
    }
  } else if (command === 'close') {
    await server.closeConnection(message.connectionId);
  }
});

await server.start();
```

## API Reference

### `createTCPServer(): TCPServerAdapter`

Creates a new TCP server adapter instance.

### Configuration

```typescript
interface TCPServerConfig {
  host?: string;           // Default: '0.0.0.0'
  port: number;            // Required
  backlog?: number;        // Default: 511
  allowHalfOpen?: boolean; // Default: false
}
```

### Lifecycle Methods

#### `init(config: TCPServerConfig): Promise<Result<void, Error>>`

Initialize the server with configuration.

#### `start(): Promise<Result<void, Error>>`

Start listening for connections.

#### `stop(): Promise<Result<void, Error>>`

Stop the server and close all connections.

#### `destroy(): Promise<Result<void, Error>>`

Destroy the server and clean up resources.

#### `health(): Promise<Result<boolean, Error>>`

Check if the server is running and healthy.

### Event Handlers

#### `onConnection(handler: (connection: TCPConnection) => void | Promise<void>): void`

Register a handler for new connections.

```typescript
export interface TCPConnection {
  id: string;
  remoteAddress?: string;
  remotePort?: number;
  localAddress?: string;
  localPort?: number;
}
```

#### `onData(handler: (message: TCPMessage) => void | Promise<void>): void`

Register a handler for incoming data.

```typescript
export interface TCPMessage {
  connectionId: string;
  data: Buffer;
}
```

#### `onError(handler: (error: Error, connectionId?: string) => void): void`

Register a handler for errors.

#### `onClose(handler: (connectionId: string) => void): void`

Register a handler for connection closures.

### Connection Methods

#### `send(connectionId: string, data: Buffer | string): Promise<Result<void, Error>>`

Send data to a specific connection.

#### `closeConnection(connectionId: string): Promise<Result<void, Error>>`

Close a specific connection.

#### `getConnections(): Promise<Result<TCPConnection[], Error>>`

Get all active connections.

## Examples

See the `examples/` directory:

- **`echo-server.ts`** - Simple echo server that reflects data back
- **`chat-server.ts`** - Multi-user chat server with broadcasting
- **`connection-manager.ts`** - Connection tracking and server statistics

Run examples:

```bash
bun run examples/echo-server.ts
bun run examples/chat-server.ts
bun run examples/connection-manager.ts
```

Connect with netcat:

```bash
nc localhost 3000
```

## Testing

```bash
bun test
```

## Notes

- All event handlers support both synchronous and asynchronous functions
- Errors in handlers are caught and passed to the error handler
- Connections are automatically cleaned up on close
- The server tracks connections with unique IDs for easy management
- Result types ensure type-safe error handling throughout

## License

MIT
