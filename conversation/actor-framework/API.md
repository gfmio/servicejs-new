# API Documentation

## @actor-framework/core

### Result Types

#### `Result<T, E>`
```typescript
type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };
```

Rust-style result type for error handling without exceptions.

**Constructors:**
- `Ok<T>(value: T): Result<T, never>` - Create a successful result
- `Err<E>(error: E): Result<never, E>` - Create an error result

**Type Guards:**
- `isOk<T, E>(result: Result<T, E>): boolean`
- `isErr<T, E>(result: Result<T, E>): boolean`

**Utilities:**
- `unwrap<T, E>(result: Result<T, E>): T` - Unwrap or throw
- `unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T` - Unwrap or return default
- `map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E>` - Map success value
- `mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F>` - Map error value
- `andThen<T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E>` - Chain operations

### URN System

#### `URN`
```typescript
type URN = string & { readonly __brand: 'URN' };
```

Uniform Resource Name for component identification.

**Functions:**
- `createURN(namespace: string, id: string): URN` - Create a URN
- `parseURN(urn: URN): { namespace: string; id: string } | null` - Parse a URN
- `isValidURN(urn: string): urn is URN` - Validate URN format
- `randomURN(namespace: string): URN` - Generate random URN

### Messages and Channels

#### `Message`
```typescript
interface Message {
  readonly type: string;
}
```

Base interface for all messages.

#### `Channel<T>`
```typescript
interface Channel<T extends Message> {
  send(message: T): void;
  readonly targetURN: URN;
}
```

Channel for sending messages.

#### `CloseableChannel<T>`
```typescript
interface CloseableChannel<T extends Message> extends Channel<T> {
  close(): void;
  readonly isClosed: boolean;
}
```

Channel that can be closed.

### Reducers

#### `Reducer<S, M>`
```typescript
type Reducer<S extends ComponentState, M extends Message> = (
  state: S,
  message: M
) => Result<ReducerResult<S>, Error>;
```

Pure function that processes messages and returns new state + effects.

#### `ReducerResult<S>`
```typescript
interface ReducerResult<S extends ComponentState> {
  readonly state: S;
  readonly effects: readonly Effect[];
}
```

Result of processing a message.

#### `StatefulReducer<M>`
```typescript
interface StatefulReducer<M extends Message> {
  reduce(message: M): Result<StatefulReducer<M>, Error>;
  readonly state: ComponentState;
}
```

Reducer that manages its own state and can replace itself.

**Functions:**
- `createStatefulReducer<S, M>(initialState: S, reducer: Reducer<S, M>): StatefulReducer<M>`

### Capabilities

#### `Capability<TInput, TOutput>`
```typescript
interface Capability<TInput extends Message, TOutput extends Message = TInput> {
  send(message: TInput): void;
  readonly targetURN: URN;
  evolve<TNew extends Message>(newCapability: Capability<TNew>): Capability<TNew>;
}
```

Capability object for mediated access to components.

**Factory Functions:**
- `createCapability<T>(targetURN: URN, channel: Channel<T>): Capability<T>`
- `createTransformingCapability<TIn, TOut>(targetURN: URN, channel: Channel<TOut>, transform: (msg: TIn) => TOut): Capability<TIn, TOut>`
- `createValidatingCapability<T>(targetURN: URN, channel: Channel<T>, validate: (msg: T) => boolean): Capability<T>`
- `createRateLimitedCapability<T>(targetURN: URN, channel: Channel<T>, maxPerSecond: number): Capability<T>`
- `createLoggingCapability<T>(targetURN: URN, channel: Channel<T>, logger?: (msg: T) => void): Capability<T>`
- `createRevocableCapability<T>(targetURN: URN, channel: Channel<T>): RevocableCapability<T>`

### Components

#### `Component<M>`
```typescript
interface Component<M extends Message = Message> {
  readonly urn: URN;
  send(message: M): void;
  readonly state: ComponentState;
  shutdown(): Promise<void>;
}
```

Active component in the system.

**Factory Functions:**
- `createReducerComponent<M>(urn: URN, reducer: StatefulReducer<M>): Component<M>`
- `createHandlerComponent<M>(urn: URN, handler: MessageHandler<M>): Component<M>`

