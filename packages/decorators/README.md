# @servicejs/decorators

> Ergonomic decorator and builder APIs for ServiceJS components

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue)](https://www.typescriptlang.org/)

## Overview

`@servicejs/decorators` provides two alternative APIs for creating ServiceJS components with improved developer experience:

1. **Decorator API** - Class-based components with TypeScript decorators
2. **Builder API** - Fluent interface for component construction

Both APIs build on top of the functional core API from `@servicejs/core`, providing a more familiar and ergonomic way to define components while maintaining the same capability-based security and message-passing architecture.

## Installation

```bash
bun add @servicejs/decorators
# or
npm install @servicejs/decorators
# or
yarn add @servicejs/decorators
```

### TypeScript Configuration

To use decorators, you need to enable experimental decorators in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Quick Start

### Decorator API

```typescript
import 'reflect-metadata';
import { Component, Handler, OnInit, createComponentFromClass } from '@servicejs/decorators';

interface CounterState {
  count: number;
}

interface CounterMessage {
  type: 'increment' | 'decrement';
  amount?: number;
}

@Component({ urn: 'urn:app:counter' })
class CounterComponent {
  @OnInit
  initialize() {
    console.log('Counter initialized');
  }

  @Handler('increment')
  handleIncrement(state: CounterState, message: CounterMessage): CounterState {
    return { count: state.count + (message.amount || 1) };
  }

  @Handler('decrement')
  handleDecrement(state: CounterState, message: CounterMessage): CounterState {
    return { count: state.count - (message.amount || 1) };
  }
}

const result = createComponentFromClass<CounterState, CounterMessage>(
  CounterComponent,
  { count: 0 }
);

if (result.isOk()) {
  const { component, capability } = result.value;

  capability.send({ type: 'increment', amount: 5 });
  console.log(component.getState().count); // 5
}
```

### Builder API

```typescript
import { stay } from '@servicejs/core';
import { createComponentBuilder } from '@servicejs/decorators';

const { component, capability } = createComponentBuilder<CounterState, CounterMessage>()
  .withURN('urn:app:counter')
  .withState({ count: 0 })
  .withReducer((state, message) => {
    if (message.type === 'increment') {
      return stay({ count: state.count + (message.amount || 1) });
    }
    if (message.type === 'decrement') {
      return stay({ count: state.count - (message.amount || 1) });
    }
    return stay(state);
  })
  .withLifecycle({
    onInit: () => console.log('Counter initialized')
  })
  .build();

capability.send({ type: 'increment', amount: 5 });
console.log(component.getState().count); // 5
```

## API Reference

### Decorators

#### `@Component(config?)`

Class decorator that marks a class as a ServiceJS component.

**Parameters:**
- `config.urn?: URN` - Component URN (defaults to `urn:component:<classname>`)
- `config.state?: () => TState` - State factory function

**Example:**
```typescript
@Component({
  urn: 'urn:app:counter',
  state: () => ({ count: 0 })
})
class CounterComponent {
  // ...
}
```

#### `@Handler(messageType?)`

Method decorator that marks a method as a message handler.

**Parameters:**
- `messageType?: string` - Message type to handle (if omitted, handles all messages)

**Method Signature:**
```typescript
handler(state: TState, message: TMsg): TState | ReducerResult<TState, TMsg>
```

**Example:**
```typescript
@Handler('increment')
handleIncrement(state: CounterState, message: CounterMessage): CounterState {
  return { count: state.count + message.amount };
}

@Handler() // Handles all message types
handleAny(state: State, message: Message): State {
  console.log('Received:', message);
  return state;
}
```

#### `@Inject(capabilityName)`

Parameter decorator for constructor dependency injection.

**Parameters:**
- `capabilityName: string` - Name of the capability to inject

**Example:**
```typescript
@Component({ urn: 'urn:app:user-service' })
class UserServiceComponent {
  constructor(
    @Inject('logger') private logger: Capability<LogMessage>,
    @Inject('database') private db: Capability<DbMessage>
  ) {}

  @Handler('createUser')
  handleCreateUser(state: UserState, message: UserMessage): UserState {
    this.logger.send({ type: 'log', message: 'Creating user' });
    this.db.send({ type: 'insert', data: message.user });
    return state;
  }
}
```

#### `@OnInit`

Method decorator that marks a method to be called during component initialization.

**Example:**
```typescript
@OnInit
initialize() {
  console.log('Component initializing...');
  // Setup code here
}
```

#### `@OnShutdown`

Method decorator that marks a method to be called during component shutdown.

**Example:**
```typescript
@OnShutdown
cleanup() {
  console.log('Component shutting down...');
  // Cleanup code here
}
```

### Factory Function

#### `createComponentFromClass<TState, TMsg>(ClassConstructor, initialState, config?)`

Creates a ServiceJS component from a decorated class.

**Parameters:**
- `ClassConstructor: new (...args: any[]) => any` - Decorated class constructor
- `initialState: TState` - Initial component state
- `config?: ComponentFactoryConfig<TState>` - Configuration options
  - `config.capabilities?: Record<string, Capability<any>>` - Capabilities to inject
  - `config.initialState?: TState` - Override initial state

**Returns:** `Result<ComponentFactoryResult<TState, TMsg>, FactoryError>`
- `result.value.component` - The ServiceJS component
- `result.value.capability` - The component's capability
- `result.value.instance` - The class instance

**Example:**
```typescript
const result = createComponentFromClass<UserState, UserMessage>(
  UserServiceComponent,
  { users: [] },
  {
    capabilities: {
      logger: loggerCapability,
      database: dbCapability
    }
  }
);

if (result.isOk()) {
  const { component, capability, instance } = result.value;
  // Use component and capability
}
```

### Builder API

#### `ComponentBuilder<TState, TMsg>`

Fluent interface for building ServiceJS components.

**Methods:**

##### `withURN(urn: URN): this`

Set the component URN (required).

##### `withState(state: TState): this`

Set the initial state (required).

##### `withReducer(reducer: Reducer<TState, TMsg>): this`

Set the reducer function (required).

##### `withMailbox(mailbox: Mailbox<TMsg>): this`

Set a custom mailbox (optional).

##### `withLifecycle(hooks: LifecycleHooks): this`

Set lifecycle hooks (optional).

**Hooks:**
- `hooks.onInit?: () => void` - Called during build
- `hooks.onShutdown?: () => void` - Called during shutdown

##### `build(): { component, capability }`

Build the component (validates required fields).

**Example:**
```typescript
const { component, capability } = new ComponentBuilder<State, Message>()
  .withURN('urn:app:example')
  .withState({ count: 0 })
  .withReducer((state, message) => stay(state))
  .withLifecycle({
    onInit: () => console.log('Starting'),
    onShutdown: () => console.log('Stopping')
  })
  .build();
```

#### `createComponentBuilder<TState, TMsg>()`

Factory function that creates a new `ComponentBuilder` instance.

```typescript
const builder = createComponentBuilder<State, Message>();
```

## Usage Examples

### Basic Counter

```typescript
import 'reflect-metadata';
import { Component, Handler, createComponentFromClass } from '@servicejs/decorators';

interface CounterState {
  count: number;
}

interface CounterMessage {
  type: 'increment' | 'decrement' | 'reset';
  amount?: number;
}

@Component({ urn: 'urn:example:counter' })
class CounterComponent {
  @Handler('increment')
  handleIncrement(state: CounterState, message: CounterMessage): CounterState {
    return { count: state.count + (message.amount || 1) };
  }

  @Handler('decrement')
  handleDecrement(state: CounterState, message: CounterMessage): CounterState {
    return { count: state.count - (message.amount || 1) };
  }

  @Handler('reset')
  handleReset(): CounterState {
    return { count: 0 };
  }
}

const result = createComponentFromClass<CounterState, CounterMessage>(
  CounterComponent,
  { count: 0 }
);

if (result.isOk()) {
  const { component, capability } = result.value;

  capability.send({ type: 'increment', amount: 5 });
  capability.send({ type: 'decrement', amount: 2 });

  console.log(component.getState().count); // 3
}
```

### Lifecycle Hooks

```typescript
@Component({ urn: 'urn:example:service' })
class ServiceComponent {
  @OnInit
  initialize() {
    console.log('Service starting...');
    // Load configuration, connect to databases, etc.
  }

  @Handler('request')
  handleRequest(state: State, message: RequestMessage): State {
    // Process request
    return state;
  }

  @OnShutdown
  cleanup() {
    console.log('Service stopping...');
    // Close connections, save state, etc.
  }
}

const result = createComponentFromClass(ServiceComponent, initialState);

if (result.isOk()) {
  const { component, instance } = result.value;

  // Use component...

  // Later, when shutting down:
  if (instance.__onShutdown) {
    instance.__onShutdown();
  }
}
```

### Dependency Injection

```typescript
import { createCapability } from '@servicejs/core';

// Create capabilities to inject
const loggerCapability = createCapability<LogMessage>((msg) => {
  console.log(`[${msg.level}] ${msg.message}`);
});

const dbCapability = createCapability<DbMessage>((msg) => {
  console.log(`[DB] ${msg.type}: ${JSON.stringify(msg.data)}`);
});

@Component({ urn: 'urn:example:user-service' })
class UserServiceComponent {
  constructor(
    @Inject('logger') private logger: typeof loggerCapability,
    @Inject('database') private db: typeof dbCapability
  ) {}

  @OnInit
  initialize() {
    this.logger.send({ type: 'log', level: 'info', message: 'UserService initialized' });
  }

  @Handler('createUser')
  handleCreateUser(state: UserState, message: UserMessage): UserState {
    this.logger.send({
      type: 'log',
      level: 'info',
      message: `Creating user: ${message.username}`
    });

    this.db.send({
      type: 'insert',
      data: { username: message.username }
    });

    return {
      users: [...state.users, message.username]
    };
  }
}

const result = createComponentFromClass<UserState, UserMessage>(
  UserServiceComponent,
  { users: [] },
  {
    capabilities: {
      logger: loggerCapability,
      database: dbCapability
    }
  }
);
```

### State Factory

```typescript
@Component({
  urn: 'urn:example:config',
  state: () => ({
    version: '1.0.0',
    timestamp: Date.now(),
    settings: { debug: true }
  })
})
class ConfigComponent {
  @Handler('update')
  handleUpdate(state: ConfigState, message: ConfigMessage): ConfigState {
    return {
      ...state,
      settings: {
        ...state.settings,
        [message.key]: message.value
      }
    };
  }
}

// State factory is called automatically, initial state parameter is overridden
const result = createComponentFromClass<ConfigState, ConfigMessage>(
  ConfigComponent,
  { version: '0.0.0', timestamp: 0, settings: {} }
);

if (result.isOk()) {
  const { component } = result.value;
  console.log(component.getState().version); // '1.0.0' (from factory)
}
```

### Generic Message Handler

```typescript
@Component({ urn: 'urn:example:logger' })
class LoggerComponent {
  @Handler() // No type = handles all messages
  handleAny(state: LoggerState, message: LogMessage): LoggerState {
    const entry = `[${message.type}] ${message.message}`;
    return {
      logs: [...state.logs, entry]
    };
  }
}
```

### Builder with Lifecycle

```typescript
import { stay } from '@servicejs/core';
import { createComponentBuilder } from '@servicejs/decorators';

const { component, capability } = createComponentBuilder<State, Message>()
  .withURN('urn:app:service')
  .withState(initialState)
  .withReducer((state, message) => {
    // Handle messages
    return stay(state);
  })
  .withLifecycle({
    onInit: () => {
      console.log('Service starting');
      // Setup code
    },
    onShutdown: () => {
      console.log('Service stopping');
      // Cleanup code
    }
  })
  .build();
```

## Error Handling

The factory function returns a `Result` type for explicit error handling:

```typescript
import { isOk, isErr } from '@servicejs/result';

const result = createComponentFromClass(MyComponent, initialState);

if (isErr(result)) {
  switch (result.error.type) {
    case 'NO_COMPONENT_DECORATOR':
      console.error(`Class ${result.error.className} missing @Component decorator`);
      break;
    case 'MISSING_INJECTION':
      console.error(`Missing capability: ${result.error.capabilityName}`);
      break;
    case 'HANDLER_ERROR':
      console.error(`Error in ${result.error.methodName}:`, result.error.error);
      break;
  }
  return;
}

// Safe to use
const { component, capability } = result.value;
```

The builder API throws errors for missing required fields:

```typescript
try {
  const { component, capability } = createComponentBuilder()
    // .withURN(...) // Missing!
    .withState(initialState)
    .withReducer(reducer)
    .build();
} catch (error) {
  console.error(error.message); // "ComponentBuilder: URN is required"
}
```

## Best Practices

### 1. Choose the Right API

**Use Decorators when:**
- You prefer object-oriented, class-based code
- You need dependency injection
- You want co-located handler logic
- You're familiar with Angular, NestJS, or similar frameworks

**Use Builder when:**
- You prefer functional programming style
- You want explicit, fluent API
- You don't need dependency injection
- You want runtime flexibility

**Use Core API when:**
- You need maximum control
- You want minimal abstractions
- You're building low-level infrastructure
- Performance is critical

### 2. Handler Return Values

Handlers can return either:
- **New state object** - Implicitly wrapped in `stay()`
- **Reducer result** - Using `stay()` or `become()` from `@servicejs/core`

```typescript
// Implicit stay
@Handler('increment')
handleIncrement(state: State): State {
  return { count: state.count + 1 }; // Wrapped in stay()
}

// Explicit transition with effects
@Handler('increment')
handleIncrement(state: State, message: Message): ReducerResult<State, Message> {
  return stay(
    { count: state.count + 1 },
    this.reducer,
    [emitTo(message.replyTo, ok(state.count + 1))]
  );
}
```

### 3. Dependency Injection

Always validate injected capabilities and handle missing dependencies:

```typescript
const result = createComponentFromClass(
  MyComponent,
  initialState,
  { capabilities: { logger, database } }
);

if (isErr(result) && result.error.type === 'MISSING_INJECTION') {
  console.error(`Required capability not provided: ${result.error.capabilityName}`);
  // Handle error appropriately
}
```

### 4. Lifecycle Hooks

Lifecycle hooks should be idempotent and error-safe:

```typescript
@OnInit
initialize() {
  try {
    // Setup code that might fail
    this.loadConfig();
  } catch (error) {
    console.error('Failed to initialize:', error);
    // Handle gracefully
  }
}

@OnShutdown
cleanup() {
  try {
    // Cleanup that might fail
    this.closeConnections();
  } catch (error) {
    console.error('Failed to cleanup:', error);
    // Don't throw - we're shutting down anyway
  }
}
```

### 5. TypeScript Configuration

Always enable strict mode for maximum type safety:

```json
{
  "compilerOptions": {
    "strict": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

## Comparison with Core API

| Feature | Decorators | Builder | Core API |
|---------|-----------|---------|----------|
| **Syntax** | Class-based with decorators | Fluent method chaining | Functional |
| **Learning Curve** | Medium (familiar to OOP devs) | Low (self-documenting) | Low (simple) |
| **Dependencies** | reflect-metadata | None | None |
| **Message Routing** | Automatic (by type) | Manual (in reducer) | Manual (in reducer) |
| **Dependency Injection** | Yes (@Inject) | No | No |
| **Lifecycle Hooks** | Yes (@OnInit, @OnShutdown) | Yes (withLifecycle) | Manual |
| **TypeScript Setup** | Requires decorator config | Standard | Standard |
| **Runtime Overhead** | Minimal (metadata lookup) | None | None |
| **Co-location** | Handlers with class | Reducer with builder | Reducer separate |
| **Flexibility** | Medium | High | Highest |
| **Best For** | OOP-style apps | Quick prototypes | Libraries, frameworks |

## Examples

See the `examples/` directory for complete working examples:

- [`decorators.ts`](./examples/decorators.ts) - All decorator features
- [`builder.ts`](./examples/builder.ts) - Builder API examples

Run examples:
```bash
cd packages/decorators
bun run examples/decorators.ts
bun run examples/builder.ts
```

## TypeScript Support

This package is written in TypeScript and provides full type definitions. All APIs are fully typed with generics for state and message types.

```typescript
// Fully typed
const result = createComponentFromClass<CounterState, CounterMessage>(
  CounterComponent,
  { count: 0 }
);

// Type inference
const builder = createComponentBuilder<CounterState, CounterMessage>();
// state is inferred as CounterState
builder.withState({ count: 0 });
```

## Testing

Tests are written using Bun's test runner:

```bash
cd packages/decorators
bun test
```

## Contributing

Contributions are welcome! Please see the main ServiceJS repository for contribution guidelines.

## License

MIT © ServiceJS Contributors

## Related Packages

- [`@servicejs/core`](../core) - Core ServiceJS primitives
- [`@servicejs/result`](../result) - Result type for error handling
- [`@servicejs/lifecycle`](../lifecycle) - Lifecycle management
- [`@servicejs/mailbox`](../mailbox) - Message queuing
