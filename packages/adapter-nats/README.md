# @servicejs/adapter-nats

NATS message queue adapter for ServiceJS.

## Installation

```bash
bun add @servicejs/adapter-nats
```

## Usage

### Basic Pub/Sub

```typescript
import { createNatsAdapter } from '@servicejs/adapter-nats';
import { isOk } from '@servicejs/result';

const nats = createNatsAdapter();

await nats.init({ servers: 'nats://localhost:4222' });
await nats.start();

// Subscribe to messages
await nats.subscribe('events.user', async (message) => {
  console.log('Received:', message.data);
});

// Publish message
await nats.publish('events.user', {
  type: 'user.created',
  userId: '123',
});

await nats.stop();
await nats.destroy();
```

### Wildcard Subscriptions

```typescript
// Single token wildcard
await nats.subscribe('events.*', async (message) => {
  console.log(message.subject, message.data);
});

// Multi-token wildcard
await nats.subscribe('events.user.>', async (message) => {
  console.log(message.subject, message.data);
});

// Publish to different subjects
await nats.publish('events.user', { type: 'general' });
await nats.publish('events.user.created', { userId: '123' });
await nats.publish('events.user.updated', { userId: '456' });
```

### Request-Reply Pattern

```typescript
import { createNatsResponder } from '@servicejs/adapter-nats';

// Create responder
await createNatsResponder<{ userId: string }, { user: User }>(
  nats,
  'user.get',
  async (message) => {
    const user = await database.getUser(message.data.userId);
    return { user };
  }
);

// Make request
const result = await nats.request<{ userId: string }, { user: User }>(
  'user.get',
  { userId: '123' },
  5000 // timeout in ms
);

if (isOk(result)) {
  console.log('User:', result.value.user);
}
```

## API

- `init(config)` - Initialize connection to NATS server
- `start()` - Start the adapter
- `stop()` - Stop and drain all subscriptions
- `destroy()` - Close connection and cleanup
- `health()` - Check connection health
- `publish<T>(subject, message)` - Publish message to subject
- `subscribe<T>(subject, handler)` - Subscribe to subject (supports wildcards)
- `unsubscribe(subject)` - Unsubscribe from subject
- `request<TReq, TRes>(subject, message, timeout?)` - Request-reply pattern

## Wildcards

NATS supports two types of wildcards:

- `*` (asterisk) - Matches exactly one token
  - `events.*` matches `events.user`, `events.order`
  - Does NOT match `events.user.created` or `events`

- `>` (greater than) - Matches one or more tokens
  - `events.>` matches `events.user`, `events.user.created`, `events.user.created.v1`
  - `events.user.>` matches `events.user.created`, `events.user.updated`

## Configuration

```typescript
interface NatsConfig {
  servers?: string | string[];  // NATS server URLs
  name?: string;                // Connection name
  user?: string;                // Username for auth
  pass?: string;                // Password for auth
  token?: string;               // Token for auth
  maxReconnectAttempts?: number;
  reconnectTimeWait?: number;   // In milliseconds
  timeout?: number;             // Connection timeout in ms
}
```

## Features

- **Pub/Sub Messaging** - Simple publish-subscribe pattern
- **Wildcard Subscriptions** - Flexible topic matching with `*` and `>`
- **Request-Reply** - Built-in request-reply pattern
- **Type Safety** - Full TypeScript support with generics
- **Result Types** - Rust-style error handling
- **Auto Reconnect** - Automatic reconnection on connection loss
- **Health Checks** - Monitor connection status

## Running NATS Server

```bash
# Docker
docker run -d -p 4222:4222 nats:latest

# With authentication
docker run -d -p 4222:4222 nats:latest -auth mytoken

# Homebrew (macOS)
brew install nats-server
nats-server
```

## Testing

Tests use testcontainers to automatically start a NATS server:

```bash
bun test
```

The tests will automatically:
- Pull the nats:2.10-alpine Docker image
- Start a NATS container
- Run all tests against the container
- Stop and remove the container

## License

MIT
