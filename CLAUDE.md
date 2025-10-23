# ServiceJS - Actor-Like Framework for TypeScript

## Project Overview

ServiceJS is a capability-based, message-passing framework for building robust, testable, and scalable applications in TypeScript. It combines the actor model with capability-based security, hexagonal architecture, session types, and event sourcing.

## Core Philosophy

1. **Pure Message Passing**: All communication via messages, never direct method calls or shared mutable state
2. **Capability-Based Security**: Structural enforcement - components can only interact via explicit capability references
3. **Hexagonal Architecture**: Dependencies injected as capability objects acting as both security boundaries and adapters
4. **Immutability by Default**: All state transitions create new state; no mutation
5. **Session Types**: Components evolve behavior through self-modifying reducers (protocol types)
6. **Event Sourcing**: Components as pure reducers processing messages and emitting effects
7. **Location Transparency**: Same programming model for local, worker, inter-process, and network communication
8. **Result Types**: Rust-style error handling with `Result<T, E>` - no exceptions in normal flow

## Architecture

### Core Abstractions

#### 1. Messages
The sole means of communication. Every message extends:
```typescript
interface Message {
  readonly type: string;
  // ... additional fields
}
```

Messages should be:
- Immutable
- Serializable
- Self-describing (type field)

#### 2. Components
The fundamental units of computation:
```typescript
interface Component<TState, TMessage extends Message, TEmit extends Message> {
  readonly urn: URN;  // Unique identifier
  readonly state: TState;  // Current state
  readonly reducer: Reducer<TState, TMessage, TEmit>;  // Message handler
  process(message: TMessage): void;  // Entry point for message delivery
}
```

Components:
- Have unique URNs for identification (not for lookup!)
- Process messages through reducer functions
- Maintain immutable state
- Can only interact via capabilities
- Never hold direct references to other components

#### 3. Reducers
Pure functions processing messages:
```typescript
type Reducer<TState, TMessage extends Message, TEmit extends Message> = (
  state: TState,
  message: TMessage
) => ReducerResult<TState, TMessage, TEmit>;

interface ReducerResult<TState, TMessage, TEmit> {
  readonly state: TState;  // New state
  readonly reducer: Reducer<TState, TMessage, TEmit>;  // Next reducer (for session types)
  readonly emit: ReadonlyArray<EmitMessage<TEmit>>;  // Messages to emit
}
```

Reducers:
- Are pure functions (no side effects)
- Return Result types (no exceptions)
- Can "replace themselves" to implement session types
- Emit messages to other components via channels/capabilities

#### 4. Capabilities
Mediate all inter-component communication:
```typescript
interface Capability<TMessage extends Message> {
  send(message: TMessage): void;
}
```

Capabilities provide:
- **Security**: Only holders can interact with the target
- **Adaptation**: Transform/validate messages
- **Session Type Evolution**: Behavior can change over time
- **Composition**: Chain transformations and validations

Example:
```typescript
const capability = createCapability({
  target: component,
  validate: (msg) => msg.amount > 0,
  transform: (msg) => ({ ...msg, timestamp: Date.now() })
});
```

#### 5. Channels
Basic abstraction for sending messages:
```typescript
interface Channel<T extends Message> {
  send(message: T): void;
}
```

Channels are:
- Fire-and-forget by default
- Type-safe
- Transport-agnostic
- Can be converted to/from capabilities

#### 6. Mailboxes
Control message delivery semantics:

- **No Mailbox**: For pure/stateless components that can process messages concurrently
- **FIFO Mailbox**: Sequential processing (default for stateful components)
- **Priority Mailbox**: Process high-priority messages first
- **Batching Mailbox**: Process messages in batches
- **Bounded Mailbox**: With overflow strategies (drop, block, etc.)

#### 7. URNs (Uniform Resource Names)
Unique identifiers for components:
```typescript
type URN = `urn:${string}:${string}`;

const urn = createURN('service', 'users');  // urn:service:users
```

**Important**: URNs are for identification and debugging, NOT for global lookup. Components can only interact if they hold a capability reference.

### Design Patterns

#### Request-Reply Pattern
```typescript
interface RequestMessage<TRequest, TResponse> extends Message {
  type: 'request';
  request: TRequest;
  replyTo: ReplyChannel<TResponse>;
}

// Usage
const result = await sendRequest(capability, { userId: '123' });
if (result.ok) {
  console.log(result.value);
}
```

