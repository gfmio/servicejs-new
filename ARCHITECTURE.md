# ServiceJS Architecture

This document describes the architecture, design principles, and implementation patterns of ServiceJS.

## Table of Contents

- [Core Principles](#core-principles)
- [System Architecture](#system-architecture)
- [Component Model](#component-model)
- [Message Passing](#message-passing)
- [Capability Security](#capability-security)
- [Error Handling](#error-handling)
- [Patterns and Best Practices](#patterns-and-best-practices)

## Core Principles

### 1. Pure Message Passing

**Principle**: Components communicate exclusively through messages. No direct method calls, no shared mutable state.

**Why**:
- **Isolation**: Components can't interfere with each other's internals
- **Testability**: Easy to test by sending messages and observing outputs
- **Distribution**: Messages can cross process/network boundaries
- **Replay/Debug**: Message history can be recorded and replayed

**Example**:
```typescript
// ✅ Good: Message passing
component.send({ type: 'update', value: 42 });

// ❌ Bad: Direct method call
component.update(42);
```

### 2. Capability-Based Security

**Principle**: Access to resources is granted through unforgeable references (capabilities). Components can only interact with resources they have capabilities for.

**Why**:
- **Least Privilege**: Components get only the access they need
- **Composability**: Capabilities can be attenuated and delegated
- **Auditability**: All access goes through explicit capability references
- **No Ambient Authority**: No global `fs`, `fetch`, `console` access

**Example**:
```typescript
// Runtime grants capabilities explicitly
const runtime = bootstrap();
const fs = runtime.fs; // File system capability

// Component receives only what it needs
createComponent({
  fs: fs.withReadOnly('/data'), // Attenuated capability
});
```

### 3. Functional Core, Imperative Shell

**Principle**: Core logic is pure functions. Side effects are isolated to the edges.

**Why**:
- **Predictability**: Pure functions have no surprises
- **Testability**: Easy to unit test without mocks
- **Reasoning**: Easier to understand and maintain
- **Composability**: Pure functions compose naturally

**Example**:
```typescript
// Pure: Reducer computes next state
function reducer(state: State, msg: Message): [State, Effect[]] {
  // Pure computation
  const nextState = computeNextState(state, msg);
  const effects = computeEffects(msg);
  return [nextState, effects];
}

// Imperative: Runtime executes effects
runtime.executeEffects(effects);
```

### 4. Type Safety

**Principle**: Leverage TypeScript's type system to catch errors at compile time.

**Why**:
- **Early Detection**: Catch bugs before runtime
- **Refactoring**: Safe, confident refactoring
- **Documentation**: Types are living documentation
- **IDE Support**: Better autocomplete and error checking

**Example**:
```typescript
// Discriminated unions for message types
type Message =
  | { type: 'increment'; amount: number }
  | { type: 'decrement'; amount: number }
  | { type: 'reset' };

// Type-safe pattern matching
function handle(msg: Message) {
  switch (msg.type) {
    case 'increment':
      return msg.amount; // TypeScript knows amount exists
    case 'decrement':
      return -msg.amount;
    case 'reset':
      return 0;
  }
}
```

### 5. Explicit Over Implicit

**Principle**: Dependencies, side effects, and control flow should be explicit.

**Why**:
- **Understandability**: Easy to see what a component depends on
- **Testability**: Easy to substitute dependencies
- **Maintainability**: Clear contracts between components

**Example**:
```typescript
// ✅ Explicit dependencies
function createService(
  db: DatabaseCapability,
  logger: LoggerCapability,
  config: Config
) {
  // Dependencies are visible in signature
}

// ❌ Implicit dependencies
function createService() {
  const db = getGlobalDatabase(); // Hidden dependency!
  const logger = console; // Ambient authority!
}
```

## System Architecture

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────┐
│                        Application                          │
│                                                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐          │
│  │ Component  │  │ Component  │  │ Component  │          │
│  │            │  │            │  │            │          │
│  │ ┌────────┐ │  │ ┌────────┐ │  │ ┌────────┐ │          │
│  │ │Mailbox │◄┼──┼─┤Mailbox │◄┼──┼─┤Mailbox │ │          │
│  │ └────────┘ │  │ └────────┘ │  │ └────────┘ │          │
│  │            │  │            │  │            │          │
│  │Capability  ├──┼►Capability ├──┼►Capability │          │
│  └────────────┘  └────────────┘  └────────────┘          │
│                                                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                       Runtime                                │
│                                                             │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐         │
│  │  FS  │  │ HTTP │  │ Time │  │ Env  │  │Crypto│         │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component Lifecycle

```
┌─────────────┐
│   Create    │
│  Component  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Initialize  │
│  Mailbox    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Running   │◄────┐
│  (Process   │     │
│  Messages)  │     │ Message Loop
└──────┬──────┘     │
       │            │
       └────────────┘
       │
       ▼
┌─────────────┐
│  Shutdown   │
│   (Flush    │
│  Messages)  │
└─────────────┘
```

## Component Model

### Component Structure

A ServiceJS component consists of:

1. **State** - Private, immutable state
2. **Mailbox** - Message queue for incoming messages
3. **Handler** - Pure function that processes messages
4. **Capability** - Public interface for sending messages

```typescript
interface Component<TState, TMsg> {
  state: TState; // Private, not exposed
  mailbox: Mailbox<TMsg>; // Message queue
  handler: (state: TState, msg: TMsg) => TState; // Pure
  capability: Capability<TMsg>; // Public interface
}
```

### Component Creation Pattern

```typescript
function createCounter(initial: number = 0) {
  // 1. Create mailbox
  const mailbox = createSyncMailbox<CounterMsg>();

  // 2. Private state
  let state = { count: initial };

  // 3. Message handler
  mailbox.onMessage((msg) => {
    switch (msg.type) {
      case 'increment':
        state = { count: state.count + msg.amount };
        break;
      case 'get':
        msg.replyTo.send(ok(state.count));
        break;
    }
  });

  // 4. Return capability
  return {
    send: mailbox.send,
  };
}
```

### State Management

**Principle**: State is private and immutable. Updates create new state.

```typescript
// ✅ Good: Immutable state updates
function reducer(state: State, msg: Message): State {
  return {
    ...state,
    count: state.count + 1,
  };
}

// ❌ Bad: Mutable state
function reducer(state: State, msg: Message): State {
  state.count += 1; // Mutation!
  return state;
}
```

## Message Passing

### Message Types

Messages are plain data objects with a `type` field:

```typescript
type UserMsg =
  | { type: 'create'; name: string; email: string }
  | { type: 'update'; id: string; name: string }
  | { type: 'delete'; id: string }
  | { type: 'get'; id: string; replyTo: Capability<Result<User, Error>> };
```

### Sending Messages

```typescript
// Fire-and-forget
capability.send({ type: 'log', message: 'Hello' });

// Request-reply
const result = await request(capability, { type: 'query', sql: '...' });
```

### Message Flow

```
Sender                  Mailbox                 Handler
  │                       │                       │
  │─────send(msg)────────►│                       │
  │                       │                       │
  │                       │──────process()───────►│
  │                       │                       │
  │                       │◄──────result──────────│
  │                       │                       │
  │◄────reply(result)─────│                       │
```

### Mailbox Types

**Sync Mailbox**: Immediate, synchronous processing

```typescript
const mailbox = createSyncMailbox<Message>();
mailbox.onMessage((msg) => {
  // Processed immediately
  handleMessage(msg);
});
```

**Async Mailbox**: Queued, asynchronous processing

```typescript
const mailbox = createAsyncMailbox<Message>();
mailbox.onMessage(async (msg) => {
  // Queued, processed asynchronously
  await handleMessageAsync(msg);
});
```

**Priority Mailbox**: Sorted by priority

```typescript
const mailbox = createPriorityMailbox<Message>();
mailbox.send(urgentMsg, 1); // High priority (processed first)
mailbox.send(normalMsg, 3); // Low priority
```

## Capability Security

### What is a Capability?

A capability is an unforgeable reference that both:
1. **Designates** a resource (identifies what)
2. **Authorizes** access (grants permission)

```typescript
// Capability = Designation + Authorization
interface Capability<TMsg> {
  send(message: TMsg): void;
}
```

### Granting Capabilities

```typescript
// Runtime creates and grants capabilities
const runtime = bootstrap();

// Grant file system capability
const component = createComponent({
  fs: runtime.fs, // Full access
});

// Or grant attenuated capability
const component = createComponent({
  fs: runtime.fs.withReadOnly('/data'), // Limited access
});
```

### Capability Patterns

**Attenuation**: Reduce authority

```typescript
// Full capability
const fs: FileSystemCapability = runtime.fs;

// Attenuated: read-only
const readOnlyFs = fs.withReadOnly();

// Attenuated: single directory
const dataFs = fs.withRoot('/data');

// Combine: read-only + single directory
const limited = fs.withReadOnly().withRoot('/data');
```

**Delegation**: Pass capabilities to other components

```typescript
// Component A grants capability to Component B
componentB.send({
  type: 'setDatabase',
  db: myDatabaseCapability, // Delegate authority
});
```

**Revocation**: Remove access

```typescript
// Create revocable capability
const [capability, revoke] = createRevocableCapability(original);

// Grant to untrusted code
untrustedComponent.send({ type: 'init', db: capability });

// Later: revoke access
revoke();

// Now capability is inert (does nothing)
```

### No Ambient Authority

**Problem**: Global access is a security hole

```typescript
// ❌ Bad: Ambient authority
import fs from 'fs'; // Any code can access file system
import { fetch } from 'undici'; // Any code can make HTTP requests

function processData(data: unknown) {
  // Untrusted data could access file system!
  eval(data);
}
```

**Solution**: Explicit capability grants

```typescript
// ✅ Good: Explicit capabilities
function processData(
  data: unknown,
  fs: FileSystemCapability,
  http: HttpCapability
) {
  // Only has access to provided capabilities
  // eval() has no ambient authority
}
```

## Error Handling

### Result Type

All fallible operations return `Result<T, E>`:

```typescript
// Success
const result: Result<number, Error> = ok(42);

// Failure
const result: Result<number, Error> = err(new Error('Failed'));

// Check and unwrap
if (isOk(result)) {
  console.log(result.value); // Type: number
} else {
  console.error(result.error.message); // Type: Error
}
```

### Option Type

Nullable values use `Option<T>`:

```typescript
// Present
const option: Option<number> = some(42);

// Absent
const option: Option<number> = none();

// Check and unwrap
if (isSome(option)) {
  console.log(option.value); // Type: number
}
```

### Error Propagation

```typescript
import { map, andThen } from '@servicejs/result';

function processUser(id: string): Result<User, Error> {
  // Chain operations, short-circuit on error
  const userResult = database.findUser(id);
  const validResult = andThen(userResult, validateUser);
  const enrichedResult = andThen(validResult, enrichUser);
  return enrichedResult;
}
```

### Never Throw

**Principle**: Never use `throw` for control flow. Use Result types.

```typescript
// ✅ Good: Result type
function divide(a: number, b: number): Result<number, Error> {
  if (b === 0) return err(new Error('Division by zero'));
  return ok(a / b);
}

// ❌ Bad: Throwing
function divide(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
}
```

## Patterns and Best Practices

### Pattern 1: Request/Reply

```typescript
import { request } from '@servicejs/request-reply';

// Simple request
const result = await request(capability, { type: 'query', sql: '...' });

// With timeout
const result = await requestWithTimeout(
  capability,
  { type: 'query', sql: '...' },
  5000 // 5 second timeout
);
```

### Pattern 2: Publish/Subscribe

```typescript
import { createPubSub } from '@servicejs/pubsub';

const pubsub = createPubSub<Event>();

// Subscribe
const unsubscribe = pubsub.subscribe('user.created', (event) => {
  console.log('User created:', event);
});

// Publish
pubsub.publish('user.created', { userId: '123', name: 'Alice' });

// Unsubscribe
unsubscribe();
```

### Pattern 3: Supervision

```typescript
function createSupervisor(childFactory: () => Component) {
  let child = childFactory();

  const supervisor = createSyncMailbox<SupervisorMsg>();

  supervisor.onMessage((msg) => {
    switch (msg.type) {
      case 'child_failed':
        // Restart child
        child = childFactory();
        break;
      case 'forward':
        // Forward to child
        child.send(msg.message);
        break;
    }
  });

  return supervisor;
}
```

### Pattern 4: Circuit Breaker

```typescript
function createCircuitBreaker(
  capability: Capability<Message>,
  options: {
    failureThreshold: number;
    timeout: number;
  }
) {
  let failures = 0;
  let state: 'closed' | 'open' | 'half-open' = 'closed';

  return {
    send(msg: Message) {
      if (state === 'open') {
        return err(new Error('Circuit breaker is open'));
      }

      try {
        capability.send(msg);
        failures = 0; // Reset on success
        if (state === 'half-open') state = 'closed';
        return ok(undefined);
      } catch (error) {
        failures++;
        if (failures >= options.failureThreshold) {
          state = 'open';
          setTimeout(() => {
            state = 'half-open';
          }, options.timeout);
        }
        return err(error);
      }
    },
  };
}
```

### Pattern 5: Content-Addressed Storage

```typescript
import { createInMemoryCAS } from '@servicejs/cas';

const cas = createInMemoryCAS();

// Store large data in CAS
const address = await cas.put(largeData);

// Send address instead of data
capability.send({
  type: 'process',
  dataAddress: address, // Small!
});

// Receiver retrieves from CAS
const data = await cas.get(message.dataAddress);
```

### Pattern 6: Backpressure

```typescript
import { createBackpressureMailbox } from '@servicejs/flow-control';

const mailbox = createBackpressureMailbox<Message>({
  capacity: 100,
  strategy: 'drop-oldest', // or 'block' or 'error'
});

// Mailbox automatically applies backpressure
const result = mailbox.send(msg);

if (isErr(result) && result.error.type === 'MAILBOX_FULL') {
  // Handle backpressure
  await delay(100);
  retry();
}
```

## Comparison with Other Approaches

### vs Object-Oriented Programming

| OOP | ServiceJS |
|-----|-----------|
| Method calls | Message passing |
| Inheritance | Composition |
| Mutable state | Immutable state |
| Exceptions | Result types |
| this/self | Explicit state |

### vs Actor Model (Erlang)

| Erlang | ServiceJS |
|--------|-----------|
| Lightweight processes | Components with mailboxes |
| Pattern matching | TypeScript discriminated unions |
| Supervision trees | Supervisor pattern |
| let it crash | Result types + supervision |
| Hot code reloading | Not yet supported |

### vs Functional Programming

| FP | ServiceJS |
|----|-----------|
| Pure functions | Pure reducers |
| Immutable data | Immutable state |
| Monads | Result/Option types |
| Composition | Message composition |
| No side effects | Effects at edges |

## Design Trade-offs

### Benefits

✅ **Security**: Capability-based security by default
✅ **Testability**: Pure functions are easy to test
✅ **Maintainability**: Explicit dependencies and contracts
✅ **Composability**: Components combine without coupling
✅ **Distribution**: Message passing works across processes
✅ **Type Safety**: TypeScript catches errors early

### Trade-offs

⚠️ **Indirection**: Message passing adds a layer of indirection
⚠️ **Verbosity**: More explicit than direct method calls
⚠️ **Learning Curve**: Capability thinking requires mindset shift
⚠️ **Tooling**: Fewer tools than mainstream frameworks

### When to Use ServiceJS

**Good fit:**
- Security-critical applications
- Distributed systems
- Long-lived systems that need to evolve
- Systems with complex authorization requirements
- Applications that need strong testability

**May not fit:**
- Quick prototypes or throwaway code
- Simple scripts or utilities
- Performance-critical tight loops
- Projects with strict framework requirements

## Further Reading

- **[Design Document](./DESIGN_DOC.md)** - Complete design rationale
- **[Performance Guide](./PERFORMANCE.md)** - Benchmarks and optimization
- **[API Reference](./docs/api/)** - Detailed API documentation
- **[Examples](./examples/)** - Real-world example applications

---

**ServiceJS Architecture**: Secure, composable, message-based systems. 🏗️