#### `ComponentBuilder<M>`
Fluent API for building components:

```typescript
const component = new ComponentBuilder()
  .urn(myURN)
  .reducer(myReducer)
  .capability('database', dbCapability)
  .config('maxRetries', 3)
  .build();
```

### Protocol Types

#### `Protocol<S, T>`
```typescript
interface Protocol<S extends ComponentState, TAccepted extends Message> {
  readonly state: ProtocolState<TAccepted>;
  handle(state: S, message: Message): Result<ReducerResult<S> & { nextProtocol: Protocol<S, Message> }, Error>;
}
```

Session type / protocol state machine.

#### `ProtocolBuilder<S>`
Builder for complex state machines:

```typescript
const protocol = new ProtocolBuilder<State>()
  .state('idle', (msg): msg is IdleMsg => msg.type === 'idle')
  .state('active', (msg): msg is ActiveMsg => msg.type === 'active')
  .on('idle', 'start', handleStart, 'active')
  .on('active', 'stop', handleStop, 'idle')
  .buildProtocol('idle');
```

## @actor-framework/mailbox

### Mailbox Types

#### `Mailbox<M>`
```typescript
interface Mailbox<M extends Message> {
  enqueue(message: M): void;
  start(): void;
  stop(): Promise<void>;
  readonly isRunning: boolean;
  readonly queueSize: number;
}
```

### Implementations

#### FIFOMailbox
Sequential message processing (FIFO order).

```typescript
const mailbox = createFIFOMailbox(handler, {
  maxQueueSize: 1000,
  overflowStrategy: 'drop-oldest',
});
```

#### PriorityMailbox
Priority-based message processing.

```typescript
const mailbox = createPriorityMailbox(handler, {
  maxQueueSize: 1000,
});

// Messages with priority field are processed first
mailbox.enqueue({ type: 'urgent', priority: 10 });
```

#### ParallelMailbox
Concurrent message processing for stateless components.

```typescript
const mailbox = createParallelMailbox(handler, {
  maxConcurrency: 10,
});
```

#### BatchingMailbox
Batch message processing for efficiency.

```typescript
const mailbox = createBatchingMailbox(batchHandler, {
  batchSize: 10,
  batchTimeout: 100, // ms
});
```

## @actor-framework/patterns

### Request-Reply

#### `Request<TReq, TRes>`
```typescript
interface Request<TRequest, TResponse> extends Message {
  type: 'request';
  data: TRequest;
  replyTo: Channel<Response<TResponse>>;
}
```

#### `RequestReply<TReq, TRes>`
Helper for request-reply pattern:

```typescript
const client = createRequestReply(channel);

// Wait for response
const result = await client.ask(data, 5000); // 5s timeout

// Fire and forget
client.tell(data);
```

#### Utilities
- `createRequest<TReq, TRes>(data: TReq, replyTo: Channel<Response<TRes>>): Request<TReq, TRes>`
- `createSuccessResponse<T>(value: T): Response<T>`
- `createErrorResponse<T>(error: Error): Response<T>`
- `handleRequest<TReq, TRes>(request: Request<TReq, TRes>, handler: (data: TReq) => Promise<Result<TRes, Error>>): void`

### Pub-Sub

#### `PubSubBroker<T>`
Topic-based message distribution:

```typescript
const broker = createPubSubBroker<EventType>();

// Subscribe
const subscription = broker.subscribe('topic', channel);

// Publish
broker.publish('topic', data);

// Unsubscribe
subscription.unsubscribe();

// Stats
broker.subscriberCount('topic');
broker.topics();
```

#### Capabilities
- `createPublisher<T>(broker: PubSubBroker<T>): Publisher<T>`
- `createSubscriber<T>(broker: PubSubBroker<T>): Subscriber<T>`
- `createScopedPublisher<T>(broker: PubSubBroker<T>, allowedTopics: Topic[]): Publisher<T>`
- `createScopedSubscriber<T>(broker: PubSubBroker<T>, allowedTopics: Topic[]): Subscriber<T>`

### Supervision

#### `Supervisor`
Error handling and recovery:

