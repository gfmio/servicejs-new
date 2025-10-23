# Actor Framework - Quick Reference

## Installation & Setup

```bash
bun install
bun run build
cd packages/example && bun run dev
```

## Basic Component

```typescript
import { createURN, Ok, createStatefulReducer } from '@actor-framework/core';
import { createFIFOMailbox } from '@actor-framework/mailbox';
import { createLocalTransport } from '@actor-framework/transport';

// 1. Define state & messages
interface State { count: number; }
interface Increment { type: 'inc'; amount: number; }

// 2. Create reducer
const reducer = (state: State, msg: Increment) => 
  Ok({ state: { count: state.count + msg.amount }, effects: [] });

// 3. Set up
const transport = createLocalTransport();
await transport.start();

const urn = createURN('counter', 'main');
const component = createStatefulReducer({ count: 0 }, reducer);
const mailbox = createFIFOMailbox((msg) => component.reduce(msg));
mailbox.start();

transport.registerHandler(urn, (msg) => mailbox.enqueue(msg));

// 4. Use it
const channel = transport.createChannel(urn);
channel.send({ type: 'inc', amount: 5 });
```

## Request-Reply

```typescript
import { createRequestReply, createSuccessResponse } from '@actor-framework/patterns';

// Handler
const reducer = (state, msg: Request<Input, Output>) => {
  const result = processRequest(msg.data);
  msg.replyTo.send(createSuccessResponse(result));
  return Ok({ state, effects: [] });
};

// Client
const client = createRequestReply(channel);
const result = await client.ask(data, 5000); // 5s timeout
if (result.ok) console.log(result.value);
```

## Pub-Sub

```typescript
import { createPubSubBroker } from '@actor-framework/patterns';

const broker = createPubSubBroker<EventType>();

// Subscribe
const sub = broker.subscribe('topic', channel);

// Publish
broker.publish('topic', eventData);

// Unsubscribe
sub.unsubscribe();
```

## Capabilities

```typescript
import { 
  createCapability,
  createValidatingCapability,
  createRateLimitedCapability,
  createLoggingCapability,
} from '@actor-framework/core';

// Basic
const cap = createCapability(urn, channel);

// Validating
const validated = createValidatingCapability(urn, channel, 
  (msg) => msg.priority > 5);

// Rate limited
const limited = createRateLimitedCapability(urn, channel, 10); // 10/sec

// Logging
const logged = createLoggingCapability(urn, channel);
```

## Result Types

```typescript
import { Ok, Err, map, andThen } from '@actor-framework/core';

function divide(a: number, b: number): Result<number, Error> {
  if (b === 0) return Err(new Error('Division by zero'));
  return Ok(a / b);
}

const result = divide(10, 2);
if (result.ok) {
  console.log(result.value); // 5
} else {
  console.error(result.error.message);
}

// Composition
const doubled = map(result, x => x * 2);
const squared = andThen(result, x => Ok(x * x));
```

## Protocol Types

```typescript
import { ProtocolBuilder } from '@actor-framework/core';

const protocol = new ProtocolBuilder<State>()
  .state('idle', (msg): msg is StartMsg => msg.type === 'start')
  .state('active', (msg): msg is StopMsg => msg.type === 'stop')
  .on('idle', 'start', handleStart, 'active')
  .on('active', 'stop', handleStop, 'idle')
  .buildProtocol('idle');

const reducer = protocol.buildReducer(initialState, 'idle');
```

## Supervision

```typescript
import { createSupervisor } from '@actor-framework/patterns';

const supervisor = createSupervisor(
  urn,
  'restart',  // Strategy: restart | resume | stop | escalate
  3,          // Max retries
  1000        // Retry delay (ms)
);

supervisor.registerChild(component);

// Report errors
const errorChan = supervisor.createErrorChannel(component.urn);
errorChan.send({ type: 'error', componentURN, error, message });
```

## Configuration