#### Pub-Sub Pattern
```typescript
const broker = createPubSubBroker();
const subscription = broker.subscribe('topic', channel);
broker.publish('topic', message);
subscription.unsubscribe();
```

#### Supervision Hierarchy
```typescript
const supervisor = createSupervisor(
  urn,
  'restart',  // Strategy: restart, stop, escalate
  maxRetries: 3,
  retryDelay: 1000
);
supervisor.registerChild(childComponent);
```

#### Session Types
```typescript
// Reducer can replace itself to implement protocol evolution
const idleReducer: Reducer<State, IdleMessage> = (state, msg) => {
  if (msg.type === 'start') {
    return transition(
      newState,
      activeReducer,  // Switch to different reducer
      []
    );
  }
  return stay(state, idleReducer, []);
};
```

### Transports

Support for multiple communication boundaries:

1. **Local Transport**: In-memory, direct function calls
2. **Worker Transport**: Web Workers / Node.js worker threads
3. **Shared Memory Transport**: SharedArrayBuffer ring buffers (high throughput)
4. **Network Transport** (planned): TCP, WebSocket, HTTP with encryption

All transports provide the same API - location transparency.

## Project Structure

```
servicejs/
├── packages/
│   ├── core/                 # Core types and abstractions
│   │   ├── src/
│   │   │   ├── result.ts     # Result<T, E> type
│   │   │   ├── urn.ts        # URN system
│   │   │   ├── channel.ts    # Channel types
│   │   │   ├── component.ts  # Component & Reducer types
│   │   │   ├── capability.ts # Capability objects
│   │   │   └── index.ts
│   │   └── package.json
│   ├── mailbox/              # Mailbox implementations
│   │   ├── src/
│   │   │   ├── fifo.ts       # FIFO mailbox
│   │   │   ├── priority.ts   # Priority mailbox
│   │   │   ├── bounded.ts    # Bounded mailbox
│   │   │   └── index.ts
│   │   └── package.json
│   ├── patterns/             # Common communication patterns
│   │   ├── src/
│   │   │   ├── request-reply.ts
│   │   │   ├── pubsub.ts
│   │   │   ├── supervision.ts
│   │   │   └── index.ts
│   │   └── package.json
│   ├── transport/            # Transport implementations
│   │   ├── src/
│   │   │   ├── local.ts
│   │   │   ├── worker.ts
│   │   │   ├── shared-memory.ts
│   │   │   └── index.ts
│   │   └── package.json
│   ├── config/               # Configuration utilities
│   │   └── package.json
│   ├── serialization/        # Cap'n Proto integration (planned)
│   │   └── package.json
│   ├── storage/              # Content-addressed storage (planned)
│   │   └── package.json
│   └── network/              # Network transports (planned)
│       └── package.json
├── examples/                 # Example applications
├── docs/                     # Documentation
└── package.json              # Root package
```

## Development Setup

### Prerequisites
- Bun 1.0+
- TypeScript 5.0+

### Installation
```bash
bun install
```

### Build
```bash
bun run build
```

### Test
```bash
bun test
```

### Development
```bash
bun run dev
```

## Key Design Decisions & Open Questions

### Current Issues to Resolve

1. **Component Model Inconsistency**
   - Current implementation mixes component-as-object and reducer-as-function approaches
   - Need to decide: Should components be classes with mailboxes, or pure reducers with external execution?
   - **Recommendation**: Pure reducers + external mailboxes for maximum flexibility

2. **Direct References in EmitMessage**
   - Currently `EmitMessage` holds direct component references
   - This violates the capability model
   - **Fix**: Emit to capabilities/channels, not components

3. **Message Ordering & Causality** (CRITICAL for distributed systems)
   - No causality tracking
   - No vector clocks or Lamport timestamps
   - No per-sender FIFO guarantees
   - **Must add**: Message metadata with causality information

4. **Backpressure Mechanism**
   - Current implementation inadequate
   - Need async/await support for send operations
   - Need credit-based flow control
   - **Must implement**: `sendAsync(msg: T): Promise<void>`

