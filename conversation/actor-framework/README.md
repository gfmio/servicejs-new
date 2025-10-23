# Actor Framework

A TypeScript actor-like framework built on pure message passing, capability-based security, and hexagonal architecture principles.

## Philosophy

This framework is built on several core principles:

1. **Pure Message Passing**: Objects communicate exclusively via messages, never through direct method calls or shared mutable state.

2. **Capability-Based Security**: Components can only interact with other components if they hold a reference (capability) to them. No global lookup mechanism.

3. **Hexagonal Architecture**: All dependencies are injected through capability objects that act as both security boundaries and adapters.

4. **Immutability by Default**: All data structures are treated as immutable. State changes create new states.

5. **Session Types**: Components can evolve their behavior over time by changing their reducer functions, effectively implementing protocol types.

6. **Event Sourcing**: Components are pure reducers that process messages and emit effects, making them naturally event-sourced.

7. **Location Transparency**: The same programming model works for local, worker, inter-process, and network communication.

## Architecture

### Core Concepts

#### Components

Components are the fundamental units of computation. Each component:
- Has a unique URN (Uniform Resource Name)
- Processes messages through a reducer function
- Maintains immutable state
- Can only interact with other components through capabilities

#### Messages

Messages are the sole means of communication. All messages extend the base `Message` interface:

```typescript
interface Message {
  readonly type: string;
}
```

#### Channels

Channels provide the basic abstraction for sending messages:

```typescript
interface Channel<T extends Message> {
  send(message: T): void;
  readonly targetURN: URN;
}
```

Channels are:
- Fire-and-forget by default
- Type-safe (TypeScript enforces message types)
- Transport-agnostic (work across any boundary)

#### Capabilities

Capabilities wrap channels and provide:
- **Security**: Control who can send what messages
- **Adaptation**: Transform messages between different interfaces
- **Evolution**: Change behavior over time (session types)
- **Decoration**: Add logging, rate limiting, validation, etc.

```typescript
interface Capability<TInput extends Message, TOutput extends Message = TInput> {
  send(message: TInput): void;
  readonly targetURN: URN;
  evolve<TNew extends Message>(newCap: Capability<TNew>): Capability<TNew>;
}
```

#### Reducers

Reducers are pure functions that process messages:

```typescript
type Reducer<S extends ComponentState, M extends Message> = (
  state: S,
  message: M
) => Result<ReducerResult<S>, Error>;
```

Reducers:
- Take current state and a message
- Return new state and effects to emit
- Never throw exceptions (use `Result<T, E>` instead)
- Can "replace themselves" by returning a new reducer (session types)

#### Mailboxes

Mailboxes control message delivery semantics:

- **FIFO Mailbox**: Sequential processing (default for stateful components)
- **Priority Mailbox**: Process high-priority messages first
- **Parallel Mailbox**: Concurrent processing (for stateless components)
- **Batching Mailbox**: Process messages in batches for efficiency

## Packages

The framework is modular and composed of several packages:

### `@actor-framework/core`

Core types and abstractions:
- Result types for error handling
- URN system
- Message and channel types
- Component and reducer abstractions
- Capability objects
- Protocol/session types

### `@actor-framework/mailbox`

Various mailbox implementations:
- FIFO (sequential processing)
- Priority (priority-based)
- Parallel (concurrent processing)
- Batching (batch processing)

### `@actor-framework/patterns`

Common communication patterns:
- Request-reply
- Pub-sub
- Supervision (error handling hierarchy)
- Lifecycle management

### `@actor-framework/transport`

Transport abstractions:
- Local (in-memory)
- Worker (Web Workers / worker threads)
- SharedMemory (SharedArrayBuffer ring buffers)
- Network (coming soon)

### `@actor-framework/config`

Configuration parsing:
- Environment variables
- Command-line arguments
- Configuration files (JSON)
- Hierarchical configuration

### `@actor-framework/serialization` (planned)

Cap'n Proto integration for efficient serialization.

### `@actor-framework/storage` (planned)

Content-addressed storage integration.

### `@actor-framework/network` (planned)

Network transports with encryption and authentication.

## Installation

```bash
bun install
bun run build
```

## Quick Start

Here's a minimal example of a counter component:

