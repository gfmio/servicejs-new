# @servicejs/adapter-grpc

gRPC adapter for ServiceJS, providing type-safe RPC communication with support for unary calls, streaming (server, client, and bidirectional), and Result-based error handling.

## Features

- 🔒 **Type-Safe** - Full TypeScript support with Protocol Buffers
- 📦 **Result-Based** - Integrate with ServiceJS Result types for error handling
- 🚀 **High Performance** - HTTP/2-based binary protocol
- 🌊 **Streaming Support** - Server, client, and bidirectional streaming
- 🔌 **Protocol Buffers** - Efficient serialization with .proto files
- 🌐 **Multi-Language** - Interoperate with services in 10+ languages

## Installation

```bash
bun add @servicejs/adapter-grpc @grpc/grpc-js @grpc/proto-loader
```

You'll also need the Protocol Buffers compiler:

```bash
# macOS
brew install protobuf

# Ubuntu/Debian
apt-get install protobuf-compiler

# Or download from https://protobuf.dev/
```

## Quick Start

### 1. Define Your Service (calculator.proto)

```protobuf
syntax = "proto3";

package calculator;

service Calculator {
  rpc Add (AddRequest) returns (AddResponse);
  rpc Subtract (SubtractRequest) returns (SubtractResponse);
  rpc Multiply (MultiplyRequest) returns (MultiplyResponse);
  rpc Divide (DivideRequest) returns (DivideResponse);
}

message AddRequest {
  int32 a = 1;
  int32 b = 2;
}

message AddResponse {
  int32 result = 1;
}

message SubtractRequest {
  int32 a = 1;
  int32 b = 2;
}

message SubtractResponse {
  int32 result = 1;
}

message MultiplyRequest {
  int32 a = 1;
  int32 b = 2;
}

message MultiplyResponse {
  int32 result = 1;
}

message DivideRequest {
  int32 a = 1;
  int32 b = 2;
}

message DivideResponse {
  int32 result = 1;
}
```

### 2. Implement the Server

```typescript
import { createGRPCServer } from '@servicejs/adapter-grpc';
import path from 'path';

const calculatorService = {
  Add: async (request: { a: number; b: number }) => ({
    result: request.a + request.b,
  }),

  Subtract: async (request: { a: number; b: number }) => ({
    result: request.a - request.b,
  }),

  Multiply: async (request: { a: number; b: number }) => ({
    result: request.a * request.b,
  }),

  Divide: async (request: { a: number; b: number }) => {
    if (request.b === 0) {
      throw new Error('Division by zero');
    }
    return { result: request.a / request.b };
  },
};

const server = createGRPCServer({
  address: '0.0.0.0:50051',
  protoPath: path.join(__dirname, 'calculator.proto'),
  packageName: 'calculator',
  serviceName: 'Calculator',
  service: calculatorService,
  logging: true,
});

const result = await server.listen();
if (result.ok) {
  console.log('Calculator server running on port 50051');
}
```

### 3. Create a Client

```typescript
import { createGRPCClient } from '@servicejs/adapter-grpc';
import { isOk } from '@servicejs/result';
import path from 'path';

const client = createGRPCClient({
  address: 'localhost:50051',
  protoPath: path.join(__dirname, 'calculator.proto'),
  packageName: 'calculator',
  serviceName: 'Calculator',
});

// Unary call with Result-based error handling
const result = await client.unary('Add', { a: 10, b: 5 });

if (isOk(result)) {
  console.log('10 + 5 =', result.value.result); // 15
} else {
  console.error('Error:', result.error);
}

client.close();
```

## Configuration

### Client Configuration

```typescript
interface GRPCClientConfig {
  /**
   * Server address (host:port)
   */
  address: string;

  /**
   * Path to .proto file
   */
  protoPath: string;

  /**
   * Package name
   */
  packageName: string;

  /**
   * Service name
   */
  serviceName: string;

  /**
   * Channel credentials
   * @default insecure
   */
  credentials?: ChannelCredentials;

  /**
   * Proto loader options
   */
  loaderOptions?: Options;
}
```

### Server Configuration