```typescript
import { parseStandardConfig } from '@actor-framework/config';

const config = (await parseStandardConfig('./config.json', 'APP_')).value;

const port = config.getNumber('server.port', 3000);
const debug = config.getBoolean('debug', false);
const host = config.get<string>('database.host');
const apiKey = config.getRequired<string>('api.key');
```

## Mailbox Types

```typescript
import { 
  createFIFOMailbox,
  createPriorityMailbox,
  createParallelMailbox,
  createBatchingMailbox,
} from '@actor-framework/mailbox';

// FIFO (default)
const fifo = createFIFOMailbox(handler);

// Priority
const priority = createPriorityMailbox(handler);
priority.enqueue({ type: 'urgent', priority: 10 });

// Parallel
const parallel = createParallelMailbox(handler, { maxConcurrency: 10 });

// Batching
const batching = createBatchingMailbox(batchHandler, { 
  batchSize: 10, 
  batchTimeout: 100 
});
```

## Transport Types

```typescript
import { 
  createLocalTransport,
  createAsyncLocalTransport,
  createMainWorkerTransport,
  createSharedMemoryTransport,
} from '@actor-framework/transport';

// Local (direct calls)
const local = createLocalTransport();

// Async local (queued)
const async = createAsyncLocalTransport();

// Worker
const worker = new Worker('./worker.js');
const workerTransport = createMainWorkerTransport(worker);

// Shared memory (ring buffers)
const shared = createSharedMemoryTransport(1); // 1ms poll
```

## Lifecycle

```typescript
import { createLifecycleComponent } from '@actor-framework/patterns';

const component = createLifecycleComponent({
  onInit: async () => { /* ... */ },
  onStart: async () => { /* ... */ },
  onStop: async () => { /* ... */ },
  onShutdown: async () => { /* ... */ },
});

await component.init();
await component.start();
await component.stop();
await component.shutdown();
```

## Common Patterns

### Application Root

```typescript
async function main() {
  const config = await parseStandardConfig();
  const transport = createLocalTransport();
  await transport.start();
  
  const supervisor = createSupervisor(rootURN, 'restart');
  
  // Initialize components...
  
  process.on('SIGINT', async () => {
    await supervisor.shutdownAll();
    await transport.stop();
    process.exit(0);
  });
}
```

### Logger Component

```typescript
interface LogMsg { type: 'log'; level: string; message: string; }

const logger = createHandlerComponent<LogMsg>(urn, (msg) => {
  console.log(`[${msg.level}] ${msg.message}`);
});

// Give to other components as capability
const loggerCap = createCapability(loggerURN, loggerChannel);
```

### Error Handling

```typescript
// Always use Result, never throw
const result = await operation();

if (!result.ok) {
  logger.send({ 
    type: 'error', 
    error: result.error.message 
  });
  return;
}

// Use the value
processData(result.value);
```

## Key Principles

1. **Pure Message Passing**: No direct calls, only messages
2. **No Global State**: Everything injected via capabilities
3. **Immutable by Default**: Never mutate, always create new
4. **Result Types**: No exceptions in normal flow
5. **Capability Security**: Access only through references
6. **Type Safety**: Leverage TypeScript for guarantees

## Package Reference

- `@actor-framework/core` - Core types, channels, capabilities
- `@actor-framework/mailbox` - Queue implementations
- `@actor-framework/patterns` - Request-reply, pub-sub, supervision
- `@actor-framework/transport` - Communication layers
- `@actor-framework/config` - Configuration parsing

## Documentation Files

- `README.md` - Architecture and philosophy
- `API.md` - Complete API reference
- `GETTING_STARTED.md` - Step-by-step tutorial
- `IMPLEMENTATION_SUMMARY.md` - Implementation details

## Run Examples

```bash
cd packages/example

bun run dev              # Basic counter
bun run dev:protocol     # ATM state machine  
bun run dev:pubsub       # Event bus
```
