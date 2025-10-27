# @servicejs/transport

Location-transparent transports for ServiceJS - local, worker, and network communication.

## Features

- **Three Transport Types**: Local (in-process), Worker (Web/Service Workers), Network (WebSocket)
- **Unified Interface**: Single API works across all transport types
- **Message Envelope**: Standardized message format with routing metadata
- **Serialization**: Pluggable serializers (JSON, structured clone)
- **Request-Reply**: Built-in support via correlation IDs
- **Auto-Reconnect**: Configurable automatic reconnection for network transports
- **Error Handling**: Comprehensive error types and handlers
- **TypeScript**: Full type safety and inference

## Installation

```bash
bun add @servicejs/transport
```

## Quick Start

### Local Transport (In-Process)

```typescript
import { createLocalTransport } from '@servicejs/transport';

const componentA = createLocalTransport({
  localUrn: 'urn:local:component-a',
});

const componentB = createLocalTransport({
  localUrn: 'urn:local:component-b',
});

await componentA.connect();
await componentB.connect();

componentB.onReceive((envelope) => {
  console.log('Received:', envelope.message);
});

await componentA.send({
  from: 'urn:local:component-a',
  to: 'urn:local:component-b',
  message: { type: 'hello', data: 'world' },
});
```

### Worker Transport

```typescript
import { createWorkerTransport } from '@servicejs/transport';

const worker = new Worker('worker.js');

const transport = createWorkerTransport({
  localUrn: 'urn:main:app',
  worker,
});

await transport.connect();

transport.onReceive((envelope) => {
  console.log('From worker:', envelope.message);
});

await transport.send({
  from: 'urn:main:app',
  to: 'urn:worker:processor',
  message: { type: 'process', data: [1, 2, 3] },
});
```

### Network Transport (WebSocket)

```typescript
import { createNetworkTransport } from '@servicejs/transport';

const transport = createNetworkTransport({
  localUrn: 'urn:client:app',
  url: 'ws://localhost:8080',
});

await transport.connect();

transport.onReceive((envelope) => {
  console.log('From server:', envelope.message);
});

await transport.send({
  from: 'urn:client:app',
  to: 'urn:server:api',
  message: { type: 'getData', id: 123 },
});
```

## Core Concepts

### Transport Interface

All transports implement the same interface:

```typescript
interface Transport {
  connect(urn?: URN): Promise<Result<void, TransportError>>;
  disconnect(): Promise<Result<void, TransportError>>;
  send(envelope: MessageEnvelope): Promise<Result<void, TransportError>>;
  onReceive(handler: (envelope: MessageEnvelope) => void): void;
  onError(handler: (error: TransportError) => void): void;
  isConnected(): boolean;
  getLocalUrn(): URN;
}
```

### Message Envelope

Messages are wrapped in envelopes for routing:

```typescript
interface MessageEnvelope {
  readonly from: URN;
  readonly to: URN;
  readonly message: Message;
  readonly correlationId?: string;
  readonly timestamp?: number;
}
```

### Transport Types

**Local Transport**
- In-process communication
- No serialization (direct references)
- Lowest latency
- Shared memory

**Worker Transport**
- Web Worker, Service Worker, Shared Worker communication
- Uses `postMessage`
- Serializes via structured clone or JSON
- Separate execution context

**Network Transport**
- WebSocket-based communication
- Cross-process and cross-machine
- JSON serialization
- Supports auto-reconnect

## API Reference

### createLocalTransport

Create a local (in-process) transport.

```typescript
function createLocalTransport(config: LocalTransportConfig): Transport
```

**Configuration:**

```typescript
interface LocalTransportConfig {
  readonly localUrn: URN;
}
```

**Example:**

```typescript
const transport = createLocalTransport({
  localUrn: 'urn:local:service',
});

await transport.connect();
```

### createWorkerTransport

Create a worker transport for Web Workers.

```typescript
function createWorkerTransport(config: WorkerTransportConfig): Transport
```

**Configuration:**

```typescript
interface WorkerTransportConfig {
  readonly localUrn: URN;
  readonly worker: WorkerLike;
  readonly serializer?: Serializer;
}
```