```typescript
const supervisor = createSupervisor(
  urn,
  'restart',  // Strategy: 'restart' | 'resume' | 'stop' | 'escalate'
  3,          // Max retries
  1000,       // Retry delay (ms)
  parentSupervisor // Optional parent
);

supervisor.registerChild(component);
supervisor.handleError(errorNotification);
supervisor.shutdownAll();
```

#### Strategies
- `oneForOne()` - Restart only failed component
- `oneForAll()` - Restart all components
- `restForOne()` - Restart failed and subsequent components

### Lifecycle

#### `LifecycleManager`
Standard component lifecycle:

```typescript
const manager = createLifecycleManager();

manager.on('initialized', async () => {
  // Initialization logic
});

await manager.handleMessage({ type: 'init' });
await manager.handleMessage({ type: 'start' });
await manager.handleMessage({ type: 'stop' });
await manager.handleMessage({ type: 'shutdown' });
```

#### `LifecycleComponent`
```typescript
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

## @actor-framework/transport

### Transport Types

#### `Transport<M>`
```typescript
interface Transport<M extends Message> {
  createChannel(targetURN: URN): Channel<M>;
  registerHandler(urn: URN, handler: (message: M) => void): void;
  unregisterHandler(urn: URN): void;
  start(): Promise<void>;
  stop(): Promise<void>;
}
```

### Implementations

#### LocalTransport
Direct in-memory communication:

```typescript
const transport = createLocalTransport();
await transport.start();

transport.registerHandler(urn, handler);
const channel = transport.createChannel(targetURN);
channel.send(message);
```

#### AsyncLocalTransport
Queued async delivery:

```typescript
const transport = createAsyncLocalTransport();
```

#### WorkerTransport
Web Worker / worker thread communication:

```typescript
// Main thread
const worker = new Worker('./worker.js');
const transport = createMainWorkerTransport(worker);

// Worker thread
const transport = createWorkerSideTransport();
```

#### SharedMemoryTransport
Lock-free ring buffer communication:

```typescript
const transport = createSharedMemoryTransport(1); // 1ms poll interval
```

## @actor-framework/config

### ConfigParser

#### Configuration Sources
1. Default values
2. Config files (JSON)
3. Environment variables
4. Command-line arguments (highest priority)

#### Usage
```typescript
const parser = createConfigParser();

// Parse environment with prefix
parser.parseEnv('APP_');

// Parse command-line args
parser.parseArgs();

// Load from file
await parser.parseFile('./config.json');

// Load from object
parser.loadObject({ database: { host: 'localhost' } });

// Get values
const host = parser.get<string>('database.host');
const port = parser.getNumber('database.port', 5432);
const enabled = parser.getBoolean('features.newUI', false);

// Required values
const apiKey = parser.getRequired<string>('api.key');
if (!apiKey.ok) {
  console.error(apiKey.error);
}

// Check existence
if (parser.has('optional.feature')) {
  // ...
}

// Get all as object
const config = parser.toObject();
```

#### Standard Config
```typescript
const result = await parseStandardConfig(
  './config.json',  // Optional config file
  'APP_'            // Optional env prefix
);

if (result.ok) {
  const config = result.value;
  // Use config
}
```

## Type Safety

### Message Type Safety

The framework enforces type safety at compile time:

```typescript
// Define your message types
interface StartMessage extends Message {
  type: 'start';
  data: string;
}

interface StopMessage extends Message {
  type: 'stop';
}

type MyMessages = StartMessage | StopMessage;

// Channels are typed
const channel: Channel<MyMessages> = /* ... */;

// TypeScript ensures only valid messages can be sent
channel.send({ type: 'start', data: 'hello' }); // ✓
channel.send({ type: 'invalid' }); // ✗ Compile error
```

### Protocol Type Safety

Protocol builders enforce state-based type safety:

```typescript
builder
  .state('idle', (msg): msg is StartMessage => msg.type === 'start')
  .state('active', (msg): msg is StopMessage => msg.type === 'stop')
  .on('idle', 'start', handleStart, 'active')
  .on('idle', 'stop', handleStop, 'idle'); // ✗ Error: stop not accepted in idle state
```

### Capability Variance

Capabilities support proper variance:

```typescript
// Input is contravariant (can accept more specific messages)
const capability: Capability<Message> = /* ... */;

// Output is covariant (can produce more general messages)
const channel: Channel<SpecificMessage> = /* ... */;
```