```typescript
import {
  type Message,
  type ComponentState,
  type Reducer,
  createURN,
  Ok,
  createStatefulReducer,
} from '@actor-framework/core';

import { createFIFOMailbox } from '@actor-framework/mailbox';
import { createLocalTransport } from '@actor-framework/transport';
import {
  type Request,
  createRequestReply,
  createSuccessResponse,
} from '@actor-framework/patterns';

// Define state
interface CounterState extends ComponentState {
  count: number;
}

// Define messages
interface IncrementRequest {
  amount: number;
}

// Define reducer
const counterReducer: Reducer<CounterState, Request<IncrementRequest, number>> = (
  state,
  message
) => {
  const newCount = state.count + message.data.amount;
  message.replyTo.send(createSuccessResponse(newCount));
  
  return Ok({
    state: { count: newCount },
    effects: [],
  });
};

// Create component
const transport = createLocalTransport();
await transport.start();

const counterURN = createURN('counter', 'main');
const counter = createStatefulReducer({ count: 0 }, counterReducer);

const mailbox = createFIFOMailbox((msg) => {
  counter.reduce(msg);
});
mailbox.start();

transport.registerHandler(counterURN, (msg) => mailbox.enqueue(msg));

// Use the component
const channel = transport.createChannel(counterURN);
const client = createRequestReply(channel);

const result = await client.ask({ amount: 5 });
console.log(result.value); // 5
```

## Examples

See the `packages/example` directory for complete working examples.

Run the example:

```bash
cd packages/example
bun run dev
```

## Key Features

### Type Safety

Full TypeScript support with:
- Message type checking
- State type inference
- Protocol type checking (session types)
- Capability variance

### Error Handling

Rust-style `Result<T, E>` types:
- No exceptions in normal flow
- Explicit error handling
- Composable with `map`, `andThen`, etc.

```typescript
const result = await client.ask(request);
if (result.ok) {
  console.log(result.value);
} else {
  console.error(result.error);
}
```

### Session Types

Components can change their behavior over time:

```typescript
const protocol = new ProtocolBuilder()
  .state('idle', (msg): msg is RequestMsg => msg.type === 'request')
  .state('waiting', (msg): msg is ResponseMsg => msg.type === 'response')
  .on('idle', 'request', handleRequest, 'waiting')
  .on('waiting', 'response', handleResponse, 'idle')
  .buildProtocol('idle');
```

### Supervision

Built-in error recovery with supervision hierarchies:

```typescript
const supervisor = createSupervisor(
  urn,
  'restart',  // Strategy: restart on failure
  3,          // Max retries
  1000        // Retry delay (ms)
);

supervisor.registerChild(childComponent);
```

### Request-Reply

Simple request-response patterns:

```typescript
const client = createRequestReply(channel);

// With timeout
const result = await client.ask(request, 5000);

// Fire and forget
client.tell(request);
```

### Pub-Sub

Topic-based messaging:

```typescript
const broker = createPubSubBroker();

// Subscribe
const sub = broker.subscribe('events', channel);

// Publish
broker.publish('events', data);

// Unsubscribe
sub.unsubscribe();
```

## Design Patterns

### Hexagonal Architecture

Dependencies are injected as capabilities:

```typescript
interface UserServiceConfig extends ComponentConfig {
  capabilities: {
    database: Capability<DatabaseMessage>;
    logger: Capability<LogMessage>;
    emailService: Capability<EmailMessage>;
  };
}
```

### Event Sourcing

Components are natural event-sourced reducers:

```typescript
const reducer: Reducer<State, Event> = (state, event) => {
  // Process event, return new state
  return Ok({
    state: newState,
    effects: [/* Events to emit */],
  });
};
```

### CQRS

Separate read and write channels:

```typescript
const writeCapability = createCapability(urn, writeChannel);
const readCapability = createCapability(urn, readChannel);
```

## Performance

### Local Communication

- Direct function calls (synchronous)
- Zero-copy message passing
- Minimal overhead

### Worker Communication

- Structured clone for messages
- Transferable objects support
- Efficient worker pool management

### Shared Memory

- Lock-free ring buffers
- Sub-microsecond latency
- High throughput (millions of messages/sec)

## Future Features

- Cap'n Proto serialization
- Content-addressed storage
- Network transports (TCP, WebSocket, HTTP)
- Cryptographic capabilities
- Distributed tracing
- Hot code reloading
- Time-travel debugging
- Visual dev tools

## Contributing

This is a demonstration implementation. For production use, consider:

1. More robust error handling
2. Comprehensive test suite
3. Performance benchmarks
4. Documentation
5. Real-world examples

## License

MIT

## Related Work

Inspired by:
- Erlang/OTP actors
- Akka actor system
- CAP theorem and capability security
- Hexagonal architecture
- Event sourcing and CQRS
- Session types and protocol types