**Example:**

```typescript
const worker = new Worker('worker.js');

const transport = createWorkerTransport({
  localUrn: 'urn:main:app',
  worker,
});

await transport.connect();
```

### createNetworkTransport

Create a network transport for WebSocket communication.

```typescript
function createNetworkTransport(config: NetworkTransportConfig): Transport
```

**Configuration:**

```typescript
interface NetworkTransportConfig {
  readonly localUrn: URN;
  readonly url: string;
  readonly serializer?: Serializer;
  readonly protocols?: string | string[];
  readonly connectionTimeout?: number;
  readonly autoReconnect?: boolean;
  readonly reconnectInterval?: number;
  readonly maxReconnectAttempts?: number;
}
```

**Example:**

```typescript
const transport = createNetworkTransport({
  localUrn: 'urn:client:app',
  url: 'ws://localhost:8080',
  autoReconnect: true,
  reconnectInterval: 1000,
  maxReconnectAttempts: 5,
});

await transport.connect();
```

### Serialization

Create custom serializers or use built-in ones:

```typescript
// JSON serializer (default)
const jsonSerializer = createJsonSerializer();

// Structured clone serializer (preserves more types)
const structuredSerializer = createStructuredCloneSerializer();

// Use with transport
const transport = createWorkerTransport({
  localUrn: 'urn:main:app',
  worker,
  serializer: structuredSerializer,
});
```

## Error Types

```typescript
type TransportError =
  | { type: 'NOT_CONNECTED'; urn?: URN }
  | { type: 'SEND_FAILED'; urn?: URN; error: unknown }
  | { type: 'SERIALIZATION_FAILED'; message: Message; error: unknown }
  | { type: 'DESERIALIZATION_FAILED'; data: unknown; error: unknown }
  | { type: 'INVALID_MESSAGE'; data: unknown; reason: string }
  | { type: 'CONNECTION_CLOSED'; urn?: URN }
  | { type: 'CONNECTION_FAILED'; urn?: URN; error: unknown };
```

## Usage Patterns

### Request-Reply Pattern

```typescript
const transport = createNetworkTransport({
  localUrn: 'urn:client:app',
  url: 'ws://localhost:8080',
});

await transport.connect();

// Track pending requests
const pendingRequests = new Map<string, (envelope: MessageEnvelope) => void>();

transport.onReceive((envelope) => {
  const handler = pendingRequests.get(envelope.correlationId || '');
  if (handler) {
    handler(envelope);
    pendingRequests.delete(envelope.correlationId || '');
  }
});

// Helper to make requests
const makeRequest = async (message: any): Promise<MessageEnvelope> => {
  const correlationId = `req-${Date.now()}`;

  const responsePromise = new Promise<MessageEnvelope>((resolve) => {
    pendingRequests.set(correlationId, resolve);

    // Timeout after 5 seconds
    setTimeout(() => {
      pendingRequests.delete(correlationId);
      reject(new Error('Request timeout'));
    }, 5000);
  });

  await transport.send({
    from: 'urn:client:app',
    to: 'urn:server:api',
    message,
    correlationId,
  });

  return responsePromise;
};

// Make request
const response = await makeRequest({ type: 'getData', id: 123 });
console.log('Response:', response.message);
```

### Auto-Reconnect

```typescript
const transport = createNetworkTransport({
  localUrn: 'urn:client:app',
  url: 'ws://localhost:8080',
  autoReconnect: true,
  reconnectInterval: 1000,
  maxReconnectAttempts: 5,
});

transport.onError((error) => {
  if (error.type === 'CONNECTION_CLOSED') {
    console.log('Connection closed - will auto-reconnect');
  }
});

await transport.connect();
```

### Error Handling

```typescript
transport.onError((error) => {
  switch (error.type) {
    case 'NOT_CONNECTED':
      console.log('Not connected');
      break;

    case 'SEND_FAILED':
      console.log(`Failed to send to ${error.urn}`);
      break;

    case 'CONNECTION_CLOSED':
      console.log('Connection was closed');
      break;

    case 'CONNECTION_FAILED':
      console.log('Connection failed:', error.error);
      break;

    case 'SERIALIZATION_FAILED':
      console.log('Failed to serialize message');
      break;

    case 'DESERIALIZATION_FAILED':
      console.log('Failed to deserialize message');
      break;
  }
});
```

