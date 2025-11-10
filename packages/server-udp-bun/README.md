# @servicejs/server-udp-bun

UDP server adapter for ServiceJS using Bun's native UDP API.

## Installation

```bash
bun add @servicejs/server-udp-bun
```

## Features

- 🚀 Built on Bun's native UDP socket API
- 📨 Datagram message handling
- 📡 Broadcasting support
- 🎯 Efficient batch sending with `sendMany`
- 🔄 Backpressure handling with drain events
- ⚡ High performance, low latency
- 🛡️ Type-safe with TypeScript
- 🎯 Capability-based API

## Usage

### Basic Echo Server

```typescript
import { createUDPServer } from '@servicejs/server-udp-bun';

const server = createUDPServer();

// Initialize with configuration
await server.init({ port: 41234 });

// Handle incoming messages
server.onMessage(async (message) => {
  console.log(`From ${message.remote.address}:${message.remote.port}:`, message.data.toString());

  // Echo back
  await server.send(message.data, message.remote.port, message.remote.address);
});

// Start the server
await server.start();
```

### Broadcasting

```typescript
import { createUDPServer } from '@servicejs/server-udp-bun';

const server = createUDPServer();
await server.init({ port: 41235 });

// Enable broadcast mode
await server.setBroadcast(true);

server.onMessage(async (message) => {
  console.log('Received:', message.data.toString());
});

await server.start();

// Broadcast to all on local network
await server.send('Hello, everyone!', 41235, '255.255.255.255');
```

### Batch Sending

```typescript
import { createUDPServer } from '@servicejs/server-udp-bun';

const server = createUDPServer();
await server.init({ port: 41236 });
await server.start();

// Send multiple messages efficiently
const messages = [
  { data: 'Message 1', port: 41237, address: '127.0.0.1' },
  { data: 'Message 2', port: 41238, address: '127.0.0.1' },
  { data: 'Message 3', port: 41239, address: '127.0.0.1' },
];

const result = await server.sendMany(messages);
if (result.ok) {
  console.log(`Sent ${result.value} messages`);
}
```

### Handling Backpressure

```typescript
server.onDrain(() => {
  console.log('Socket is writable again, resume sending');
  // Resume sending messages that were queued
});

// send() returns false if backpressure occurs
const result = await server.send(data, port, address);
```

## API

### `createUDPServer()`

Creates a new UDP server adapter instance.

### Configuration

```typescript
interface UDPServerConfig {
  port: number;                  // Port to bind to
  hostname?: string;             // Hostname (default: '0.0.0.0')
  type?: 'udp4' | 'udp6';       // Socket type (default: 'udp4')
  reuseAddr?: boolean;          // Enable SO_REUSEADDR (default: false)
}
```

### Methods

- `init(config: UDPServerConfig): Promise<Result<void, Error>>` - Initialize server
- `start(): Promise<Result<void, Error>>` - Start listening
- `stop(): Promise<Result<void, Error>>` - Stop server
- `destroy(): Promise<Result<void, Error>>` - Cleanup resources
- `health(): Promise<Result<boolean, Error>>` - Check server health
- `send(data: Buffer | string, port: number, address: string): Promise<Result<void, Error>>` - Send message
- `sendMany(messages: Array<...>): Promise<Result<number, Error>>` - Send multiple messages (batch)
- `setBroadcast(enabled: boolean): Promise<Result<void, Error>>` - Enable/disable broadcast
- `setMulticastTTL(ttl: number): Promise<Result<void, Error>>` - Set multicast TTL
- `addMembership(multicastAddress: string, multicastInterface?: string): Promise<Result<void, Error>>` - Join multicast group
- `dropMembership(multicastAddress: string, multicastInterface?: string): Promise<Result<void, Error>>` - Leave multicast group
- `getAddress(): Promise<Result<{ address: string; port: number; family: string }, Error>>` - Get local address

### Event Handlers

- `onMessage(handler: MessageHandler)` - Incoming message
- `onError(handler: ErrorHandler)` - Error occurred
- `onListening(handler: ListeningHandler)` - Server started listening
- `onDrain(handler: DrainHandler)` - Socket ready after backpressure

### Message Interface

```typescript
interface UDPMessage {
  data: Buffer;                  // Message data
  remote: {
    address: string;             // Sender IP address
    port: number;                // Sender port
    family: 'IPv4' | 'IPv6';    // Address family
  };
}
```

## Examples

See the [examples](./examples) directory for:

- `echo-server.ts` - Simple echo server
- `broadcast-server.ts` - Broadcasting with client discovery
- `batch-sender.ts` - Efficient batch sending with performance comparison

## Performance

Bun's UDP socket API is optimized for low-latency, real-time applications. The `sendMany` method allows batching multiple packets for maximum throughput, which is especially useful for:

- Voice/video streaming
- Game servers
- IoT data collection
- Real-time telemetry

## Limitations

- Multicast methods (`setMulticastTTL`, `addMembership`, `dropMembership`) are currently not exposed by Bun's UDP API
- Broadcast mode (`setBroadcast`) works automatically when sending to broadcast addresses

## Testing

```bash
bun test
```

## License

MIT
