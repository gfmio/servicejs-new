# Getting Started with Actor Framework

This guide will walk you through creating your first application with the Actor Framework.

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd actor-framework

# Install dependencies
bun install

# Build all packages
bun run build
```

## Core Concepts

Before we start, let's understand the key concepts:

1. **Components**: Self-contained units that process messages
2. **Messages**: The only way components communicate
3. **Capabilities**: Secure references to other components
4. **Reducers**: Pure functions that process messages and update state
5. **Mailboxes**: Control how messages are queued and delivered

## Your First Component

Let's create a simple greeting service:

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

// 1. Define your state
interface GreeterState extends ComponentState {
  greetingCount: number;
}

// 2. Define your messages
interface GreetMessage extends Message {
  type: 'greet';
  name: string;
}

// 3. Create a reducer
const greeterReducer: Reducer<GreeterState, GreetMessage> = (state, message) => {
  console.log(`Hello, ${message.name}!`);
  
  return Ok({
    state: { greetingCount: state.greetingCount + 1 },
    effects: [],
  });
};

// 4. Set up the component
async function main() {
  // Create transport
  const transport = createLocalTransport<GreetMessage>();
  await transport.start();

  // Create component
  const greeterURN = createURN('greeter', 'main');
  const greeter = createStatefulReducer<GreeterState, GreetMessage>(
    { greetingCount: 0 },
    greeterReducer
  );

  // Create mailbox
  const mailbox = createFIFOMailbox<GreetMessage>((msg) => {
    greeter.reduce(msg);
  });
  mailbox.start();

  // Register with transport
  transport.registerHandler(greeterURN, (msg) => {
    mailbox.enqueue(msg);
  });

  // Get a channel to send messages
  const channel = transport.createChannel<GreetMessage>(greeterURN);

  // Send some messages
  channel.send({ type: 'greet', name: 'Alice' });
  channel.send({ type: 'greet', name: 'Bob' });
  channel.send({ type: 'greet', name: 'Charlie' });

  // Cleanup
  await new Promise(resolve => setTimeout(resolve, 100));
  await mailbox.stop();
  await transport.stop();
}

main();
```

## Request-Reply Pattern

Most components need to respond to requests. Here's how:

```typescript
import {
  type Request,
  type Response,
  createRequestReply,
  createSuccessResponse,
} from '@actor-framework/patterns';

// Define request/response types
interface AddRequest {
  a: number;
  b: number;
}

type AddResponse = number;

// Create reducer that handles requests
const calculatorReducer: Reducer<State, Request<AddRequest, AddResponse>> = (
  state,
  message
) => {
  const result = message.data.a + message.data.b;
  message.replyTo.send(createSuccessResponse(result));
  
  return Ok({ state, effects: [] });
};

// Use it
const client = createRequestReply<AddRequest, AddResponse>(channel);
const result = await client.ask({ a: 5, b: 3 });

if (result.ok) {
  console.log('Result:', result.value); // 8
}
```

## Capability-Based Security

Components should only interact through capabilities:

```typescript
import { createCapability, createValidatingCapability } from '@actor-framework/core';

// Create a basic capability
const basicCap = createCapability(targetURN, channel);

// Create a validating capability (only allows certain messages)
const restrictedCap = createValidatingCapability(
  targetURN,
  channel,
  (msg) => msg.priority > 5, // Only high-priority messages
  (msg) => console.warn('Message rejected:', msg)
);

// Create a rate-limited capability
const limitedCap = createRateLimitedCapability(
  targetURN,
  channel,
  10 // Max 10 messages per second
);
```

## Configuration

Parse configuration from multiple sources:

```typescript
import { parseStandardConfig } from '@actor-framework/config';

const configResult = await parseStandardConfig('./config.json', 'APP_');

if (configResult.ok) {
  const config = configResult.value;
  
  const port = config.getNumber('server.port', 3000);
  const debug = config.getBoolean('debug', false);
  const dbHost = config.get<string>('database.host');
}
```

Configuration priority (highest to lowest):
1. Command-line arguments: `--port=3000`
2. Environment variables: `APP_PORT=3000`
3. Config file: `{ "port": 3000 }`
4. Default values

## Pub-Sub Pattern

For event-driven architectures:

```typescript
import { createPubSubBroker } from '@actor-framework/patterns';

const broker = createPubSubBroker<DomainEvent>();

// Subscriber
const subscription = broker.subscribe('orders', channel);

// Publisher
broker.publish('orders', {
  type: 'order-placed',
  orderId: '123',
  userId: 'user-456',
});

// Cleanup
subscription.unsubscribe();
```

## Error Handling

Never use exceptions. Always use `Result<T, E>`:

```typescript
import { Ok, Err, type Result } from '@actor-framework/core';

function divideNumbers(a: number, b: number): Result<number, Error> {
  if (b === 0) {
    return Err(new Error('Division by zero'));
  }
  return Ok(a / b);
}

const result = divideNumbers(10, 2);

if (result.ok) {
  console.log('Result:', result.value);
} else {
  console.error('Error:', result.error.message);
}

// Or use map/andThen for composition
const doubled = map(result, x => x * 2);
```

