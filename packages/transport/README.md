# @servicejs/transport

Location-transparent transports for ServiceJS - local, worker, and network communication.

## Features

- **Three Transport Types**: Local (in-process), Worker (Web/Service Workers), Network (WebSocket)
- **Unified Interface**: Single API works across all transport types
- **Message Envelope**: Standardized message format with routing metadata
- **Serialization**: Pluggable serializers (JSON, structured clone)
- **High Performance**: Lock-free shared memory and TCP transports for maximum throughput
- **Request-Reply**: Built-in support via correlation IDs
- **Auto-Reconnect**: Configurable automatic reconnection for network transports
- **Transport Utilities**: Routing, retry logic, timeout protection, and composition
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
### createSharedMemoryTransport

Create a high-performance, lock-free transport using SharedArrayBuffer for inter-worker communication.

```typescript
function createSharedMemoryTransport(config: SharedMemoryTransportConfig): Transport
```

**Configuration:**

```typescript
interface SharedMemoryTransportConfig {
  readonly localUrn: URN;
  readonly sendBuffer: SharedArrayBuffer;
  readonly receiveBuffer: SharedArrayBuffer;
  readonly bufferConfig: RingBufferConfig;
  readonly serializer?: Serializer;
  readonly pollInterval?: number;
}

interface RingBufferConfig {
  readonly capacity: number;
  readonly maxMessageSize: number;
}
```

**Key Features:**

- **Lock-Free**: Uses atomic operations for thread-safe access without locks
- **Bi-Directional**: Separate send/receive buffers for full-duplex communication
- **Ring Buffer**: Efficient circular buffer for message queueing
- **Zero-Copy**: Messages stay in shared memory until read
- **High Performance**: Ideal for high-throughput worker communication

**Example:**

```typescript
import { createSharedBuffer, createSharedMemoryTransport } from '@servicejs/transport';

// In main thread
const bufferConfig = { capacity: 32, maxMessageSize: 1024 };
const mainToWorkerBuffer = createSharedBuffer(bufferConfig);
const workerToMainBuffer = createSharedBuffer(bufferConfig);

const mainTransport = createSharedMemoryTransport({
  localUrn: 'urn:main:app',
  sendBuffer: mainToWorkerBuffer,
  receiveBuffer: workerToMainBuffer,
  bufferConfig,
  pollInterval: 10, // Poll every 10ms
});

// Pass buffers to worker (note reversed order)
worker.postMessage({ mainToWorkerBuffer, workerToMainBuffer });

await mainTransport.connect();

// In worker
const workerTransport = createSharedMemoryTransport({
  localUrn: 'urn:worker:processor',
  sendBuffer: workerToMainBuffer,  // Reversed
  receiveBuffer: mainToWorkerBuffer, // Reversed
  bufferConfig,
  pollInterval: 10,
});

await workerTransport.connect();
```

**When to Use:**

- High-frequency communication between main thread and workers
- Low-latency messaging requirements
- Predictable performance needs (no GC pauses)
- Environments with SharedArrayBuffer support (modern browsers, Node.js, Bun, Deno)

**Limitations:**

- Requires SharedArrayBuffer support (not available in all environments)
- Fixed buffer size (messages dropped if buffer full)
- Separate buffers needed for each direction
- Polling overhead (configurable via `pollInterval`)

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

## Transport Utilities

The transport package includes powerful utility functions for routing, retry logic, and timeout handling.

### Transport Router

Route messages to different transports based on custom rules:

```typescript
import { createTransportRouter, createPrefixRouter } from '@servicejs/transport';

// Create router with default transport
const router = createTransportRouter({
  defaultTransport: localTransport,
  onUnroutable: (envelope) => {
    console.log(`No route found for ${envelope.to}`);
  }
});

// Add custom routing rules
router.addRoute(
  (envelope) => envelope.to.startsWith('urn:remote:'),
  networkTransport
);

router.addRoute(
  (envelope) => envelope.to.startsWith('urn:worker:'),
  workerTransport
);

// Send - automatically routed
await router.send(envelope);

// Or use prefix-based router (simpler)
const prefixRouter = createPrefixRouter({
  'urn:local:': localTransport,
  'urn:remote:': networkTransport,
  'urn:worker:': workerTransport
}, localTransport); // default transport
```

