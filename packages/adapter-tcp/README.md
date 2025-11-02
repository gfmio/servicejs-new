# @servicejs/adapter-tcp

TCP client adapter for low-level socket communication with binary protocol support.

## Features

- **Binary Protocol Support**: Send/receive Buffer and string data
- **Connection Management**: Full lifecycle control over TCP connections
- **Connection Tracking**: Monitor bytes read/written
- **Type-Safe API**: Full TypeScript support with Result types
- **Configurable Options**: Timeout, keepAlive, and TCP_NODELAY support

## Installation

```bash
npm install @servicejs/adapter-tcp
```

## Basic Usage

```typescript
import { createTCPAdapter } from '@servicejs/adapter-tcp';
import { isOk } from '@servicejs/result';

const adapter = createTCPAdapter();

// Initialize
await adapter.init({
  host: 'localhost',
  port: 8080,
  timeout: 30000,
  keepAlive: true,
  noDelay: true
});

// Connect
const connectResult = await adapter.connect();
if (isOk(connectResult)) {
  console.log('Connected:', connectResult.value);
  // { host: 'localhost', port: 8080, connected: true, bytesRead: 0, bytesWritten: 0 }
}

// Send string data
const sendResult = await adapter.send('Hello, server!');
if (isOk(sendResult)) {
  console.log(`Sent ${sendResult.value} bytes`);
}

// Receive data
const receiveResult = await adapter.receive(1024);
if (isOk(receiveResult)) {
  console.log('Received:', receiveResult.value.toString());
}

// Disconnect
await adapter.disconnect();
```

## Examples

### Binary Protocol Communication

```typescript
import { createTCPAdapter } from '@servicejs/adapter-tcp';
import { isOk } from '@servicejs/result';

const adapter = createTCPAdapter();
await adapter.init({ host: 'localhost', port: 9000 });
await adapter.connect();

// Send binary data (e.g., protocol buffers, custom binary format)
const message = Buffer.alloc(16);
message.writeUInt32BE(0x12345678, 0);  // Magic number
message.writeUInt32BE(42, 4);          // Message type
message.writeBigUInt64BE(BigInt(Date.now()), 8); // Timestamp

const result = await adapter.send(message);
if (isOk(result)) {
  console.log(`Sent ${result.value} bytes`);
}

// Receive response
const response = await adapter.receive(16);
if (isOk(response)) {
  const buffer = response.value;
  const magic = buffer.readUInt32BE(0);
  const type = buffer.readUInt32BE(4);
  console.log(`Received: magic=${magic}, type=${type}`);
}

await adapter.disconnect();
```

### Request-Response Pattern

```typescript
import { createTCPAdapter } from '@servicejs/adapter-tcp';
import { isOk } from '@servicejs/result';

class TCPClient {
  private adapter = createTCPAdapter();

  async connect(host: string, port: number) {
    const initResult = await this.adapter.init({ host, port });
    if (!isOk(initResult)) throw initResult.error;

    const connectResult = await this.adapter.connect();
    if (!isOk(connectResult)) throw connectResult.error;
  }

  async request(data: string): Promise<string> {
    // Send request
    const sendResult = await this.adapter.send(data);
    if (!isOk(sendResult)) throw sendResult.error;

    // Receive response
    const receiveResult = await this.adapter.receive();
    if (!isOk(receiveResult)) throw receiveResult.error;

    return receiveResult.value.toString();
  }

  async disconnect() {
    await this.adapter.disconnect();
  }

  isConnected(): boolean {
    return this.adapter.isConnected();
  }
}

// Usage
const client = new TCPClient();
await client.connect('api.example.com', 8080);

const response = await client.request('GET /status HTTP/1.1\r\n\r\n');
console.log('Response:', response);

await client.disconnect();
```

### Connection Pooling

