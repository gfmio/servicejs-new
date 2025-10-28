# ServiceJS

**A capability-based, message-passing framework for TypeScript**

Pure, type-safe, composable components that communicate exclusively through messages.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

## What is ServiceJS?

ServiceJS is a framework for building **secure, composable, and testable** systems using:

- 🔒 **Capability-Based Security** - Components access resources only through explicit capabilities
- 📨 **Pure Message Passing** - All communication happens through messages, no direct method calls
- ✅ **Type-Safe** - Full TypeScript support with discriminated unions and branded types
- 🧪 **Testable** - Pure functions and dependency injection make testing trivial
- 🎯 **Minimalist Core** - Tiny, focused core with utilities in separate packages
- ⚡ **High Performance** - Sync mailboxes process 5M+ messages/second

## Quick Start

```bash
bun add @servicejs/core @servicejs/mailbox @servicejs/result
```

```typescript
import { createSyncMailbox } from '@servicejs/mailbox';
import { ok } from '@servicejs/result';

// Define message types
type CounterMsg =
  | { type: 'increment'; amount: number }
  | { type: 'get'; replyTo: Capability<Result<number, never>> };

// Create a counter component
function createCounter(initial: number = 0) {
  const mailbox = createSyncMailbox<CounterMsg>();
  let count = initial;

  mailbox.onMessage((msg) => {
    switch (msg.type) {
      case 'increment':
        count += msg.amount;
        break;
      case 'get':
        msg.replyTo.send(ok(count));
        break;
    }
  });

  return mailbox;
}

// Use the counter
const counter = createCounter();
counter.send({ type: 'increment', amount: 5 });
counter.send({ type: 'increment', amount: 3 });

// Request current value
const replyMailbox = createSyncMailbox<Result<number, never>>();
counter.send({ type: 'get', replyTo: replyMailbox });

// count is now 8
```

## Core Concepts

### Capabilities

A **capability** is an unforgeable reference that grants authority to interact with a component. You can only send messages to components you have capabilities for.

```typescript
// Component grants a capability
const capability = {
  send: (msg: Message) => mailbox.send(msg),
};

// Capability can be passed to trusted code
trustedComponent.setDatabaseAccess(capability);

// Untrusted code has no access
// (unless explicitly granted a capability)
```

### Message Passing

Components communicate **exclusively** through messages. No direct method calls, no shared mutable state.

```typescript
// ✅ Good: Message passing
capability.send({ type: 'save', data: user });

// ❌ Bad: Direct method call
component.save(user);
```

### Result Types

All fallible operations return `Result<T, E>` instead of throwing exceptions.

```typescript
import { ok, err, isOk } from '@servicejs/result';

function divide(a: number, b: number): Result<number, Error> {
  if (b === 0) return err(new Error('Division by zero'));
  return ok(a / b);
}

const result = divide(10, 2);
if (isOk(result)) {
  console.log('Result:', result.value); // 5
} else {
  console.error('Error:', result.error.message);
}
```

### Mailboxes

Mailboxes queue and process messages sent to components.

```typescript
// Sync mailbox: immediate processing
const sync = createSyncMailbox<Message>();
sync.onMessage((msg) => processImmediately(msg));

// Async mailbox: queued processing
const async = createAsyncMailbox<Message>();
async.onMessage(async (msg) => await processAsync(msg));

// Priority mailbox: sorted by priority
const priority = createPriorityMailbox<Message>();
priority.send(urgentMsg, 1); // High priority
priority.send(normalMsg, 3); // Low priority
```

## Packages

ServiceJS is organized into focused packages:

### Core Packages

- **[@servicejs/core](./packages/core)** - Core types and minimal runtime
- **[@servicejs/result](./packages/result)** - Result type for error handling
- **[@servicejs/option](./packages/option)** - Option type for nullable values
- **[@servicejs/either](./packages/either)** - Either type for dual outcomes

### Messaging

