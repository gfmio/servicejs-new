# ServiceJS Integration Examples

This directory contains comprehensive integration examples demonstrating how to use ServiceJS packages together to build real-world applications.

## Examples Overview

### 1. Counter with FIFO Mailbox (`counter-with-mailbox.ts`)

**Demonstrates:**
- Creating stateful components with reducers
- Using FIFO mailbox for message queuing
- Sequential message processing
- Integration between `@servicejs/core` and `@servicejs/mailbox`

**Run:**
```bash
bun run examples/integration/counter-with-mailbox.ts
```

**Key Concepts:**
- FIFO (First-In-First-Out) message delivery
- Buffered operations
- Peek without consuming
- Mailbox lifecycle (enqueue, dequeue, clear)

### 2. Task Scheduler with Priority Mailbox (`task-scheduler.ts`)

**Demonstrates:**
- Task scheduling based on priority
- Priority mailbox for task prioritization
- High priority tasks processed before low priority
- Equal priority tasks processed in FIFO order

**Run:**
```bash
bun run examples/integration/task-scheduler.ts
```

**Key Concepts:**
- Priority-based message delivery
- Starvation awareness
- Mixed-priority workflows
- Dynamic priority handling

### 3. Key-Value Store with Request/Reply (`key-value-store.ts`)

**Demonstrates:**
- RPC-style request-response messaging
- Multiple request types (GET, SET)
- Success and error responses
- Async/await with timeout handling
- Request cancellation

**Run:**
```bash
bun run examples/integration/key-value-store.ts
```

**Key Concepts:**
- Request/reply pattern
- Correlation IDs for matching responses
- Timeout handling
- Async/await integration
- Type-safe request-response pairs

### 4. Event Bus with Pub/Sub (`event-bus.ts`)

**Demonstrates:**
- Topic-based event broadcasting
- Multiple subscribers to same topic
- Multiple topics with different subscribers
- Dynamic subscription management
- Component integration with event bus

**Run:**
```bash
bun run examples/integration/event-bus.ts
```

**Key Concepts:**
- Publish/subscribe pattern
- Topic-based routing
- Decoupled communication
- Subscription lifecycle
- Monitoring and debugging

### 5. Complete Application (`complete-app.ts`)

**Demonstrates:**
- Full task management system
- All patterns working together:
  - Components with reducers (`@servicejs/core`)
  - FIFO mailbox for sequential writes
  - Priority mailbox for task scheduling
  - Pub/sub for event broadcasting
  - Request/reply for queries

**Run:**
```bash
bun run examples/integration/complete-app.ts
```

**Architecture:**
- **TaskStore**: Manages task storage with FIFO mailbox
- **TaskScheduler**: Processes tasks by priority with Priority mailbox
- **EventBus**: Broadcasts task events using pub/sub
- **QueryService**: Handles read queries via request/reply

**Key Concepts:**
- Multi-component architecture
- Event-driven design
- CQRS pattern (Command Query Responsibility Segregation)
- Capability-based security
- Message passing between components

## Running All Examples

Run all integration examples:

```bash
bun run examples/integration/counter-with-mailbox.ts
bun run examples/integration/task-scheduler.ts
bun run examples/integration/key-value-store.ts
bun run examples/integration/event-bus.ts
bun run examples/integration/complete-app.ts
```

## Key Patterns Demonstrated

### Message-Passing Components
All examples use pure message passing with:
- Immutable messages
- Reducers for state updates
- Effects for side effects
- Capabilities for interaction

### Mailbox Patterns
- **FIFO**: Sequential processing, buffering, ordered operations
- **Priority**: Task scheduling, urgent messages, priority queues

### Communication Patterns
- **Request/Reply**: RPC-style queries, synchronous operations
- **Pub/Sub**: Event broadcasting, decoupled communication

### Integration Patterns
- Components composed via capabilities
- Mailboxes wrapping component capabilities
- Event buses connecting multiple components
- Query services providing read access

## Package Dependencies

These examples use:
- `@servicejs/core` - Core framework (URN, Message, Capability, Reducer, Effect, Component)
- `@servicejs/mailbox` - FIFO, Priority, and Bounded mailboxes
- `@servicejs/request-reply` - Request/reply pattern
- `@servicejs/pub-sub` - Publish/subscribe pattern
- `@servicejs/result` - Result type for error handling
- `@servicejs/option` - Option type for nullable values

## Best Practices Shown

1. **Pure Reducers**: All state updates are pure functions
2. **Immutability**: State is never mutated, always copied
3. **Type Safety**: Full TypeScript types with inference
4. **Capability Discipline**: Components interact only via capabilities
5. **Message Passing**: No direct method calls between components
6. **Effect Isolation**: Side effects returned as data, executed separately
7. **Error Handling**: Proper use of Result and Option types

## Next Steps

After exploring these examples:
1. Read the package-specific documentation for deeper understanding
2. Build your own application using these patterns
3. Experiment with combining patterns in different ways
4. Explore the individual package examples for more details

## License

MIT