## Session Types

Components can evolve their behavior over time:

```typescript
import { ProtocolBuilder } from '@actor-framework/core';

const protocol = new ProtocolBuilder<State>()
  .state('disconnected', (msg): msg is ConnectMsg => msg.type === 'connect')
  .state('connected', (msg): msg is DataMsg | DisconnectMsg => 
    msg.type === 'data' || msg.type === 'disconnect')
  .on('disconnected', 'connect', handleConnect, 'connected')
  .on('connected', 'data', handleData, 'connected')
  .on('connected', 'disconnect', handleDisconnect, 'disconnected')
  .buildProtocol('disconnected');
```

## Supervision

Handle failures gracefully:

```typescript
import { createSupervisor } from '@actor-framework/patterns';

const supervisor = createSupervisor(
  supervisorURN,
  'restart',  // Restart failed components
  3,          // Max 3 retries
  1000        // Wait 1 second between retries
);

supervisor.registerChild(component);

// Components report errors to their supervisor
const errorChannel = supervisor.createErrorChannel(component.urn);
errorChannel.send({
  type: 'error',
  componentURN: component.urn,
  error: new Error('Something went wrong'),
});
```

## Running the Examples

The framework includes several complete examples:

```bash
# Basic counter example
cd packages/example
bun run dev

# ATM state machine example
bun run dev:protocol

# Event bus with pub-sub
bun run dev:pubsub
```

## Best Practices

### 1. Pure Reducers

Reducers should be pure functions:

```typescript
// ✓ Good: Pure function
const reducer = (state, msg) => {
  return Ok({
    state: { ...state, count: state.count + 1 },
    effects: [],
  });
};

// ✗ Bad: Side effects
const reducer = (state, msg) => {
  console.log('Received message'); // Side effect!
  state.count++; // Mutation!
  return Ok({ state, effects: [] });
};
```

### 2. Use Capabilities

Never access components directly:

```typescript
// ✓ Good: Access through capability
interface ComponentConfig {
  capabilities: {
    logger: Capability<LogMessage>;
  };
}

// ✗ Bad: Direct import
import { logger } from './logger';
```

### 3. Type Your Messages

Always use strong typing:

```typescript
// ✓ Good: Strongly typed
interface UserCreatedEvent extends Message {
  type: 'user-created';
  userId: string;
  email: string;
  timestamp: number;
}

// ✗ Bad: Weak typing
interface GenericEvent extends Message {
  type: string;
  payload: any;
}
```

### 4. Choose the Right Mailbox

- **FIFO**: Default for stateful components
- **Parallel**: For stateless, CPU-intensive work
- **Priority**: When some messages are more important
- **Batching**: For high-throughput scenarios

### 5. Handle All Errors

Use `Result<T, E>` everywhere:

```typescript
// ✓ Good: Explicit error handling
const result = await operation();
if (!result.ok) {
  logger.send({ type: 'error', error: result.error });
  return;
}

// ✗ Bad: Throwing exceptions
try {
  await operation();
} catch (error) {
  // Exceptions break the pure message-passing model
}
```

## Next Steps

1. Read the [API Documentation](./API.md) for detailed reference
2. Study the examples in `packages/example/src/`
3. Build your own application!
4. Explore advanced features:
   - Protocol types for state machines
   - Supervision hierarchies
   - Custom transports
   - Content-addressed storage (coming soon)

## Need Help?

- Check the examples in `packages/example/`
- Read the API documentation
- Review the README for architecture details

## Common Patterns

### Application Root

```typescript
async function main() {
  // 1. Parse config
  const config = await parseStandardConfig();
  
  // 2. Create transport
  const transport = createLocalTransport();
  await transport.start();
  
  // 3. Create supervisor
  const supervisor = createSupervisor(rootURN, 'restart');
  
  // 4. Initialize components
  const components = await initializeComponents(config, transport);
  components.forEach(c => supervisor.registerChild(c));
  
  // 5. Handle shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await supervisor.shutdownAll();
    await transport.stop();
    process.exit(0);
  });
  
  // 6. Start application
  console.log('Application started');
}

main().catch(console.error);
```

### Testing Components

Components are easy to test because they're pure:

```typescript
// Test a reducer
const state = { count: 0 };
const message = { type: 'increment', amount: 5 };

const result = reducer(state, message);

assert(result.ok);
assert(result.value.state.count === 5);
```

### Logging

Create a logger component that all others use:

```typescript
interface LogMessage extends Message {
  type: 'log';
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
}

const createLogger = (urn: URN) => {
  return createHandlerComponent<LogMessage>(urn, (msg) => {
    console.log(`[${msg.level}] ${msg.message}`);
  });
};

// Other components get a logger capability
const loggerCap = createCapability(loggerURN, loggerChannel);
```

Happy building! 🚀