- **[@servicejs/mailbox](./packages/mailbox)** - Message queuing and processing
- **[@servicejs/request-reply](./packages/request-reply)** - Request/response patterns
- **[@servicejs/pubsub](./packages/pubsub)** - Publish/subscribe messaging

### Capabilities

- **[@servicejs/capability-env](./packages/capability-env)** - Environment variables
- **[@servicejs/capability-time](./packages/capability-time)** - Time and timers
- **[@servicejs/capability-fs](./packages/capability-fs)** - File system access
- **[@servicejs/capability-http](./packages/capability-http)** - HTTP requests
- **[@servicejs/capability-console](./packages/capability-console)** - Logging
- **[@servicejs/capability-crypto](./packages/capability-crypto)** - Cryptographic operations

### Advanced Features

- **[@servicejs/cas](./packages/cas)** - Content-addressed storage
- **[@servicejs/security](./packages/security)** - Message signing, encryption, authentication
- **[@servicejs/serialization](./packages/serialization)** - Message serialization (JSON, Cap'n Proto)
- **[@servicejs/flow-control](./packages/flow-control)** - Backpressure and flow control

### Developer Tools

- **[@servicejs/decorators](./packages/decorators)** - TypeScript decorators for components
- **[@servicejs/di](./packages/di)** - Dependency injection
- **[@servicejs/config](./packages/config)** - Configuration management

## Architecture

ServiceJS follows these principles:

1. **Pure Message Passing** - Components communicate only via messages
2. **Capability Security** - Access is granted through unforgeable capabilities
3. **No Ambient Authority** - No global state, all dependencies explicit
4. **Type Safety** - Full TypeScript support, no `any` types
5. **Functional Core** - Pure functions, immutable data
6. **Testability** - Easy to mock, easy to test

```
┌─────────────┐         ┌─────────────┐
│  Component  │         │  Component  │
│             │         │             │
│  ┌────────┐ │         │  ┌────────┐ │
│  │Mailbox │ │◄────────┤  │Mailbox │ │
│  └────────┘ │ Message │  └────────┘ │
│             │         │             │
│  Capability │────────►│  Capability │
└─────────────┘         └─────────────┘
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

## Examples

### Counter Service

```typescript
import { createSyncMailbox } from '@servicejs/mailbox';

type CounterMsg =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'get'; replyTo: Capability<number> };

function createCounter() {
  const mailbox = createSyncMailbox<CounterMsg>();
  let count = 0;

  mailbox.onMessage((msg) => {
    switch (msg.type) {
      case 'increment':
        count++;
        break;
      case 'decrement':
        count--;
        break;
      case 'get':
        msg.replyTo.send(count);
        break;
    }
  });

  return { send: mailbox.send };
}
```

### Request/Reply Pattern

```typescript
import { request } from '@servicejs/request-reply';
import { isOk } from '@servicejs/result';

// Make a request and wait for reply
const result = await request(
  databaseCapability,
  { type: 'query', sql: 'SELECT * FROM users' }
);

if (isOk(result)) {
  console.log('Query result:', result.value);
} else {
  console.error('Query failed:', result.error);
}
```

### File System with Capabilities

```typescript
import { bootstrap } from '@servicejs/runtime-node';

const runtime = bootstrap();

// File system access is a capability
const fs = runtime.fs;

const result = await fs.readFile('/path/to/file.txt', 'utf-8');
if (isOk(result)) {
  console.log('File contents:', result.value);
}

// Untrusted code doesn't have fs capability
// Can't access file system without explicit grant
```

### Content-Addressed Storage

```typescript
import { createInMemoryCAS } from '@servicejs/cas';
import { isOk } from '@servicejs/result';

const cas = createInMemoryCAS();

// Store data, get content address
const data = { user: 'alice', role: 'admin' };
const addressResult = await cas.put(data);

if (isOk(addressResult)) {
  const address = addressResult.value; // e.g., "sha256:abc123..."

  // Retrieve by address
  const retrieved = await cas.get(address);
  if (isOk(retrieved)) {
    console.log(retrieved.value); // { user: 'alice', role: 'admin' }
  }
}
```

### Message Security

```typescript
import { createMessageSigner } from '@servicejs/security';
import { isOk } from '@servicejs/result';