```typescript
interface GRPCServerConfig {
  /**
   * Server address (host:port)
   * @default '0.0.0.0:50051'
   */
  address?: string;

  /**
   * Path to .proto file
   */
  protoPath: string;

  /**
   * Package name
   */
  packageName: string;

  /**
   * Service name
   */
  serviceName: string;

  /**
   * Service implementation
   */
  service: GRPCService;

  /**
   * Server credentials
   * @default insecure
   */
  credentials?: ServerCredentials;

  /**
   * Proto loader options
   */
  loaderOptions?: Options;

  /**
   * Enable request logging
   * @default false
   */
  logging?: boolean;
}
```

## Call Types

gRPC supports four types of RPC calls:

### 1. Unary Calls

One request, one response (like a regular function call):

```typescript
// Server
const service = {
  GetUser: async (request: { id: string }) => {
    const user = await db.findUser(request.id);
    return { user };
  },
};

// Client
const result = await client.unary('GetUser', { id: '123' });
if (isOk(result)) {
  console.log('User:', result.value.user);
}
```

### 2. Server Streaming

One request, stream of responses:

```protobuf
service LogService {
  rpc StreamLogs (LogRequest) returns (stream LogEntry);
}
```

```typescript
// Server
const service = {
  StreamLogs: async function* (request: { query: string }) {
    for await (const log of logs) {
      if (log.message.includes(request.query)) {
        yield { log };
      }
    }
  },
};

// Client
for await (const result of client.serverStream('StreamLogs', { query: 'error' })) {
  if (isOk(result)) {
    console.log('Log:', result.value.log);
  }
}
```

### 3. Client Streaming

Stream of requests, one response:

```protobuf
service AnalyticsService {
  rpc RecordEvents (stream Event) returns (EventSummary);
}
```

```typescript
// Server
const service = {
  RecordEvents: async (events: Event[]) => {
    const count = events.length;
    await db.saveEvents(events);
    return { count };
  },
};

// Client
import { fromArray } from '@servicejs/adapter-grpc';

const events = [
  { type: 'click', timestamp: Date.now() },
  { type: 'view', timestamp: Date.now() },
];

const result = await client.clientStream('RecordEvents', fromArray(events));
if (isOk(result)) {
  console.log('Recorded:', result.value.count, 'events');
}
```

### 4. Bidirectional Streaming

Stream of requests, stream of responses:

```protobuf
service ChatService {
  rpc Chat (stream ChatMessage) returns (stream ChatMessage);
}
```

```typescript
// Server
const service = {
  Chat: async (message: ChatMessage) => {
    // Echo back the message
    return {
      user: 'bot',
      text: `You said: ${message.text}`,
      timestamp: Date.now(),
    };
  },
};

// Client
async function* sendMessages() {
  yield { user: 'alice', text: 'Hello!', timestamp: Date.now() };
  await new Promise((r) => setTimeout(r, 1000));
  yield { user: 'alice', text: 'How are you?', timestamp: Date.now() };
}

for await (const result of client.bidiStream('Chat', sendMessages())) {
  if (isOk(result)) {
    console.log('Received:', result.value);
  }
}
```

## Error Handling

All client calls return Result types for safe error handling:

```typescript
const result = await client.unary('GetUser', { id: '999' });

if (isOk(result)) {
  console.log('User:', result.value.user);
} else {
  // Handle error
  console.error('Error:', result.error.message);

  // Check error type
  if (result.error.message.includes('NOT_FOUND')) {
    console.log('User not found');
  }
}
```

Server-side errors are automatically propagated:

```typescript
const service = {
  GetUser: async (request: { id: string }) => {
    const user = await db.findUser(request.id);
    if (!user) {
      throw new Error('User not found'); // Propagated to client
    }
    return { user };
  },
};
```

## TLS/SSL Support

### Server with TLS

```typescript
import { ServerCredentials } from '@grpc/grpc-js';
import fs from 'fs';

const server = createGRPCServer({
  address: '0.0.0.0:50051',
  protoPath: './service.proto',
  packageName: 'myservice',
  serviceName: 'MyService',
  service: myService,
  credentials: ServerCredentials.createSsl(
    fs.readFileSync('./ca.crt'),
    [
      {
        private_key: fs.readFileSync('./server.key'),
        cert_chain: fs.readFileSync('./server.crt'),
      },
    ],
    true // Check client certificate
  ),
});
```

### Client with TLS

```typescript
import { credentials } from '@grpc/grpc-js';
import fs from 'fs';

const client = createGRPCClient({
  address: 'secure.example.com:50051',
  protoPath: './service.proto',
  packageName: 'myservice',
  serviceName: 'MyService',
  credentials: credentials.createSsl(
    fs.readFileSync('./ca.crt'),
    fs.readFileSync('./client.key'),
    fs.readFileSync('./client.crt')
  ),
});
```