**Router API:**

- `addRoute(predicate, transport)` - Add routing rule
- `removeRoute(predicate)` - Remove routing rule
- `send(envelope)` - Send with automatic routing
- `getTransport(envelope)` - Get transport that would handle envelope

### Retry Logic

Wrap transports with automatic retry and exponential backoff:

```typescript
import { withRetry, defaultRetryPolicy } from '@servicejs/transport';

const reliableTransport = withRetry(networkTransport, {
  maxAttempts: 5,
  initialDelay: 100,       // Start with 100ms delay
  maxDelay: 5000,          // Max 5 seconds between retries
  backoffMultiplier: 2,    // Double delay each time
  jitter: 0.1,             // Add 10% random jitter

  // Custom retry logic
  shouldRetry: (error) => {
    return error.type === 'CONNECTION_FAILED' ||
           error.type === 'SEND_FAILED';
  },

  // Monitor retries
  onRetry: (attempt, error, delay) => {
    console.log(`Retry ${attempt} after ${delay}ms:`, error.type);
  }
});

// Sends automatically retry on failure
await reliableTransport.send(envelope);
```

**Retry Policy Options:**

- `maxAttempts` - Maximum retry attempts
- `initialDelay` - Starting delay in milliseconds
- `maxDelay` - Maximum delay cap
- `backoffMultiplier` - Exponential backoff factor
- `jitter` - Random jitter factor (0-1)
- `shouldRetry` - Predicate to determine if error is retryable
- `onRetry` - Callback invoked before each retry

**Default Policy:**

The `defaultRetryPolicy` retries connection errors up to 3 times with exponential backoff starting at 100ms.

### Timeout Protection

Wrap transports with timeout logic:

```typescript
import { withTimeout } from '@servicejs/transport';

const timeoutTransport = withTimeout(networkTransport, {
  timeout: 5000, // 5 second timeout
  onTimeout: (envelope) => {
    console.log(`Send to ${envelope.to} timed out`);
  }
});

const result = await timeoutTransport.send(envelope);
// Returns error if send exceeds timeout
```

### Combined Retry and Timeout

For maximum reliability, combine both patterns:

```typescript
import { withRetryAndTimeout } from '@servicejs/transport';

const reliableTransport = withRetryAndTimeout(
  networkTransport,
  {
    // Retry policy
    maxAttempts: 3,
    initialDelay: 100,
    maxDelay: 5000,
    backoffMultiplier: 2
  },
  {
    // Timeout policy
    timeout: 5000
  }
);

// Automatically retries timeouts and failures
await reliableTransport.send(envelope);
```

**How it works:**

1. Each send attempt has a timeout
2. If timeout occurs, it's treated as a retryable error
3. Retry with exponential backoff
4. Continue until success or max attempts reached

### Dynamic Routing

Routes can be changed at runtime for failover scenarios:

```typescript
const router = createTransportRouter();

let usePrimary = true;
const routePredicate = (envelope) => true;

// Set initial route
router.addRoute(routePredicate, primaryTransport);

// Later: fail over to secondary
usePrimary = false;
router.removeRoute(routePredicate);
router.addRoute(routePredicate, secondaryTransport);
```

### Message-Type Routing

Route based on message content:

```typescript
const router = createTransportRouter({ defaultTransport: localTransport });

// Route compute tasks to worker
router.addRoute(
  (envelope) => envelope.message.type === 'compute',
  workerTransport
);

// Route API calls to network
router.addRoute(
  (envelope) => envelope.message.type === 'api-request',
  networkTransport
);
```

### Utility Composition

Utilities can be composed for complex behaviors:

```typescript
// Create base transport with timeout
const timeoutTransport = withTimeout(networkTransport, { timeout: 5000 });

// Add retry logic
const reliableTransport = withRetry(timeoutTransport, {
  maxAttempts: 3,
  initialDelay: 100,
  maxDelay: 5000,
  backoffMultiplier: 2
});

// Add to router
const router = createTransportRouter();
router.addRoute(
  (envelope) => envelope.to.startsWith('urn:api:'),
  reliableTransport
);
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