```typescript
import { createTCPAdapter, type TCPAdapter } from '@servicejs/adapter-tcp';
import { isOk } from '@servicejs/result';

class TCPPool {
  private connections: TCPAdapter[] = [];
  private available: TCPAdapter[] = [];

  constructor(
    private host: string,
    private port: number,
    private poolSize: number = 5
  ) {}

  async init() {
    for (let i = 0; i < this.poolSize; i++) {
      const adapter = createTCPAdapter();
      await adapter.init({ host: this.host, port: this.port });
      await adapter.connect();

      this.connections.push(adapter);
      this.available.push(adapter);
    }
  }

  async acquire(): Promise<TCPAdapter> {
    while (this.available.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return this.available.pop()!;
  }

  release(adapter: TCPAdapter) {
    if (adapter.isConnected()) {
      this.available.push(adapter);
    } else {
      // Reconnect if disconnected
      adapter.connect().then(() => {
        this.available.push(adapter);
      });
    }
  }

  async destroy() {
    for (const conn of this.connections) {
      await conn.disconnect();
    }
  }
}

// Usage
const pool = new TCPPool('localhost', 8080, 10);
await pool.init();

async function sendRequest(data: string) {
  const conn = await pool.acquire();
  try {
    await conn.send(data);
    const response = await conn.receive();
    if (isOk(response)) {
      return response.value.toString();
    }
  } finally {
    pool.release(conn);
  }
}

// Make concurrent requests
const results = await Promise.all([
  sendRequest('Request 1'),
  sendRequest('Request 2'),
  sendRequest('Request 3')
]);

await pool.destroy();
```

### Length-Prefixed Messages

```typescript
import { createTCPAdapter } from '@servicejs/adapter-tcp';
import { isOk } from '@servicejs/result';

class LengthPrefixedClient {
  private adapter = createTCPAdapter();

  async connect(host: string, port: number) {
    await this.adapter.init({ host, port });
    await this.adapter.connect();
  }

  async sendMessage(message: string) {
    // Create length-prefixed message (4-byte length + message)
    const msgBuffer = Buffer.from(message, 'utf8');
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32BE(msgBuffer.length, 0);

    const packet = Buffer.concat([lengthBuffer, msgBuffer]);

    const result = await this.adapter.send(packet);
    if (!isOk(result)) throw result.error;
  }

  async receiveMessage(): Promise<string> {
    // First, read the 4-byte length prefix
    const lengthResult = await this.adapter.receive(4);
    if (!isOk(lengthResult)) throw lengthResult.error;

    const length = lengthResult.value.readUInt32BE(0);

    // Then, read the message of that length
    const messageResult = await this.adapter.receive(length);
    if (!isOk(messageResult)) throw messageResult.error;

    return messageResult.value.toString('utf8');
  }

  async disconnect() {
    await this.adapter.disconnect();
  }
}

// Usage
const client = new LengthPrefixedClient();
await client.connect('localhost', 9000);

await client.sendMessage('Hello, world!');
const response = await client.receiveMessage();
console.log('Received:', response);

await client.disconnect();
```

### Heartbeat / Keep-Alive

```typescript
import { createTCPAdapter } from '@servicejs/adapter-tcp';
import { isOk } from '@servicejs/result';

class HeartbeatClient {
  private adapter = createTCPAdapter();
  private heartbeatInterval?: Timer;

  async connect(host: string, port: number) {
    await this.adapter.init({
      host,
      port,
      keepAlive: true,
      noDelay: true
    });
    await this.adapter.connect();
    this.startHeartbeat();
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(async () => {
      if (!this.adapter.isConnected()) {
        this.stopHeartbeat();
        return;
      }

      const result = await this.adapter.send('PING');
      if (isOk(result)) {
        console.log('Heartbeat sent');
      } else {
        console.error('Heartbeat failed:', result.error);
        this.reconnect();
      }
    }, 30000); // Every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  private async reconnect() {
    console.log('Reconnecting...');
    await this.adapter.disconnect();
    const result = await this.adapter.connect();
    if (isOk(result)) {
      console.log('Reconnected successfully');
    }
  }

  async send(data: string) {
    const result = await this.adapter.send(data);
    if (!isOk(result)) throw result.error;
  }

  async disconnect() {
    this.stopHeartbeat();
    await this.adapter.disconnect();
  }
}

// Usage
const client = new HeartbeatClient();
await client.connect('localhost', 8080);

// Connection will stay alive with automatic heartbeats
await client.send('Important data');

// Clean shutdown
await client.disconnect();
```

### Custom Protocol Implementation