## Advanced Usage

### Custom Metadata

```typescript
import { Metadata } from '@grpc/grpc-js';

// Server: Access metadata
const service = {
  GetUser: async (request: any, metadata: Metadata) => {
    const token = metadata.get('authorization')[0];
    // Validate token...
    return { user };
  },
};

// Client: Send metadata
const metadata = new Metadata();
metadata.add('authorization', 'Bearer token123');

const result = await client.unary('GetUser', { id: '123' }, metadata);
```

### Deadlines/Timeouts

```typescript
import { credentials, Deadline } from '@grpc/grpc-js';

const client = createGRPCClient({
  // ...
});

// Set deadline (5 seconds from now)
const deadline = Date.now() + 5000;

const result = await client.unary('SlowOperation', { data }, { deadline });
if (!isOk(result)) {
  if (result.error.message.includes('DEADLINE_EXCEEDED')) {
    console.log('Operation timed out');
  }
}
```

### Interceptors

```typescript
// Coming soon: Middleware/interceptor support
```

## Helper Functions

### `fromArray<T>(items: T[])`

Convert an array to an async iterable for client streaming:

```typescript
import { fromArray } from '@servicejs/adapter-grpc';

const events = [{ type: 'click' }, { type: 'view' }];
await client.clientStream('RecordEvents', fromArray(events));
```

### `toArray<T>(iterable: AsyncIterable<T>)`

Collect an async iterable to an array:

```typescript
import { toArray } from '@servicejs/adapter-grpc';

const results = client.serverStream('StreamLogs', { query: 'error' });
const logs = await toArray(results);
```

## Best Practices

1. **Use Protocol Buffers v3**
   - Modern syntax, better performance
   - Better TypeScript integration

2. **Design Services Around Use Cases**
   - Group related methods in services
   - Keep services focused and cohesive

3. **Handle Errors Gracefully**
   - Use Result types consistently
   - Provide meaningful error messages
   - Use gRPC status codes

4. **Use Streaming for Large Data**
   - Server streaming for large responses
   - Client streaming for large uploads
   - Bidirectional for real-time communication

5. **Enable TLS in Production**
   - Always use TLS for production
   - Use mutual TLS for service-to-service
   - Rotate certificates regularly

6. **Monitor Performance**
   - Enable logging during development
   - Use interceptors for metrics
   - Monitor latency and error rates

## Comparison with Other Protocols

| Feature | gRPC | Thrift | Cap'n Proto |
|---------|------|--------|-------------|
| Protocol | Protobuf | Binary/JSON/Compact | Cap'n Proto |
| Transport | HTTP/2 | TCP | TCP |
| Streaming | Full support | No | Yes |
| Code Gen | Required | Required | Required |
| Performance | Very Fast | Fast | Fastest |
| Browser | Via grpc-web | No | No |

## Troubleshooting

### "Cannot find module 'proto'"

Make sure your protoPath is correct:
```typescript
import path from 'path';

const client = createGRPCClient({
  protoPath: path.join(__dirname, 'service.proto'),
  // ...
});
```

### "Connection refused"

Ensure the server is running:
```typescript
const result = await server.listen();
if (!isOk(result)) {
  console.error('Server failed to start:', result.error);
}
```

### "Method not found"

Check that the method name matches the proto definition exactly (case-sensitive).

## Examples

See the `examples/` directory for complete examples:
- `basic-service.ts` - Simple calculator service
- `streaming.ts` - All four streaming patterns
- `microservices.ts` - Multi-service architecture

## API Reference

### `createGRPCClient(config)`

Creates a gRPC client with Result-based error handling.

**Returns:** `GRPCClient` with methods:
- `unary(method, request)` - Make a unary call
- `serverStream(method, request)` - Make a server streaming call
- `clientStream(method, requests)` - Make a client streaming call
- `bidiStream(method, requests)` - Make a bidirectional streaming call
- `close()` - Close the client
- `getClient()` - Get the underlying gRPC client

### `createGRPCServer(config)`

Creates a gRPC server with ServiceJS patterns.

**Returns:** `GRPCServer` with methods:
- `listen()` - Start the server
- `close()` - Stop the server
- `getServer()` - Get the underlying gRPC server

## License

MIT