5. **Error Handling & Supervision**
   - Incomplete supervision implementation
   - Unclear error propagation semantics
   - **Need**: Clear patterns for error handling in reducers

6. **Testing & Observability** (CRITICAL)
   - No testing utilities
   - No tracing/instrumentation
   - No metrics collection
   - No message flow visualization
   - **Must implement**: Mock transport, deterministic test runner, tracing infrastructure

7. **Message Schema & Validation**
   - No runtime validation
   - No schema system
   - **Need**: Zod or Cap'n Proto integration for message validation

### Design Questions to Answer

1. **Synchronous vs Async Send**
   - Should `send()` always be fire-and-forget?
   - Or should there be `sendAsync()` for backpressure?
   - **Proposal**: Both - `send()` for fire-and-forget, `sendAsync()` for backpressure

2. **Lifecycle Management**
   - Should there be standard init/shutdown hooks?
   - Or entirely application-defined?
   - **Proposal**: Optional lifecycle patterns in `@servicejs/patterns`

3. **Error Channels**
   - Should errors be messages in the same channel?
   - Or separate error channels?
   - **Proposal**: Separate error channels with Result types

4. **Distribution Priority**
   - Focus on local-only first?
   - Or distributed from the start?
   - **Recommendation**: Nail local first, then extend to distributed

5. **Schema Validation**
   - Optional or required?
   - What format?
   - **Proposal**: Optional but strongly encouraged, use Zod initially, migrate to Cap'n Proto

## Implementation Priorities

### Phase 1: Fix Foundation (Weeks 1-2)
- [ ] Reconcile Component abstraction
- [ ] Fix EmitMessage to use capabilities
- [ ] Add message ordering metadata
- [ ] Create validation test suite
- [ ] Implement basic schema validation (Zod)
- [ ] Fix all examples to compile and run

### Phase 2: Testing & Observability (Weeks 3-4)
- [ ] Mock transport for testing
- [ ] Deterministic test runner
- [ ] Tracing infrastructure (OpenTelemetry)
- [ ] Metrics collection
- [ ] Message flow recorder/visualizer
- [ ] Time-travel debugging support

### Phase 3: Production Readiness (Weeks 5-6)
- [ ] Complete backpressure implementation
- [ ] Async send support
- [ ] Circuit breaker pattern
- [ ] Complete supervision implementation
- [ ] Error propagation patterns
- [ ] Resource management & cleanup

### Phase 4: Distributed Systems (Weeks 7-8)
- [ ] Network transport (TCP, WebSocket)
- [ ] Timeout and retry strategies
- [ ] Partition handling
- [ ] Service discovery
- [ ] Distributed tracing
- [ ] Message encryption & authentication

### Phase 5: Advanced Features (Weeks 9-10)
- [ ] Cap'n Proto serialization
- [ ] Content-addressed storage
- [ ] Event sourcing helpers
- [ ] Saga pattern
- [ ] Hot reloading
- [ ] Visual dev tools

## Testing Strategy

### Unit Tests
- Test reducers in isolation (pure functions)
- Test mailbox implementations
- Test capability transformations
- Test Result type utilities

### Integration Tests
- Test complete component interactions
- Test request-reply patterns
- Test pub-sub patterns
- Test supervision hierarchies

### Property Tests
- Mailbox ordering guarantees
- Message delivery guarantees
- Capability security properties

### Deterministic Tests
- Use mock transport with controlled message ordering
- Test race conditions deterministically
- Time-travel through message history

## Documentation Requirements

### API Documentation
- Complete API reference for all packages
- Type documentation
- Usage examples for each abstraction

### Conceptual Documentation
- Architecture guide
- Design patterns guide
- Best practices guide
- Migration guide

### Tutorial Documentation
- Getting started tutorial
- Building a simple application
- Advanced patterns
- Distributed systems guide

## Code Style & Conventions

### TypeScript
- Strict mode enabled
- No `any` types (use `unknown` if necessary)
- Prefer `interface` over `type` for objects
- Use `readonly` by default
- Discriminated unions for message types

### Naming Conventions
- Components: `UserServiceComponent`, `CounterComponent`
- Messages: `CreateUserMessage`, `IncrementMessage`
- Capabilities: `userServiceCapability`, `counterCapability`
- URNs: `urn:service:name`