```typescript
import { createTCPAdapter } from '@servicejs/adapter-tcp';
import { isOk } from '@servicejs/result';

// Example: Simple line-delimited protocol
class LineProtocolClient {
  private adapter = createTCPAdapter();
  private buffer = Buffer.alloc(0);

  async connect(host: string, port: number) {
    await this.adapter.init({ host, port });
    await this.adapter.connect();
  }

  async sendLine(line: string) {
    const data = line + '\n';
    const result = await this.adapter.send(data);
    if (!isOk(result)) throw result.error;
  }

  async receiveLine(): Promise<string> {
    while (true) {
      // Check if we have a complete line in buffer
      const newlineIndex = this.buffer.indexOf('\n');
      if (newlineIndex !== -1) {
        const line = this.buffer.subarray(0, newlineIndex).toString('utf8');
        this.buffer = this.buffer.subarray(newlineIndex + 1);
        return line;
      }

      // Read more data
      const result = await this.adapter.receive(1024);
      if (!isOk(result)) throw result.error;

      this.buffer = Buffer.concat([this.buffer, result.value]);
    }
  }

  async disconnect() {
    await this.adapter.disconnect();
  }
}

// Usage
const client = new LineProtocolClient();
await client.connect('localhost', 6379);

await client.sendLine('PING');
const response = await client.receiveLine();
console.log('Response:', response); // "+PONG"

await client.disconnect();
```

## API Reference

### `createTCPAdapter()`

Creates a new TCP adapter instance.

**Returns**: `TCPAdapter`

### Lifecycle Methods

#### `init(config: TCPConfig): Promise<Result<void, Error>>`

Initialize the adapter with configuration.

**Config**:
- `host: string` - Server hostname or IP
- `port: number` - Server port
- `timeout?: number` - Connection timeout in ms (default: 30000)
- `keepAlive?: boolean` - Enable TCP keep-alive (default: true)
- `noDelay?: boolean` - Disable Nagle's algorithm (default: true)

#### `start(): Promise<Result<void, Error>>`

Start the adapter (no-op for TCP).

#### `stop(): Promise<Result<void, Error>>`

Stop the adapter (no-op for TCP).

#### `destroy(): Promise<Result<void, Error>>`

Destroy the adapter and clean up resources.

#### `health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>`

Check adapter health status.

### Connection Methods

#### `connect(): Promise<Result<TCPConnection, Error>>`

Establish TCP connection to the server.

**Returns**: Connection information with host, port, and statistics.

#### `disconnect(): Promise<Result<void, Error>>`

Close the TCP connection.

#### `isConnected(): boolean`

Check if currently connected.

### Data Transfer Methods

#### `send(data: Buffer | string): Promise<Result<number, Error>>`

Send data over the connection.

**Parameters**:
- `data` - Buffer or string to send

**Returns**: Number of bytes written.

#### `receive(size?: number): Promise<Result<Buffer, Error>>`

Receive data from the connection.

**Parameters**:
- `size` - Optional buffer size (default: 1024)

**Returns**: Buffer containing received data.

## Best Practices

1. **Always check Result types**:
   ```typescript
   const result = await adapter.send(data);
   if (isOk(result)) {
     console.log('Success:', result.value);
   } else {
     console.error('Error:', result.error);
   }
   ```

2. **Clean up connections**:
   ```typescript
   try {
     await adapter.connect();
     // ... use connection
   } finally {
     await adapter.disconnect();
   }
   ```

3. **Handle binary data properly**:
   ```typescript
   // Use Buffer for binary protocols
   const data = Buffer.alloc(8);
   data.writeBigInt64BE(BigInt(123), 0);
   await adapter.send(data);
   ```

4. **Implement reconnection logic**:
   ```typescript
   async function connectWithRetry(adapter: TCPAdapter, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       const result = await adapter.connect();
       if (isOk(result)) return result;
       await new Promise(r => setTimeout(r, 1000 * (i + 1)));
     }
     throw new Error('Failed to connect');
   }
   ```

5. **Use connection pooling for high throughput**:
   ```typescript
   // Maintain a pool of connections for concurrent requests
   const pool = new TCPPool('localhost', 8080, 10);
   await pool.init();
   ```

## Production Considerations

This adapter uses a mock implementation for demonstration. For production use:

1. **Bun**: Use `Bun.connect()` for high-performance TCP
2. **Node.js**: Use the `net` module for TCP sockets
3. **Error Handling**: Implement comprehensive error handling and reconnection
4. **Timeouts**: Set appropriate timeouts for your use case
5. **Buffering**: Implement proper buffering for partial reads/writes
6. **TLS**: Consider using TLS for encrypted connections

## License

MIT
