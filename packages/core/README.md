# @servicejs/core

Pure core of ServiceJS - message passing, capabilities, reducers, components.

## Overview

`@servicejs/core` provides the fundamental building blocks for ServiceJS applications:

- **URN**: Unique identifiers for components (debugging/tracing)
- **Message**: Immutable communication units with type discrimination
- **Capability**: Unforgeable references for secure interaction
- **Reducer**: Pure functions for stateful behavior
- **Effect**: Side effect descriptions returned by reducers
- **Component**: Stateful entities combining URN, state, reducer, and capability

## Installation

```bash
npm install @servicejs/core
# or
bun add @servicejs/core
```

## Quick Start

```typescript
import { createComponent, createURN, stay, emitTo, createMessage } from '@servicejs/core';

// Define state and messages
type CounterState = { count: number };
type CounterMsg = { type: 'increment'; amount: number } | { type: 'reset' };

// Create a reducer
const counterReducer = (state: CounterState, msg: CounterMsg) => {
  if (msg.type === 'increment') {
    return stay({ count: state.count + msg.amount }, counterReducer);
  }
  if (msg.type === 'reset') {
    return stay({ count: 0 }, counterReducer);
  }
  return stay(state, counterReducer);
};

// Create a component
const { component, capability } = createComponent(
  createURN('app', 'counter-1'),
  { count: 0 },
  counterReducer
);

// Send messages
capability.send({ type: 'increment', amount: 5 });
console.log(component.getState().count); // 5

capability.send({ type: 'reset' });
console.log(component.getState().count); // 0
```

## Core Concepts

### URN (Uniform Resource Name)

URNs provide unique identifiers for components. They are used **only** for debugging and tracing, not for component lookup.

```typescript
import { createURN, parseURN, validateURN } from '@servicejs/core';

// Create URN
const urn = createURN('app', 'counter-123');
console.log(urn.toString()); // 'urn:app:counter-123'

// Safe creation with validation
const result = safeCreateURN('app', 'my-component');
if (result.isOk()) {
  console.log('Valid URN:', result.value);
}

// Parse URN string
const parsed = parseURN('urn:app:counter-123');
```

### Message

Messages are immutable communication units with type discrimination.

```typescript
import { createMessage, isMessageType, matchMessage, type MessageOf } from '@servicejs/core';

// Define message types
type UserMsg =
  | MessageOf<'login', { username: string }>
  | MessageOf<'logout', {}>
  | MessageOf<'update', { field: string; value: string }>;

// Create messages
const loginMsg = createMessage('login', { username: 'alice' });

// Type guards
if (isMessageType(loginMsg, 'login')) {
  console.log(loginMsg.username); // Type-safe!
}

// Pattern matching
const result = matchMessage(loginMsg, {
  login: (msg) => `User ${msg.username} logged in`,
  logout: () => 'User logged out',
  update: (msg) => `Updated ${msg.field}`,
});
```

### Capability

Capabilities are unforgeable references that mediate access to components.

```typescript
import { createCapability, mapCapability, filterCapability } from '@servicejs/core';

// Create capability
const logCap = createCapability<LogMessage>((msg) => {
  console.log(msg.text);
});

// Send messages (fire-and-forget)
logCap.send({ type: 'log', text: 'Hello!' });

// Transform messages
const upperCaseCap = mapCapability(logCap, (msg) => ({
  ...msg,
  text: msg.text.toUpperCase(),
}));

// Filter messages
const errorCap = filterCapability(logCap, (msg) => msg.level === 'error');
```

### Reducer

Reducers are pure functions that process messages and update state.

```typescript
import { stay, become, type Reducer } from '@servicejs/core';

// Basic reducer
const counterReducer: Reducer<CounterState, CounterMsg> = (state, msg) => {
  if (msg.type === 'increment') {
    return stay({ count: state.count + msg.amount }, counterReducer);
  }
  return stay(state, counterReducer);
};

// State machine with session types
const connectingReducer: Reducer<State, Msg> = (state, msg) => {
  if (msg.type === 'connected') {
    // Transition to different reducer
    return become({ status: 'connected' }, connectedReducer);
  }
  return stay(state, connectingReducer);
};
```

