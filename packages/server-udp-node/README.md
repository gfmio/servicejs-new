# @servicejs/server-udp-node

Node.js UDP Server adapter for ServiceJS - capability-based UDP datagram server with broadcast and multicast support.

## Features

- **Datagram Messaging**: Handle UDP datagrams as messages
- **Bidirectional Communication**: Send datagrams to any address
- **Broadcast Support**: Enable UDP broadcast for network-wide messages
- **Multicast Support**: Join/leave multicast groups for group communication
- **Event-Driven**: Subscribe to message, error, and listening events
- **IPv4 and IPv6**: Support for both IP versions
- **Type-Safe**: Full TypeScript support with Result types

## Installation

```bash
bun add @servicejs/server-udp-node @servicejs/result
```

## Usage

### Basic Echo Server

```typescript
import { createUDPServer } from '@servicejs/server-udp-node';
import { isOk } from '@servicejs/result';

const server = createUDPServer();

await server.init({
  port: 3000,
  host: 'localhost',
  type: 'udp4',
});

server.onMessage(async (message) => {
  console.log('Received:', message.data.toString());
  console.log('From:', `${message.remote.address}:${message.remote.port}`);

  // Echo back to sender
  await server.send(
    message.data,
    message.remote.port,
    message.remote.address
  );
});

await server.start();
```

### Broadcast Server

```typescript
const server = createUDPServer();

await server.init({
  port: 3000,
  host: '0.0.0.0',
  type: 'udp4',
  reuseAddr: true,
});

const clients = new Map();

server.onMessage(async (message) => {
  const clientKey = `${message.remote.address}:${message.remote.port}`;
  clients.set(clientKey, { ...message.remote, lastSeen: new Date() });

  const text = message.data.toString();

  if (text.startsWith('BROADCAST:')) {
    const msg = text.substring(10);

    // Broadcast to all known clients
    for (const client of clients.values()) {
      await server.send(`[${clientKey}] ${msg}`, client.port, client.address);
    }
  }
});

await server.start();

// Enable broadcast
await server.setBroadcast(true);
```

### Multicast Server

```typescript
const MULTICAST_ADDRESS = '239.255.255.250';
const MULTICAST_PORT = 3000;

const server = createUDPServer();

await server.init({
  port: MULTICAST_PORT,
  host: '0.0.0.0',
  type: 'udp4',
  reuseAddr: true,
});

server.onMessage(async (message) => {
  console.log('Received:', message.data.toString());

  // Send to multicast group
  await server.send(
    'Response to all',
    MULTICAST_PORT,
    MULTICAST_ADDRESS
  );
});

await server.start();

// Join multicast group
await server.addMembership(MULTICAST_ADDRESS);

// Set multicast TTL
await server.setMulticastTTL(128);
```

## API Reference

### `createUDPServer(): UDPServerAdapter`

Creates a new UDP server adapter instance.

### Configuration

```typescript
interface UDPServerConfig {
  host?: string;           // Default: '0.0.0.0'
  port: number;            // Required
  type?: 'udp4' | 'udp6';  // Default: 'udp4'
  reuseAddr?: boolean;     // Default: false
}
```

### Lifecycle Methods

#### `init(config: UDPServerConfig): Promise<Result<void, Error>>`

Initialize the server with configuration.

#### `start(): Promise<Result<void, Error>>`

Start listening for datagrams.

#### `stop(): Promise<Result<void, Error>>`

Stop the server and close the socket.

#### `destroy(): Promise<Result<void, Error>>`

Destroy the server and clean up resources.

#### `health(): Promise<Result<boolean, Error>>`

Check if the server is running and healthy.

### Event Handlers

#### `onMessage(handler: (message: UDPMessage) => void | Promise<void>): void`

Register a handler for incoming datagrams.

```typescript
export interface UDPMessage {
  data: Buffer;
  remote: UDPRemoteInfo;
}

export interface UDPRemoteInfo {
  address: string;
  family: 'IPv4' | 'IPv6';
  port: number;
  size: number;
}
```

#### `onError(handler: (error: Error) => void): void`

Register a handler for errors.

#### `onListening(handler: () => void): void`

Register a handler called when the server starts listening.

### Datagram Methods

#### `send(data: Buffer | string, port: number, address: string): Promise<Result<void, Error>>`

Send a datagram to a specific address and port.

### Broadcast Methods

#### `setBroadcast(enabled: boolean): Promise<Result<void, Error>>`

Enable or disable broadcast mode.

### Multicast Methods

#### `setMulticastTTL(ttl: number): Promise<Result<void, Error>>`

Set the multicast TTL (time-to-live).

#### `addMembership(multicastAddress: string, multicastInterface?: string): Promise<Result<void, Error>>`

Join a multicast group.

#### `dropMembership(multicastAddress: string, multicastInterface?: string): Promise<Result<void, Error>>`

Leave a multicast group.

## Examples

See the `examples/` directory:

- **`echo-server.ts`** - Simple echo server that reflects datagrams back
- **`broadcast-server.ts`** - Network discovery and broadcast messaging
- **`multicast-server.ts`** - Multicast group communication

Run examples:

```bash
bun run examples/echo-server.ts
bun run examples/broadcast-server.ts
bun run examples/multicast-server.ts
```

Send datagrams with netcat:

```bash
# Unicast
echo "Hello" | nc -u localhost 3000

# Broadcast
echo "DISCOVER" | nc -u -b 255.255.255.255 3000

# Multicast
echo "Hello Group" | nc -u 239.255.255.250 3000
```

## Testing

```bash
bun test
```

## Notes

- UDP is connectionless - no connection tracking required
- Datagrams may be lost, reordered, or duplicated (unreliable)
- Maximum datagram size is typically 65,507 bytes (65,535 - 8 byte UDP header - 20 byte IP header)
- Broadcast requires `reuseAddr: true` and `setBroadcast(true)`
- Multicast requires joining the group with `addMembership()`
- All event handlers support both synchronous and asynchronous functions
- Result types ensure type-safe error handling throughout

## License

MIT