### File Organization
- One component per file
- Co-locate related types
- Export only public API from index.ts
- Keep files under 300 lines

### Error Handling
- Always use Result types in public APIs
- Never throw exceptions in normal flow
- Log errors, don't swallow them
- Provide context in error messages

## Performance Considerations

### Local Transport
- Direct function calls (minimal overhead)
- Zero-copy message passing for immutable objects
- Batch message processing where possible

### Worker Transport
- Use Transferables for large data
- Minimize serialization overhead
- Pool workers for reuse

### Shared Memory Transport
- Lock-free ring buffers
- Atomic operations for synchronization
- Minimize false sharing

### Network Transport
- Connection pooling
- Message batching
- Compression for large messages
- Keep-alive for persistent connections

## Security Model

### Capability-Based Security
- No ambient authority
- No global lookups (except opt-in registries)
- All access mediated by capabilities
- Capabilities can be attenuated (restricted)

### Network Security
- All network messages signed
- Optional encryption with public/private keys
- Token-based authentication
- Rate limiting per capability

### Principle of Least Privilege
- Components receive minimal capabilities needed
- Read-only vs read-write capabilities
- Time-limited capabilities
- Revocable capabilities

## Future Features

### Short Term
- Complete observability infrastructure
- Comprehensive testing utilities
- Network transport implementation
- Schema validation system

### Medium Term
- Cap'n Proto serialization
- Content-addressed storage
- Distributed tracing
- Visual development tools

### Long Term
- Actor mobility (migrate between machines)
- Distributed consensus algorithms
- Formal verification of protocols
- Multi-language support (Go, Rust, Python)

## Related Work & Inspiration

- **Erlang/OTP**: Actor model, supervision trees
- **Akka**: JVM actor framework
- **Orleans**: Virtual actors (.NET)
- **Cap'n Proto**: Serialization format
- **E Language**: Capability-based security
- **Session Types**: Protocol verification
- **Hexagonal Architecture**: Ports & adapters
- **Event Sourcing**: Immutable event log
- **CQRS**: Command-query separation

## Contributing Guidelines

### Before Starting
1. Read this CLAUDE.md thoroughly
2. Review the architecture documentation
3. Check open issues and discussions
4. Discuss major changes before implementing

### Development Process
1. Create feature branch from `main`
2. Write tests first (TDD)
3. Implement feature
4. Update documentation
5. Submit PR with clear description

### Code Review Checklist
- [ ] Tests pass
- [ ] Type-safe (no `any`)
- [ ] Documentation updated
- [ ] Examples work
- [ ] Performance acceptable
- [ ] Security reviewed

## Open Questions & Discussion Topics

### Architecture
1. Should components be objects or pure functions?
2. How should we handle async operations in reducers?
3. What's the right balance between type safety and flexibility?
4. Should we support classes-with-decorators as syntactic sugar?

### API Design
1. Should `send()` be sync or async?
2. How should timeouts be handled?
3. Should capabilities be first-class or implementation detail?
4. How to make the learning curve gentler for new users?

### Implementation
1. Which serialization format for network transport?
2. How to implement distributed causality tracking?
3. Should we use WeakRef for automatic cleanup?
4. How to balance zero-cost abstractions with developer ergonomics?

### Tooling
1. What should the dev tools look like?
2. How to visualize message flow?
3. Should we have a CLI tool?
4. What IDE integrations would be most valuable?

## Resources

### Documentation
- [Architecture Guide](./docs/architecture.md)
- [API Reference](./docs/api.md)
- [Getting Started](./docs/getting-started.md)
- [Design Patterns](./docs/patterns.md)

### Examples
- [Counter Example](./examples/counter)
- [ATM State Machine](./examples/atm)
- [Distributed System](./examples/distributed)

### External Resources
- [Capability-Based Security](https://en.wikipedia.org/wiki/Capability-based_security)
- [Session Types](https://en.wikipedia.org/wiki/Session_type)
- [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)

## Contact & Support

- GitHub Issues: [Report bugs and request features]
- Discussions: [Ask questions and share ideas]
- Documentation: [https://servicejs.dev](https://servicejs.dev)

---

**Last Updated**: 2025-10-23
**Status**: Early Development / Design Phase
**Version**: 0.1.0-alpha