const signer = createMessageSigner();

// Generate signing keys
const keyPair = await signer.generateKeyPair();
if (!isOk(keyPair)) return;

// Sign a message
const message = { type: 'transfer', amount: 100, to: 'bob' };
const signed = await signer.sign(message, keyPair.value);
if (!isOk(signed)) return;

// Verify signature
const verified = await signer.verify(signed.value);
if (isOk(verified) && verified.value.valid) {
  console.log('Signature is valid!');
  console.log('Message:', verified.value.message);
}
```

## Performance

ServiceJS is designed for high performance:

- **Sync Mailboxes**: 5M+ messages/second
- **Async Mailboxes**: 1M+ messages/second
- **Result Types**: 2-3x faster than exceptions
- **Token Auth**: 100-200 μs per operation
- **CAS Deduplication**: Automatic and efficient

See [PERFORMANCE.md](./PERFORMANCE.md) for detailed benchmarks and optimization strategies.

## Testing

ServiceJS components are easy to test because:

1. **Pure Functions** - Reducers are pure, deterministic
2. **Explicit Dependencies** - All dependencies are capabilities
3. **No Side Effects** - Side effects are isolated to effects
4. **Mockable** - Easy to create mock capabilities

```typescript
import { test, expect } from 'bun:test';

test('counter increments correctly', () => {
  const counter = createCounter();

  counter.send({ type: 'increment' });
  counter.send({ type: 'increment' });

  const replyMailbox = createSyncMailbox<number>();
  counter.send({ type: 'get', replyTo: replyMailbox });

  let count = 0;
  replyMailbox.onMessage((value) => {
    count = value;
  });

  expect(count).toBe(2);
});
```

## Documentation

- **[Architecture Guide](./ARCHITECTURE.md)** - System architecture and design
- **[Design Document](./DESIGN_DOC.md)** - Complete design rationale
- **[Implementation Plan](./IMPLEMENTATION_PLAN.md)** - Development roadmap
- **[Performance Guide](./PERFORMANCE.md)** - Benchmarks and optimization
- **[Migration Guide](./MIGRATION_GUIDE.md)** - Migrating from other frameworks

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT © 2025 ServiceJS Contributors

## Why ServiceJS?

**Compared to traditional frameworks:**

| Feature | Traditional | ServiceJS |
|---------|-------------|-----------|
| Communication | Method calls | Messages |
| Security | Trust-based | Capability-based |
| State | Mutable | Immutable |
| Errors | Exceptions | Result types |
| Testing | Mock frameworks | Pure functions |
| Dependencies | Implicit | Explicit |
| Coupling | Tight | Loose |

**Benefits:**

- ✅ **Secure by Design** - Capability security prevents unauthorized access
- ✅ **Testable** - Pure, isolated components are easy to test
- ✅ **Composable** - Components combine cleanly without side effects
- ✅ **Maintainable** - Explicit dependencies and message contracts
- ✅ **Scalable** - Message passing enables distributed systems
- ✅ **Type-Safe** - Full TypeScript support catches errors at compile time

## Learn More

- 📚 [Getting Started Guide](./docs/getting-started.md)
- 🏗️ [Architecture Overview](./ARCHITECTURE.md)
- 🎓 [Tutorial Series](./docs/tutorials/)
- 📖 [API Reference](./docs/api/)
- 💬 [Community Discord](https://discord.gg/servicejs)
- 🐛 [Issue Tracker](https://github.com/servicejs/servicejs/issues)

## Acknowledgments

ServiceJS is inspired by:

- [Erlang/OTP](https://www.erlang.org/) - Actor model and supervision trees
- [Capability-based Security](https://en.wikipedia.org/wiki/Capability-based_security) - Object-capabilities
- [E Language](http://erights.org/) - Promise pipelining and capability patterns
- [Rust](https://www.rust-lang.org/) - Result types and ownership model

---

**Build secure, composable systems with ServiceJS.** 🚀