### Message Routing

```typescript
// Create a router that forwards messages
const router = createLocalTransport({
  localUrn: 'urn:local:router',
});

await router.connect();

router.onReceive(async (envelope) => {
  const message = envelope.message as { service?: string };

  // Route to appropriate service
  const destination =
    message.service === 'auth' ? 'urn:local:auth' :
    message.service === 'data' ? 'urn:local:data' :
    'urn:local:default';

  await router.send({
    from: envelope.from,
    to: destination,
    message: envelope.message,
    correlationId: envelope.correlationId,
  });
});
```

### Worker Communication

**Main Thread (main.ts):**

```typescript
const worker = new Worker('worker.js');

const transport = createWorkerTransport({
  localUrn: 'urn:main:app',
  worker,
});

await transport.connect();

transport.onReceive((envelope) => {
  console.log('Result from worker:', envelope.message);
});

await transport.send({
  from: 'urn:main:app',
  to: 'urn:worker:processor',
  message: { type: 'process', data: [1, 2, 3, 4, 5] },
});
```

**Worker Thread (worker.js):**

```typescript
import { createWorkerTransport } from '@servicejs/transport';

const transport = createWorkerTransport({
  localUrn: 'urn:worker:processor',
  worker: self as any,
});

await transport.connect();

transport.onReceive(async (envelope) => {
  const data = envelope.message.data as number[];

  // Process data
  const result = data.reduce((sum, n) => sum + n, 0);

  // Send result back
  await transport.send({
    from: 'urn:worker:processor',
    to: envelope.from,
    message: { type: 'result', value: result },
    correlationId: envelope.correlationId,
  });
});
```

### Secure WebSocket (WSS)

```typescript
const transport = createNetworkTransport({
  localUrn: 'urn:client:app',
  url: 'wss://secure-server.example.com',
});

await transport.connect();
// All communication is encrypted via TLS
```

### Custom Protocols

```typescript
const transport = createNetworkTransport({
  localUrn: 'urn:client:app',
  url: 'ws://localhost:8080',
  protocols: ['servicejs', 'v1'],
});

await transport.connect();
```

### Connection Lifecycle

```typescript
const transport = createNetworkTransport({
  localUrn: 'urn:client:app',
  url: 'ws://localhost:8080',
});

console.log(transport.isConnected()); // false

await transport.connect();
console.log(transport.isConnected()); // true

await transport.disconnect();
console.log(transport.isConnected()); // false

// Can reconnect
await transport.connect();
console.log(transport.isConnected()); // true
```

## Examples

The package includes comprehensive examples:

- **localTransport.ts**: 8 local transport examples
- **workerTransport.ts**: 7 worker transport examples
- **networkTransport.ts**: 10 network transport examples
- **comprehensive.ts**: Multi-transport application example

Run examples:

```bash
cd packages/transport
bun run examples/localTransport.ts
bun run examples/workerTransport.ts
bun run examples/networkTransport.ts
bun run examples/comprehensive.ts
```

## Testing

Run tests:

```bash
cd packages/transport
bun test
```

The package includes 47 comprehensive tests covering:
- Serialization (JSON and structured clone)
- Local transport (in-process communication)
- Worker transport (postMessage-based)
- Network transport (WebSocket-based)
- Error handling
- Connection lifecycle
- Message routing

## Performance Characteristics

- **Local Transport**: O(1) message delivery, no serialization overhead
- **Worker Transport**: Serialization overhead, asynchronous delivery
- **Network Transport**: Network latency, serialization overhead, potential reconnection delays

### When to Use Each Transport

**Local Transport:**
- In-process communication
- Shared memory scenarios
- Lowest possible latency
- Testing and development

**Worker Transport:**
- CPU-intensive tasks
- Parallel processing
- Separate execution context
- Browser compatibility