### Effect

Effects represent side effects that reducers want to perform.

```typescript
import { emitTo, batch, none } from '@servicejs/core';

const reducer: Reducer<State, Msg> = (state, msg) => {
  if (msg.type === 'save') {
    // Return effects to be executed
    return stay(state, reducer, [
      emitTo(loggerCap, { type: 'log', text: 'Saving...' }),
      emitTo(dbCap, { type: 'save', data: state.data }),
    ]);
  }

  // No effects
  return stay(state, reducer, []);
};

// Batch multiple effects
const effects = batch([
  emitTo(cap1, msg1),
  emitTo(cap2, msg2),
  emitTo(cap3, msg3),
]);
```

### Component

Components tie together URN, state, reducer, and capability.

```typescript
import { createComponent } from '@servicejs/core';

const { component, capability } = createComponent(
  createURN('app', 'my-component'),
  initialState,
  reducer
);

// Send messages via capability
capability.send({ type: 'action' });

// Inspect state (for debugging/testing)
console.log(component.getState());

// Get URN (for debugging)
console.log(component.urn.toString());
```

## API Reference

### URN

- `createURN(namespace: string, id: string): URN`
- `safeCreateURN(namespace: string, id: string): Result<URN, URNError>`
- `parseURN(urnString: string): Result<URN, URNError>`
- `validateURN(namespace: string, id: string): Result<void, URNError>`
- `equalURN(a: URN, b: URN): boolean`

### Message

- `createMessage<T, D>(type: T, data?: D): MessageOf<T, D>`
- `isMessageType<M, T>(message: M, type: T): boolean`
- `matchMessage<M, R>(message: M, handlers: Handlers): R`

### Capability

- `createCapability<TMsg>(send: (message: TMsg) => void): Capability<TMsg>`
- `mapCapability<TMsg, UMsg>(capability, transform): Capability<UMsg>`
- `filterCapability<TMsg>(capability, predicate): Capability<TMsg>`
- `composeCapabilities<TMsg>(capabilities): Capability<TMsg>`
- `interceptCapability<TMsg>(capability, interceptor): Capability<TMsg>`
- `nullCapability<TMsg>(): Capability<TMsg>`

### Reducer

- `stay<TState, TMsg>(state, reducer, effects?): ReducerResult<TState, TMsg>`
- `become<TState, TMsg>(state, reducer, effects?): ReducerResult<TState, TMsg>`
- `initialResult<TState, TMsg>(state, reducer, effects?): ReducerResult<TState, TMsg>`

### Effect

- `emitTo<TMsg>(capability, message): EmitEffect`
- `batch(effects): BatchEffect`
- `none(): NoneEffect`
- `executeEffect(effect): void`
- `executeEffects(effects): void`

### Component

- `createComponent<TState, TMsg>(urn, initialState, initialReducer): { component, capability }`

## Examples

See the [examples directory](./examples) for complete working examples:

- [URN Examples](./examples/urn.ts) - Creating and parsing URNs
- [Message Examples](./examples/message.ts) - Message types and pattern matching
- [Capability Examples](./examples/capability.ts) - Capability composition
- [Reducer Examples](./examples/reducer.ts) - State machines and session types
- [Effect Examples](./examples/effect.ts) - Side effects in reducers
- [Component Examples](./examples/component.ts) - Complete component examples

## Philosophy

The core package embodies these principles:

1. **Pure Message Passing**: Objects communicate ONLY via messages
2. **Capability-Based Security**: Components interact ONLY via explicit capabilities
3. **Immutability**: All state updates create new objects
4. **Type Safety**: Full TypeScript support with type inference
5. **No Magic**: All behavior is explicit and traceable

## License

MIT