**Network Transport:**
- Cross-process communication
- Cross-machine communication
- Client-server architectures
- Distributed systems

## TypeScript Support

Full TypeScript support with strict typing:

```typescript
import type {
  Transport,
  MessageEnvelope,
  TransportError,
  Serializer,
  LocalTransportConfig,
  WorkerTransportConfig,
  NetworkTransportConfig,
} from '@servicejs/transport';

const transport: Transport = createLocalTransport({
  localUrn: 'urn:local:service',
});

const envelope: MessageEnvelope = {
  from: 'urn:local:sender',
  to: 'urn:local:receiver',
  message: { type: 'test', data: 'hello' },
};

const result: Result<void, TransportError> = await transport.send(envelope);
```

## Best Practices

### 1. Use Correlation IDs for Request-Reply

```typescript
const correlationId = `req-${Date.now()}-${Math.random()}`;

await transport.send({
  from: 'urn:client',
  to: 'urn:server',
  message: { type: 'request' },
  correlationId,
});
```

### 2. Handle Errors Appropriately

```typescript
transport.onError((error) => {
  // Log error
  logger.error('Transport error', error);

  // Notify monitoring system
  monitoring.recordError(error);

  // Take corrective action
  if (error.type === 'CONNECTION_CLOSED' && !autoReconnect) {
    // Manually reconnect
    transport.connect();
  }
});
```

### 3. Set Reasonable Timeouts

```typescript
const transport = createNetworkTransport({
  localUrn: 'urn:client:app',
  url: 'ws://localhost:8080',
  connectionTimeout: 5000, // 5 seconds
});
```

### 4. Use Auto-Reconnect for Resilience

```typescript
const transport = createNetworkTransport({
  localUrn: 'urn:client:app',
  url: 'ws://localhost:8080',
  autoReconnect: true,
  reconnectInterval: 1000,
  maxReconnectAttempts: 5,
});
```

### 5. Clean Up Resources

```typescript
// Always disconnect when done
await transport.disconnect();

// Clear registries for testing
getLocalTransportRegistry().clear();
```

### 6. Use Transport Abstraction

```typescript
// Write code that works with any transport type
const sendMessage = async (
  transport: Transport,
  to: string,
  message: Message
): Promise<void> => {
  await transport.send({
    from: transport.getLocalUrn(),
    to,
    message,
  });
};

// Works with any transport
await sendMessage(localTransport, 'urn:local:service', { type: 'test' });
await sendMessage(workerTransport, 'urn:worker:service', { type: 'test' });
await sendMessage(networkTransport, 'urn:server:service', { type: 'test' });
```

## Comparison with Other Solutions

### vs Direct Method Calls

**Transport:**
- ✅ Location transparent
- ✅ Works across processes
- ✅ Asynchronous by default
- ✅ Supports serialization
- ❌ More overhead

**Direct Calls:**
- ❌ In-process only
- ❌ Location dependent
- ✅ Synchronous option
- ✅ Lower overhead
- ❌ No serialization

### vs fetch/XMLHttpRequest

**Transport:**
- ✅ Bi-directional
- ✅ Real-time updates
- ✅ Multiple message types
- ✅ Connection reuse
- ✅ Auto-reconnect

**fetch:**
- ❌ Request-response only
- ❌ Polling required
- ❌ Single message type
- ❌ New connection per request
- ❌ Manual retry

### vs Raw WebSocket

**Transport:**
- ✅ Standardized message format
- ✅ Built-in correlation IDs
- ✅ Auto-reconnect
- ✅ Error handling
- ✅ Unified interface

**Raw WebSocket:**
- ❌ Custom message format
- ❌ Manual correlation
- ❌ Manual reconnect
- ❌ Basic error handling
- ✅ More control

## License

MIT

## Related Packages

- **@servicejs/core**: Core component system
- **@servicejs/result**: Result type for error handling
- **@servicejs/request-reply**: High-level request-reply patterns
- **@servicejs/mailbox**: Message queuing and delivery

## Contributing

See the main [ServiceJS repository](https://github.com/servicejs/servicejs) for contribution guidelines.
