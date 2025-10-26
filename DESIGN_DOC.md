# ServiceJS Design Document

**Version:** 0.1.0
**Status:** Milestones 0-3 Complete - HKT Foundation, Core Framework, Complete Mailboxes, Communication Patterns
**Last Updated:** 2025-10-26
**Authors:** gfmio, Claude

---

## Table of Contents

1. [Overview](#overview)
2. [Goals](#goals)
3. [Non-Goals](#non-goals)
4. [Background & Rationale](#background--rationale)
5. [High-Level Design](#high-level-design)
6. [Alternatives Considered](#alternatives-considered)
7. [Trade-offs](#trade-offs)
8. [Detailed Design](#detailed-design)
9. [Security Considerations](#security-considerations)
10. [Performance Considerations](#performance-considerations)
11. [Testing Strategy](#testing-strategy)
12. [Future Work](#future-work)

---

## Overview

ServiceJS is a capability-based, message-passing framework for TypeScript that enables building robust, testable, and scalable applications. It combines concepts from the actor model, capability-based security, hexagonal architecture, session types, and event sourcing into a unified, minimalist framework.

The framework consists of:

- **Higher-Kinded Types Foundation**: Type-level programming infrastructure (HKTFs, HKTOs) for compile-time protocol verification
- **Type Utilities**: Pure functions, Option, Result, Either - all with HKT definitions and runtime implementations
- **Tiny Pure Core**: Reducer functions, capabilities, messages, effects - built on HKT foundation
- **Standard Utilities**: Mailboxes, patterns (request/reply, pub/sub), lifecycle management, backpressure
- **Developer Experience Layer**: Class-based decorators, method-to-message conversion, fluent builders
- **Transport Layer**: Location-transparent communication (local, worker, network)
- **Observability**: Tracing, testing utilities, debugging tools

---

## Goals

### Primary Goals

1. **Structural Capability Security**
   - Components can ONLY interact via explicit capability references
   - No ambient authority
   - No global lookup mechanisms (except opt-in registries)
   - Capabilities are first-class, attenuatable, composable

2. **Pure Message Passing**
   - All communication via immutable messages
   - No direct method calls between components
   - No shared mutable state
   - Fire-and-forget by default

3. **Session Types / Protocol Evolution**
   - Reducers can replace themselves to implement protocol types
   - Type-safe state machines
   - Compile-time verification of valid message sequences

4. **Hexagonal Architecture**
   - Dependencies injected as capability objects
   - Capabilities act as both security boundaries and adapters
   - Clean separation between core logic and infrastructure

5. **Location Transparency**
   - Same programming model for local, worker, inter-process, and network communication
   - Transport details hidden behind uniform abstraction
   - Distributed-first mindset from the start

6. **Minimalist Core, Batteries Included**
   - Tiny core with zero runtime overhead
   - Comprehensive standard library built on top
   - Users choose their abstraction level

7. **Excellent Developer Experience**
   - Class-based syntax for familiarity
   - Method calls automatically become messages
   - Type-safe with full TypeScript support
   - Clear error messages and debugging tools

8. **Testability by Default**
   - Pure reducer functions trivial to test
   - Dependency injection built-in
   - Mock transport for integration tests
   - Deterministic test execution

### Secondary Goals

1. **Event Sourcing Support**: Components as event-sourced reducers
2. **Performance**: Zero-copy local communication, efficient distributed messaging
3. **Observability**: Tracing, metrics, message flow visualization
4. **Extensibility**: User-defined message types, custom transports, effect interpreters

---

## Non-Goals

1. **Framework Lock-in**: Users should be able to extract pure business logic
2. **Magic/Reflection**: No hidden behavior, everything explicit
3. **Global State Management**: No framework-level global state
4. **Specific Serialization Format**: Support multiple formats (JSON, Cap'n Proto, etc.)
5. **Built-in Database/ORM**: Too opinionated, leave to user choice
6. **Synchronous Request/Reply by Default**: Async patterns encouraged
7. **Mandatory Lifecycle Hooks**: No forced component lifecycle
8. **Runtime Schema Validation by Default**: Optional, not enforced

---

## Background & Rationale

### Why Pure Message Passing?

Traditional object-oriented programming encourages direct method calls and shared mutable state, leading to:

- **Tight coupling**: Objects become interdependent
- **Race conditions**: Concurrent access to shared state
- **Difficult testing**: Hard to isolate components
- **Non-determinism**: Hard to reason about behavior

Pure message passing eliminates these issues:

- **Loose coupling**: Components only know message types
- **No race conditions**: No shared mutable state
- **Easy testing**: Mock message sources/sinks
- **Determinism**: Message order determines behavior

### Why Capability-Based Security?

Traditional security models rely on ambient authority:

- **Confused deputy problem**: Code runs with excessive privileges
- **No principle of least privilege**: Hard to restrict access
- **Difficult auditing**: Hard to know what can access what

Capability-based security provides:

- **Structural enforcement**: Can't access without reference
- **Principle of least privilege**: Grant only needed capabilities
- **Easy auditing**: Trace capability flow through code
- **Composition**: Combine and restrict capabilities easily

### Why Session Types?

Traditional state machines require:

- **Manual state tracking**: Error-prone
- **Runtime validation**: Performance overhead
- **No compile-time guarantees**: Bugs slip through

Session types provide:

- **Compile-time verification**: Invalid sequences caught early
- **Self-documenting**: Protocol is in the type
- **Zero runtime overhead**: Types erased after compilation

### Why Immutability?

Mutable state causes:

- **Temporal coupling**: Order of operations matters
- **Defensive copying**: Performance overhead
- **Concurrency issues**: Race conditions, deadlocks

Immutability provides:

- **Time-travel debugging**: Replay state transitions
- **Easy caching**: Content-addressable by hash
- **Safe concurrency**: No locks needed
- **Event sourcing**: Natural fit for event logs

### Why Hexagonal Architecture?

Traditional layered architectures:

- **Core depends on infrastructure**: Hard to test
- **Tight coupling**: Hard to swap implementations

Hexagonal architecture provides:

- **Core independence**: Business logic pure
- **Easy testing**: Mock adapters
- **Flexibility**: Swap implementations easily

### Why Location Transparency?

Traditional distributed systems:

- **Different APIs**: Local vs remote code different
- **Brittle**: Hard to move components
- **Complex**: Network logic intertwined

Location transparency provides:

- **Uniform API**: Same code works everywhere
- **Flexible deployment**: Move components freely
- **Simplified reasoning**: Think locally, run distributed

---

## High-Level Design

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Developer Experience Layer                     │
│  @servicejs/decorators - Class-based components with decorators  │
│  @servicejs/builder    - Fluent API for component creation       │
│  @servicejs/di         - Dependency injection system       [✅]  │
└─────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────────────────────────────────────┐
│                      Standard Utilities Layer                     │
│  @servicejs/mailbox      - FIFO, priority, bounded mailboxes    │
│  @servicejs/patterns     - Request/reply, pub/sub, supervision  │
│  @servicejs/lifecycle    - Init, shutdown, resource management  │
│  @servicejs/backpressure - Async send, flow control, circuit    │
│  @servicejs/schema       - Runtime validation (Zod, Cap'n Proto)│
│  @servicejs/config       - Configuration management       [✅]  │
└─────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────────────────────────────────────┐
│                         Transport Layer                           │
│  @servicejs/transport - Local, worker, shared memory, network   │
└─────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────────────────────────────────────┐
│                      Runtime Capabilities Layer            [✅]  │
│  Platform Runtimes:                                              │
│    @servicejs/runtime-node          - Node.js runtime           │
│    @servicejs/runtime-deno          - Deno runtime              │
│    @servicejs/runtime-bun           - Bun runtime               │
│    @servicejs/runtime-browser       - Browser runtime           │
│    @servicejs/runtime-web-worker    - Web Worker runtime        │
│    @servicejs/runtime-shared-worker - Shared Worker runtime     │
│    @servicejs/runtime-service-worker - Service Worker runtime   │
│    @servicejs/runtime-cloudflare    - Cloudflare Workers        │
│  Capability Interfaces (for testing and mocking):                │
│    @servicejs/capability-env        - Environment variables     │
│    @servicejs/capability-time       - Time and timers           │
│    @servicejs/capability-lifecycle  - Shutdown coordination     │
│    @servicejs/capability-fs         - File system operations    │
│    @servicejs/capability-http       - HTTP client               │
│    @servicejs/capability-console    - Console logging           │
│    @servicejs/capability-streams    - Streams (stdin/out/err)   │
│    @servicejs/capability-crypto     - Cryptographic operations  │
└─────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────────────────────────────────────┐
│                            Pure Core                              │
│  @servicejs/core - URN, Message, Capability, Reducer, Component │
│                    (Built on HKT foundation)                     │
└─────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────────────────────────────────────┐
│                        Type Utilities                      [✅]  │
│  @servicejs/result       - Result<T, E> with HKT types          │
│  @servicejs/option       - Option<T> with HKT types             │
│  @servicejs/either       - Either<L, R> with HKT types          │
│  @servicejs/pure         - Pure functions (compose, pipe, ...)  │
│  @servicejs/nonempty-array - Non-empty arrays                   │
│  @servicejs/these        - These<L, R> three-state type         │
│  @servicejs/validation   - Validation with error accumulation   │
└─────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────────────────────────────────────┐
│                    HKT Foundation (Type-Level)             [✅]  │
│  @servicejs/hkt-core       - HKTF, HKTO, Method, Protocol       │
│  @servicejs/hkt-arithmetic - Type-level arithmetic              │
│  @servicejs/hkt-boolean    - Type-level boolean logic           │
│  @servicejs/hkt-string     - Type-level string manipulation     │
│  @servicejs/hkt-tuple      - Type-level tuple operations        │
│  @servicejs/hkt-object     - Type-level object manipulation     │
│  @servicejs/hkt-combinator - Higher-order HKTO functions        │
│  @servicejs/hkt-compose    - Function composition utilities     │
│                              (Pure type-level, zero runtime)    │
└─────────────────────────────────────────────────────────────────┘
```

**Legend:** [✅] = Implemented in Phase 1

### Core Concepts

#### 1. Messages

Immutable data structures representing communication:

```typescript
interface Message {
  readonly type: string;
  // ... additional fields
}
```

#### 2. Capabilities

The ONLY way to interact with components:

```typescript
interface Capability<TMsg extends Message> {
  readonly send: (message: TMsg) => void;
}
```

#### 3. Reducers

Pure functions processing messages:

```typescript
type Reducer<TState, TMsg extends Message> = (
  state: TState,
  message: TMsg
) => ReducerResult<TState, TMsg>;
```

#### 4. Effects

Instructions to emit messages:

```typescript
interface Effect {
  readonly send: (message: Message) => void;
  readonly message: Message;
}
```

#### 5. URNs

Unique identifiers (for debugging, not lookup):

```typescript
type URN = `urn:${string}:${string}`;
```

### Information Flow

```
User Code
    │
    ├─→ Creates Component (factory returns Capability)
    │
    └─→ Sends Message via Capability
            │
            ├─→ [Optional] Transport translates to network/worker
            │
            ├─→ [Optional] Mailbox queues and serializes
            │
            └─→ Reducer processes message
                    │
                    ├─→ Returns new state
                    ├─→ Returns new reducer (session type transition)
                    └─→ Returns effects (messages to emit)
                            │
                            └─→ Effects executed, cycle repeats
```

---

## Alternatives Considered

### Alternative 1: Traditional OOP with Interfaces

**Approach:** Use interfaces and dependency injection without message passing.

**Pros:**

- Familiar to most developers
- Direct method calls (performance)
- Strong IDE support

**Cons:**

- Tight coupling
- Hard to make location-transparent
- Difficult to implement session types
- No structural security guarantees

**Decision:** Rejected. Doesn't meet core goals of capability security and location transparency.

### Alternative 2: Actor Model (like Akka)

**Approach:** Traditional actor model with actor references and mailboxes in core.

**Pros:**

- Well-understood pattern
- Good for distributed systems
- Strong supervision model

**Cons:**

- Actors are stateful objects (not pure)
- Address-based (not capability-based)
- Mailbox in core adds complexity
- Hard to implement session types cleanly

**Decision:** Rejected. We want pure reducers and capability-based security, not address-based actors.

### Alternative 3: Event Sourcing Framework (like EventStore)

**Approach:** Focus on event log as primary abstraction.

**Pros:**

- Audit trail built-in
- Time-travel debugging
- CQRS natural fit

**Cons:**

- Event log is infrastructure concern
- Not all use cases need event sourcing
- Doesn't address communication patterns
- No capability security

**Decision:** Rejected. Event sourcing is a pattern we support, not the core abstraction.

### Alternative 4: CSP (Communicating Sequential Processes)

**Approach:** Use channels like Go's CSP model.

**Pros:**

- Simple mental model
- Good for concurrency
- Proven in Go

**Cons:**

- Channels are first-class, not capabilities
- No structural security
- Blocking semantics awkward in JS
- Doesn't address session types

**Decision:** Rejected. Channels are too low-level and don't provide security guarantees.

### Alternative 5: Reactive Streams (RxJS style)

**Approach:** Use observables and operators.

**Pros:**

- Rich operator library
- Good for async pipelines
- Familiar to JS developers

**Cons:**

- Complex mental model (hot/cold, backpressure)
- Not naturally distributed
- No capability security
- Harder to implement session types

**Decision:** Rejected. Too complex, doesn't align with capability model.

### Alternative 6: Pure Functional (Elm Architecture)

**Approach:** Single global reducer with command pattern.

**Pros:**

- Simple mental model
- Easy testing
- Time-travel debugging

**Cons:**

- Doesn't scale to distributed systems
- Global state (no capability isolation)
- Not modular
- Single bottleneck

**Decision:** Rejected. Doesn't scale to large or distributed systems.

### Why Our Approach?

Our design combines the best elements:

- **Pure reducers** (from functional programming)
- **Capability security** (from E language, Cap'n Proto)
- **Session types** (from process calculi, Rust)
- **Location transparency** (from Erlang, Orleans)
- **Immutability** (from event sourcing)

No existing framework combines all these properties.

---

## Trade-offs

### 1. Pure Core vs Performance

**Trade-off:** Pure reducer functions have indirection overhead compared to direct calls.

**Decision:** Accept overhead in exchange for testability and flexibility. Most apps are I/O bound, not CPU bound.

**Mitigation:** Local transport can optimize away overhead with direct calls when safe.

### 2. Capability Discipline vs Convenience

**Trade-off:** Passing capabilities everywhere is more verbose than global state.

**Decision:** Accept verbosity in exchange for security and testability.

**Mitigation:**

- Factory functions return capabilities, hide wiring
- Class decorators auto-inject capabilities
- Fluent builders reduce boilerplate

### 3. Immutability vs Memory

**Trade-off:** Creating new state on every message uses more memory.

**Decision:** Accept memory overhead in exchange for safety and debugging.

**Mitigation:**

- Structural sharing (JS engines optimize this)
- Content-addressed storage (dedup automatically)
- Snapshots and compaction for long-running components

### 4. Fire-and-Forget vs Error Handling

**Trade-off:** Fire-and-forget makes error handling less obvious.

**Decision:** Accept complexity in exchange for decoupling and scalability.

**Mitigation:**

- Result types in reply channels
- Supervision hierarchies for error notification
- Request/reply pattern for synchronous-style errors

### 5. Type Safety vs Flexibility

**Trade-off:** Strong typing makes some dynamic patterns harder.

**Decision:** Favor type safety, provide escape hatches where needed.

**Mitigation:**

- Union types for multi-protocol components
- `unknown` type for dynamic cases
- Schema validation for network boundaries

### 6. Location Transparency vs Network Awareness

**Trade-off:** Hiding network makes it easy to accidentally create chatty protocols.

**Decision:** Provide transparency but make network explicit in types.

**Mitigation:**

- Transport type visible in capability type
- Performance monitoring built-in
- Batching utilities for network optimization

### 7. Minimalist Core vs Batteries Included

**Trade-off:** Tiny core means more packages to learn.

**Decision:** Core is minimal, but standard library is comprehensive.

**Mitigation:**

- Starter templates with common setup
- Documentation showing recommended stack
- Single `@servicejs/all` meta-package for convenience

### 8. No Lifecycle Hooks vs Convenience

**Trade-off:** No standard lifecycle means users reinvent patterns.

**Decision:** No hooks in core, but standard patterns in utilities.

**Mitigation:**

- `@servicejs/lifecycle` provides common patterns
- Documentation shows best practices
- Templates include lifecycle setup

---

## Higher-Kinded Types Architecture

### Overview

ServiceJS uses Higher-Kinded Types (HKTs) as the foundation for type-level protocol verification and compile-time safety. HKTs allow us to:

1. Define protocols as first-class types (HKTOs)
2. Verify implementations match protocols at compile-time
3. Derive runtime types from type-level definitions
4. Ensure session type correctness

### Core HKT Concepts

#### HKTF (Higher-Kinded Type Functions)

HKTFs are type-level functions that take type arguments and return types:

```typescript
// Type-level function
interface HKTF.Base {
  [ArgsSymbol]: unknown;      // Input types
  [DefaultsSymbol]?: unknown; // Default values for partial application
  [ResultSymbol]: unknown;    // Output type
}

// Apply a type function
type Result = HKTF.Apply<SomeHKTF, { arg: number }>;
```

Examples:

- `Some<T>` - Constructor for Option.Some
- `Ok<T>` - Constructor for Result.Ok
- Function types as HKTFs

#### HKTO (Higher-Kinded Type Objects)

HKTOs are type-level objects that dispatch messages to methods:

```typescript
interface HKTO.Base extends HKTF.Base {
  [ArgsSymbol]: unknown;              // Accepted message types
  [ResultSymbol]: unknown;            // Result based on message
  [MethodsSymbol]: readonly Method.Base[]; // Tuple of methods
}

// Send a message to an HKTO
type Result = HKTO.Send<SomeHKTO, SomeMessage>;
```

HKTOs correspond directly to our event-sourced reducer objects:

- Methods = message handlers
- State captured in type parameters
- Message dispatch = pattern matching on message type

#### Method Pattern

Methods are type-level functions that handle specific message types:

```typescript
interface Method.Base<Message, Result> extends HKTF.Base {
  [ArgsSymbol]: Message;
  [ResultSymbol]: Result;
}
```

### Runtime Derivation

HKT definitions are pure types. We derive runtime implementations using helper types:

#### HKTF.ToFunction

Converts HKTF to runtime function signature:

```typescript
// Type-level definition
interface Some extends HKTF.Base {
  [ArgsSymbol]: { value: unknown };
  [ResultSymbol]: SomeHKTO<Args<this>["value"]>;
}

// Derive runtime function type
type SomeFunction = HKTF.ToFunction<Some>;
// Result: <T>(args: { value: T }) => SomeHKTO<T>

// Runtime implementation
export const Some: SomeFunction = (args) => { ... };
```

#### HKTO.ToObject

Converts HKTO to runtime object type with methods:

```typescript
// Type-level definition
interface OptionHKTO<T> extends HKTO.Combine<[
  MapMethod<T>,
  GetMethod<T>,
  ...
]> {}

// Derive runtime object type
type OptionObject<T> = HKTO.ToObject<OptionHKTO<T>>;
// Result: { map: ..., get: ..., ... }

// Runtime implementation
export const Some = <T>(value: T): OptionObject<T> => ({
  map: (fn) => Some(fn(value)),
  get: () => value,
  ...
});
```

### Protocol Helpers

#### ToReducer

Converts HKTO protocol to reducer signature:

```typescript
type Reducer<State, Protocol extends HKTO.Base> =
  Protocol.ToReducer<Protocol, State>;

// Verifies reducer implements protocol
const reducer: Reducer<CounterState, CounterProtocol> = ...;
```

#### Implements

Type-level check that implementation matches protocol:

```typescript
type Check = Protocol.Implements<CounterProtocol, typeof myReducer>;
// Result: true or compile error
```

### Message Shape Convention

For `HKTO.ToObject` to derive method names, messages must have a `type` field:

```typescript
interface IncrementMessage {
  type: 'increment'; // Method name
  amount: number;
}

// Becomes:
// { increment: (msg: IncrementMessage) => Result }
```

For HKTOs without this convention, message dispatch is still type-safe but method naming requires explicit configuration.

### Session Types via HKTOs

HKTOs naturally express session types:

```typescript
// ATM protocol as HKTO
interface IdleATM extends HKTO.Combine<[InsertCardMethod]> {}

interface InsertCardMethod extends Method.Base<
  { type: 'insertCard'; cardNumber: string },
  CardInsertedATM  // Transition to new protocol
> {}

interface CardInsertedATM extends HKTO.Combine<[
  EnterPinMethod,
  EjectCardMethod
]> {}

// Type system prevents invalid transitions
type Invalid = HKTO.Send<IdleATM, WithdrawMessage>; // Error!
```

### Benefits of HKT Architecture

1. **Compile-Time Verification**: Protocols verified at compile time
2. **Single Source of Truth**: Types generate runtime implementations
3. **Type Safety**: Invalid message sequences caught by TypeScript
4. **Zero Runtime Overhead**: HKTs are pure types, erased at runtime
5. **Consistency**: Same pattern for Option, Result, Capability, Component, etc.
6. **Tool Support**: Can generate code from HKTO definitions
7. **Documentation**: Types ARE the documentation

### Limitations

1. **No Type-Level Arithmetic**: Can't compute `Count + 1` at type level (TypeScript limitation)
2. **Complexity**: Advanced type-level programming required for new HKTOs
3. **Error Messages**: Type errors can be cryptic (mitigated by helper types)
4. **Learning Curve**: Users don't need to understand HKTs but framework developers do

### Design Decision: HKTs as Foundation

**Why make HKTs foundational rather than optional?**

1. **Session types require type-level state**: Can't verify protocols without HKTs
2. **Consistency**: Using HKTs everywhere creates uniform patterns
3. **Future-proof**: Enables advanced features (protocol verification, code gen)
4. **User-invisible**: Users interact with runtime objects, not HKT types
5. **Type safety**: Compile-time guarantees prevent entire classes of bugs

**Users don't need to understand HKTs:**

- They use runtime objects (Option, Result, Capability)
- HKT types are inferred automatically
- Error messages reference concrete types, not HKTO internals
- Documentation uses familiar object-oriented terminology

---

## Detailed Design

### HKT Foundation (@servicejs/hkt)

#### Core Type Machinery

The HKT package provides the type-level infrastructure that all other packages build on. It is pure type-level code with zero runtime overhead.

```typescript
// @servicejs/hkt/src/hktf.ts
export namespace HKTF {
  export declare const ArgsSymbol: unique symbol;
  export declare const DefaultsSymbol: unique symbol;
  export declare const ResultSymbol: unique symbol;

  export interface Base {
    [ArgsSymbol]: unknown;
    [DefaultsSymbol]?: unknown;
    [ResultSymbol]: unknown;
  }

  export type Args<F extends Base> =
    F extends { [DefaultsSymbol]: infer D }
      ? F[typeof ArgsSymbol] & D
      : F[typeof ArgsSymbol];

  export type Result<F extends Base> = F[typeof ResultSymbol];

  export type Apply<F extends Base, Input extends Partial<F[typeof ArgsSymbol]>> =
    Result<PartialApply<F, Input>>;

  // Convert HKTF to runtime function signature
  export type ToFunction<F extends Base> =
    <Input extends Partial<F[typeof ArgsSymbol]>>(
      args: Input
    ) => Result<PartialApply<F, Input>>;
}

// @servicejs/hkt/src/hkto.ts
export namespace HKTO {
  export declare const MethodsSymbol: unique symbol;

  export interface Base extends HKTF.Base {
    [HKTF.ArgsSymbol]: unknown;
    [HKTF.ResultSymbol]: unknown;
    [MethodsSymbol]: readonly Method.Base[];
  }

  export type Send<O extends Base, Message extends O[typeof HKTF.ArgsSymbol]> =
    SendToMethods<O[typeof MethodsSymbol], Message>;

  export interface Combine<Methods extends readonly Method.Base[]> extends Base {
    [HKTF.ArgsSymbol]: ExtractMessages<Methods>;
    [HKTF.ResultSymbol]: Send<this, HKTF.Args<this>>;
    [MethodsSymbol]: Methods;
  }

  // Convert HKTO to runtime object type
  export type ToObject<O extends Base> = {
    readonly _tag?: string;
  } & MethodsToObject<O[typeof MethodsSymbol]>;

  type MethodsToObject<Methods extends readonly Method.Base[]> =
    Methods extends readonly []
      ? {}
      : Methods extends readonly [infer M, ...infer Rest]
        ? M extends Method.Base
          ? Rest extends readonly Method.Base[]
            ? MethodToObjectMethod<M> & MethodsToObject<Rest>
            : MethodToObjectMethod<M>
          : {}
        : {};

  type MethodToObjectMethod<M extends Method.Base> = {
    readonly [K in ExtractMethodName<Method.MessageOf<M>>]: (
      msg: Method.MessageOf<M>
    ) => HKTF.Result<M>;
  };

  type ExtractMethodName<Msg> =
    Msg extends { type: infer Name extends string }
      ? Name
      : 'send';
}

// @servicejs/hkt/src/method.ts
export namespace Method {
  export interface Base<Message = unknown, Result = unknown> extends HKTF.Base {
    [HKTF.ArgsSymbol]: Message;
    [HKTF.ResultSymbol]: Result;
  }

  export type MessageOf<M extends Base> = M[typeof HKTF.ArgsSymbol];
}

// @servicejs/hkt/src/protocol.ts
export namespace Protocol {
  // Convert HKTO to reducer signature
  export type ToReducer<O extends HKTO.Base, State> = (
    state: State,
    message: O[typeof HKTF.ArgsSymbol]
  ) => {
    state: State;
    reducer: ToReducer<HKTO.Send<O, typeof message>, State>;
    effects: readonly Effect[];
  };

  // Verify implementation matches protocol
  export type Implements<
    Protocol extends HKTO.Base,
    Impl
  > = Impl extends ToReducer<Protocol, any> ? true : false;
}
```

### Type Utilities

#### Result Type (@servicejs/result)

Complete Result type with HKT definitions and runtime implementation:

```typescript
// @servicejs/result/src/types.ts
import { HKTF, HKTO, Method } from '@servicejs/hkt';

export namespace ResultTypes {
  // Method types for Ok variant
  export interface OkMap<T> extends Method.Base<
    { type: 'map'; fn: (value: T) => unknown },
    unknown
  > {
    [HKTF.ResultSymbol]: Args<this>['fn'] extends (value: T) => infer U
      ? OkHKTO<U>
      : never;
  }

  export interface OkMapErr<T, E> extends Method.Base<
    { type: 'mapErr'; fn: (error: never) => unknown },
    OkHKTO<T>
  > {}

  export interface OkAndThen<T> extends Method.Base<
    { type: 'andThen'; fn: (value: T) => ResultHKTO<unknown, unknown> },
    unknown
  > {
    [HKTF.ResultSymbol]: Args<this>['fn'] extends (value: T) => infer R
      ? R
      : never;
  }

  export interface OkUnwrap<T> extends Method.Base<
    { type: 'unwrap' },
    T
  > {}

  // Ok HKTO
  export interface OkHKTO<T> extends HKTO.Combine<readonly [
    OkMap<T>,
    OkMapErr<T, never>,
    OkAndThen<T>,
    OkUnwrap<T>
  ]> {}

  // Similar for Err variant...
  export interface ErrHKTO<E> extends HKTO.Combine<readonly [...]> {}

  export type ResultHKTO<T, E> = OkHKTO<T> | ErrHKTO<E>;

  // Constructor types
  export interface Ok extends HKTF.Base {
    [HKTF.ArgsSymbol]: { value: unknown };
    [HKTF.ResultSymbol]: OkHKTO<HKTF.Args<this>['value']>;
  }

  export interface Err extends HKTF.Base {
    [HKTF.ArgsSymbol]: { error: unknown };
    [HKTF.ResultSymbol]: ErrHKTO<HKTF.Args<this>['error']>;
  }
}

// @servicejs/result/src/runtime.ts
import { HKTO, HKTF } from '@servicejs/hkt';
import { ResultTypes } from './types.js';

// Derive runtime type from HKTO
export type Result<T, E> = HKTO.ToObject<ResultTypes.ResultHKTO<T, E>>;

// Derive constructor signatures from HKTFs
export type OkFunction = HKTF.ToFunction<ResultTypes.Ok>;
export type ErrFunction = HKTF.ToFunction<ResultTypes.Err>;

// Runtime implementations
export const Ok: OkFunction = ({ value }) => ({
  map: (fn) => Ok({ value: fn.fn(value) }),
  mapErr: (_fn) => Ok({ value }),
  andThen: (fn) => fn.fn(value),
  unwrap: () => value,
  _tag: 'Ok' as const,
});

export const Err: ErrFunction = ({ error }) => ({
  map: (_fn) => Err({ error }),
  mapErr: (fn) => Err({ error: fn.fn(error) }),
  andThen: (_fn) => Err({ error }),
  unwrap: () => { throw new Error('Cannot unwrap Err'); },
  _tag: 'Err' as const,
});

// Helper functions
export const map = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> => result.map({ type: 'map', fn: { fn } });

export const isOk = <T, E>(result: Result<T, E>): result is Result<T, never> =>
  result._tag === 'Ok';

export const isErr = <T, E>(result: Result<T, E>): result is Result<never, E> =>
  result._tag === 'Err';
```

### Core Types (@servicejs/core)

#### Result Type

Rust-style error handling without exceptions:

```typescript
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// Combinators
export const map = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> => {
  return result.ok ? Ok(fn(result.value)) : result;
};

export const andThen = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> => {
  return result.ok ? fn(result.value) : result;
};

export const mapErr = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> => {
  return result.ok ? result : Err(fn(result.error));
};

export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.ok) return result.value;
  throw new Error('Called unwrap on an Err value');
};

export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T => {
  return result.ok ? result.value : defaultValue;
};
```

#### URN Type

Unique identifiers for components (debugging, not lookup):

```typescript
export type URN = `urn:${string}:${string}`;

export const createURN = (namespace: string, id: string): URN => {
  if (!namespace || !id) {
    throw new Error('URN requires non-empty namespace and id');
  }
  if (namespace.includes(':') || id.includes(':')) {
    throw new Error('URN namespace and id cannot contain ":"');
  }
  return `urn:${namespace}:${id}`;
};

export const parseURN = (urn: URN): { namespace: string; id: string } => {
  const match = urn.match(/^urn:([^:]+):(.+)$/);
  if (!match) {
    throw new Error(`Invalid URN format: ${urn}`);
  }
  return { namespace: match[1], id: match[2] };
};

export const generateURN = (namespace: string): URN => {
  const id = crypto.randomUUID();
  return createURN(namespace, id);
};
```

#### Message Type

Base type for all messages:

```typescript
export interface Message {
  readonly type: string;
}

// Helper to create message types
export const createMessageType = <T extends string>(type: T) => {
  return <TData extends Record<string, unknown>>(
    data: TData
  ): Message & { type: T } & TData => ({
    type,
    ...data,
  });
};
```

#### Capability Type

The primary abstraction for inter-component communication:

```typescript
export interface Capability<TMsg extends Message> {
  readonly send: (message: TMsg) => void;
}

// Factory to create capability from send function
export const createCapability = <TMsg extends Message>(
  send: (message: TMsg) => void
): Capability<TMsg> => ({
  send,
});

// Transform messages through a capability
export const mapCapability = <TIn extends Message, TOut extends Message>(
  capability: Capability<TOut>,
  transform: (message: TIn) => TOut
): Capability<TIn> => ({
  send: (message) => capability.send(transform(message)),
});

// Filter messages through a capability
export const filterCapability = <TMsg extends Message>(
  capability: Capability<TMsg>,
  predicate: (message: TMsg) => boolean
): Capability<TMsg> => ({
  send: (message) => {
    if (predicate(message)) {
      capability.send(message);
    }
  },
});

// Compose capabilities
export const composeCapabilities = <T1 extends Message, T2 extends Message>(
  capability: Capability<T2>,
  transform: (message: T1) => T2
): Capability<T1> => ({
  send: (message) => capability.send(transform(message)),
});

// Capability that validates messages
export const validateCapability = <TMsg extends Message>(
  capability: Capability<TMsg>,
  validate: (message: TMsg) => boolean,
  onInvalid?: (message: TMsg) => void
): Capability<TMsg> => ({
  send: (message) => {
    if (validate(message)) {
      capability.send(message);
    } else {
      onInvalid?.(message);
    }
  },
});
```

#### Reducer Type

Pure function that processes messages:

```typescript
export type Reducer<TState, TMsg extends Message> = (
  state: TState,
  message: TMsg
) => ReducerResult<TState, TMsg>;

export interface ReducerResult<TState, TMsg extends Message> {
  readonly state: TState;
  readonly reducer: Reducer<TState, TMsg>;
  readonly effects: readonly Effect[];
}

// Helper to create reducer results
export const reducerResult = <TState, TMsg extends Message>(
  state: TState,
  reducer: Reducer<TState, TMsg>,
  effects: readonly Effect[] = []
): ReducerResult<TState, TMsg> => ({
  state,
  reducer,
  effects,
});

// Helper to stay in same state with same reducer
export const stay = <TState, TMsg extends Message>(
  state: TState,
  reducer: Reducer<TState, TMsg>,
  effects: readonly Effect[] = []
): ReducerResult<TState, TMsg> => ({
  state,
  reducer,
  effects,
});

// Helper to transition to new state/reducer
export const transition = <TState, TMsg extends Message>(
  state: TState,
  reducer: Reducer<TState, TMsg>,
  effects: readonly Effect[] = []
): ReducerResult<TState, TMsg> => ({
  state,
  reducer,
  effects,
});
```

#### Effect Type

Instructions to emit messages:

```typescript
export interface Effect {
  readonly send: (message: Message) => void;
  readonly message: Message;
}

// Helper to create effects
export const effect = (
  send: (message: Message) => void,
  message: Message
): Effect => ({
  send,
  message,
});

// Helper to emit to a capability
export const emitTo = <TMsg extends Message>(
  capability: Capability<TMsg>,
  message: TMsg
): Effect => ({
  send: capability.send,
  message,
});

// Execute effects
export const executeEffects = (effects: readonly Effect[]): void => {
  for (const eff of effects) {
    eff.send(eff.message);
  }
};
```

#### Component Type

Minimal interface for components:

```typescript
export interface Component<TState, TMsg extends Message> {
  readonly urn: URN;
  reduce(message: TMsg): void;
  getState(): TState;
}

// Factory to create a basic component
export const createComponent = <TState, TMsg extends Message>(
  urn: URN,
  initialState: TState,
  initialReducer: Reducer<TState, TMsg>
): { component: Component<TState, TMsg>; capability: Capability<TMsg> } => {
  let state = initialState;
  let reducer = initialReducer;

  const component: Component<TState, TMsg> = {
    urn,
    reduce(message: TMsg) {
      const result = reducer(state, message);
      state = result.state;
      reducer = result.reducer;
      executeEffects(result.effects);
    },
    getState() {
      return state;
    },
  };

  const capability: Capability<TMsg> = {
    send: (message) => component.reduce(message),
  };

  return { component, capability };
};
```

### Mailbox Implementations (@servicejs/mailbox)

Mailboxes wrap reducers to control execution semantics:

#### FIFO Mailbox

Sequential processing, maintains order:

```typescript
export interface Mailbox<TMsg extends Message> {
  enqueue(message: TMsg): void;
  start(): void;
  stop(): Promise<void>;
  size(): number;
}

export const createFIFOMailbox = <TMsg extends Message>(
  onMessage: (message: TMsg) => void
): Mailbox<TMsg> => {
  const queue: TMsg[] = [];
  let processing = false;
  let running = true;

  const processQueue = () => {
    if (processing || !running) return;
    processing = true;

    while (queue.length > 0 && running) {
      const message = queue.shift()!;
      onMessage(message);
    }

    processing = false;
  };

  return {
    enqueue(message: TMsg) {
      queue.push(message);
      if (running) {
        processQueue();
      }
    },
    start() {
      running = true;
      processQueue();
    },
    async stop() {
      running = false;
      // Wait for current message to finish
      while (processing) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    },
    size() {
      return queue.length;
    },
  };
};
```

#### Priority Mailbox

Process high-priority messages first:

```typescript
export interface PriorityMessage extends Message {
  readonly priority: number;
}

export const createPriorityMailbox = <TMsg extends PriorityMessage>(
  onMessage: (message: TMsg) => void
): Mailbox<TMsg> => {
  const queue: TMsg[] = [];
  let processing = false;
  let running = true;

  const processQueue = () => {
    if (processing || !running) return;
    processing = true;

    while (queue.length > 0 && running) {
      // Sort by priority (higher first)
      queue.sort((a, b) => b.priority - a.priority);
      const message = queue.shift()!;
      onMessage(message);
    }

    processing = false;
  };

  return {
    enqueue(message: TMsg) {
      queue.push(message);
      if (running) {
        processQueue();
      }
    },
    start() {
      running = true;
      processQueue();
    },
    async stop() {
      running = false;
      while (processing) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    },
    size() {
      return queue.length;
    },
  };
};
```

#### Bounded Mailbox

Mailbox with maximum capacity and overflow strategies:

```typescript
export type OverflowStrategy = 'drop-oldest' | 'drop-newest' | 'block' | 'error';

export interface BoundedMailboxConfig<TMsg extends Message> {
  readonly capacity: number;
  readonly overflowStrategy: OverflowStrategy;
  readonly onMessage: (message: TMsg) => void;
  readonly onOverflow?: (message: TMsg) => void;
}

export const createBoundedMailbox = <TMsg extends Message>(
  config: BoundedMailboxConfig<TMsg>
): Mailbox<TMsg> => {
  const queue: TMsg[] = [];
  let processing = false;
  let running = true;

  const processQueue = () => {
    if (processing || !running) return;
    processing = true;

    while (queue.length > 0 && running) {
      const message = queue.shift()!;
      config.onMessage(message);
    }

    processing = false;
  };

  return {
    enqueue(message: TMsg) {
      if (queue.length >= config.capacity) {
        switch (config.overflowStrategy) {
          case 'drop-oldest':
            queue.shift();
            queue.push(message);
            break;
          case 'drop-newest':
            config.onOverflow?.(message);
            return;
          case 'block':
            // In sync context, we have to drop
            config.onOverflow?.(message);
            return;
          case 'error':
            throw new Error('Mailbox capacity exceeded');
        }
      } else {
        queue.push(message);
      }

      if (running) {
        processQueue();
      }
    },
    start() {
      running = true;
      processQueue();
    },
    async stop() {
      running = false;
      while (processing) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    },
    size() {
      return queue.length;
    },
  };
};
```

#### Async Mailbox

Mailbox with async processing support:

```typescript
export const createAsyncMailbox = <TMsg extends Message>(
  onMessage: (message: TMsg) => Promise<void>
): Mailbox<TMsg> => {
  const queue: TMsg[] = [];
  let processing = false;
  let running = true;

  const processQueue = async () => {
    if (processing || !running) return;
    processing = true;

    while (queue.length > 0 && running) {
      const message = queue.shift()!;
      await onMessage(message);
    }

    processing = false;
  };

  return {
    enqueue(message: TMsg) {
      queue.push(message);
      if (running && !processing) {
        processQueue();
      }
    },
    start() {
      running = true;
      if (!processing) {
        processQueue();
      }
    },
    async stop() {
      running = false;
      while (processing) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    },
    size() {
      return queue.length;
    },
  };
};
```

### Communication Patterns (@servicejs/patterns)

#### Request/Reply Pattern

Synchronous-style communication:

```typescript
export interface RequestMessage<TReq, TResp, TErr = Error> extends Message {
  readonly type: string;
  readonly request: TReq;
  readonly replyTo: Capability<Result<TResp, TErr>>;
}

export const createRequestMessage = <TReq, TResp, TErr = Error>(
  type: string,
  request: TReq,
  replyTo: Capability<Result<TResp, TErr>>
): RequestMessage<TReq, TResp, TErr> => ({
  type,
  request,
  replyTo,
});

// Send request and wait for reply
export const sendRequest = <TReq, TResp, TErr = Error>(
  capability: Capability<RequestMessage<TReq, TResp, TErr>>,
  type: string,
  request: TReq,
  timeout?: number
): Promise<Result<TResp, TErr>> => {
  return new Promise((resolve) => {
    let timeoutId: NodeJS.Timeout | undefined;

    const replyCapability: Capability<Result<TResp, TErr>> = {
      send: (result) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(result);
      },
    };

    const requestMessage = createRequestMessage(type, request, replyCapability);
    capability.send(requestMessage);

    if (timeout) {
      timeoutId = setTimeout(() => {
        resolve(Err({ message: 'Request timeout' } as TErr));
      }, timeout);
    }
  });
};

// Helper for handling requests in reducers
export const replyWith = <TResp, TErr>(
  replyTo: Capability<Result<TResp, TErr>>,
  result: Result<TResp, TErr>
): Effect => ({
  send: replyTo.send,
  message: result as unknown as Message,
});
```

#### Pub/Sub Pattern

Topic-based messaging:

```typescript
export interface PubSubBroker {
  subscribe(topic: string, capability: Capability<Message>): Subscription;
  publish(topic: string, message: Message): void;
  unsubscribe(subscription: Subscription): void;
}

export interface Subscription {
  readonly id: string;
  readonly topic: string;
  unsubscribe(): void;
}

export const createPubSubBroker = (): PubSubBroker => {
  const subscriptions = new Map<string, Map<string, Capability<Message>>>();

  return {
    subscribe(topic: string, capability: Capability<Message>): Subscription {
      const id = crypto.randomUUID();

      if (!subscriptions.has(topic)) {
        subscriptions.set(topic, new Map());
      }
      subscriptions.get(topic)!.set(id, capability);

      const subscription: Subscription = {
        id,
        topic,
        unsubscribe() {
          subscriptions.get(topic)?.delete(id);
          if (subscriptions.get(topic)?.size === 0) {
            subscriptions.delete(topic);
          }
        },
      };

      return subscription;
    },

    publish(topic: string, message: Message): void {
      const topicSubs = subscriptions.get(topic);
      if (!topicSubs) return;

      for (const capability of topicSubs.values()) {
        capability.send(message);
      }
    },

    unsubscribe(subscription: Subscription): void {
      subscription.unsubscribe();
    },
  };
};
```

#### Supervision Pattern

Error handling and recovery:

```typescript
export type SupervisionStrategy = 'restart' | 'stop' | 'escalate';

export interface SupervisorConfig {
  readonly strategy: SupervisionStrategy;
  readonly maxRetries: number;
  readonly retryDelay: number;
  readonly errorNotification: Capability<ErrorNotification>;
}

export interface ErrorNotification extends Message {
  readonly type: 'error';
  readonly childURN: URN;
  readonly error: Error;
  readonly timestamp: number;
}

export interface Supervisor {
  registerChild(urn: URN, restart: () => void): void;
  unregisterChild(urn: URN): void;
  notifyError(urn: URN, error: Error): void;
}

export const createSupervisor = (config: SupervisorConfig): Supervisor => {
  const children = new Map<string, { restart: () => void; retries: number }>();

  return {
    registerChild(urn: URN, restart: () => void): void {
      children.set(urn, { restart, retries: 0 });
    },

    unregisterChild(urn: URN): void {
      children.delete(urn);
    },

    notifyError(urn: URN, error: Error): void {
      const child = children.get(urn);
      if (!child) return;

      // Send error notification
      config.errorNotification.send({
        type: 'error',
        childURN: urn,
        error,
        timestamp: Date.now(),
      });

      switch (config.strategy) {
        case 'restart':
          if (child.retries < config.maxRetries) {
            child.retries++;
            setTimeout(() => {
              child.restart();
            }, config.retryDelay);
          } else {
            // Max retries exceeded, stop
            children.delete(urn);
          }
          break;

        case 'stop':
          children.delete(urn);
          break;

        case 'escalate':
          // Would notify parent supervisor
          // For now, just stop
          children.delete(urn);
          break;
      }
    },
  };
};
```

### Lifecycle Management (@servicejs/lifecycle)

Optional lifecycle patterns:

```typescript
export interface LifecycleHooks {
  readonly onInit?: () => Promise<void>;
  readonly onShutdown?: () => Promise<void>;
}

export interface ManagedComponent<TState, TMsg extends Message>
  extends Component<TState, TMsg> {
  init(): Promise<void>;
  shutdown(): Promise<void>;
}

export const withLifecycle = <TState, TMsg extends Message>(
  component: Component<TState, TMsg>,
  hooks: LifecycleHooks
): ManagedComponent<TState, TMsg> => {
  return {
    ...component,
    async init() {
      if (hooks.onInit) {
        await hooks.onInit();
      }
    },
    async shutdown() {
      if (hooks.onShutdown) {
        await hooks.onShutdown();
      }
    },
  };
};

// Graceful shutdown coordinator
export interface ShutdownCoordinator {
  register(component: ManagedComponent<any, any>): void;
  shutdown(): Promise<void>;
}

export const createShutdownCoordinator = (): ShutdownCoordinator => {
  const components: ManagedComponent<any, any>[] = [];

  return {
    register(component: ManagedComponent<any, any>) {
      components.push(component);
    },

    async shutdown() {
      // Shutdown in reverse order of registration
      for (let i = components.length - 1; i >= 0; i--) {
        await components[i].shutdown();
      }
    },
  };
};
```

### Backpressure (@servicejs/backpressure)

Flow control utilities:

```typescript
export interface AsyncCapability<TMsg extends Message> {
  sendAsync(message: TMsg): Promise<void>;
}

export const createAsyncCapability = <TMsg extends Message>(
  mailbox: Mailbox<TMsg>,
  maxQueueSize: number
): AsyncCapability<TMsg> => {
  return {
    async sendAsync(message: TMsg): Promise<void> {
      while (mailbox.size() >= maxQueueSize) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      mailbox.enqueue(message);
    },
  };
};

// Circuit breaker pattern
export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  readonly failureThreshold: number;
  readonly resetTimeout: number;
  readonly onStateChange?: (state: CircuitState) => void;
}

export const createCircuitBreaker = <TMsg extends Message>(
  capability: Capability<TMsg>,
  config: CircuitBreakerConfig
): Capability<TMsg> => {
  let state: CircuitState = 'closed';
  let failures = 0;
  let lastFailureTime = 0;

  const setState = (newState: CircuitState) => {
    state = newState;
    config.onStateChange?.(newState);
  };

  return {
    send(message: TMsg) {
      if (state === 'open') {
        if (Date.now() - lastFailureTime > config.resetTimeout) {
          setState('half-open');
        } else {
          throw new Error('Circuit breaker is open');
        }
      }

      try {
        capability.send(message);
        if (state === 'half-open') {
          setState('closed');
          failures = 0;
        }
      } catch (error) {
        failures++;
        lastFailureTime = Date.now();

        if (failures >= config.failureThreshold) {
          setState('open');
        }
        throw error;
      }
    },
  };
};
```

### Class-Based Decorators (@servicejs/decorators)

Developer experience layer:

```typescript
export function Component(config: { urn: URN }): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata('component:urn', config.urn, target);
  };
}

export function Handler(messageType?: string): MethodDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    const handlers = Reflect.getMetadata('component:handlers', target) || [];
    handlers.push({ method: propertyKey, messageType });
    Reflect.defineMetadata('component:handlers', handlers, target);
  };
}

export function Inject(capabilityName: string): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
    const injections = Reflect.getMetadata('component:injections', target) || {};
    injections[capabilityName] = parameterIndex;
    Reflect.defineMetadata('component:injections', injections, target);
  };
}

export function OnInit(): MethodDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    Reflect.defineMetadata('component:onInit', propertyKey, target);
  };
}

export function OnShutdown(): MethodDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    Reflect.defineMetadata('component:onShutdown', propertyKey, target);
  };
}

// Factory to create component from decorated class
export const createComponentFromClass = <T>(
  ClassConstructor: new (...args: any[]) => T,
  capabilities: Record<string, Capability<any>>
): { component: Component<any, any>; capability: Capability<any> } => {
  // Extract metadata
  const urn = Reflect.getMetadata('component:urn', ClassConstructor);
  const handlers = Reflect.getMetadata('component:handlers', ClassConstructor.prototype) || [];
  const onInitMethod = Reflect.getMetadata('component:onInit', ClassConstructor.prototype);
  const onShutdownMethod = Reflect.getMetadata('component:onShutdown', ClassConstructor.prototype);

  // Create instance
  const instance = new ClassConstructor(capabilities);

  // Create reducer from handlers
  const reducer: Reducer<T, Message> = (state: T, message: Message) => {
    const handler = handlers.find(
      (h: any) => !h.messageType || h.messageType === message.type
    );

    if (handler) {
      const method = (instance as any)[handler.method];
      method.call(instance, message);
    }

    return stay(state, reducer);
  };

  // Create component
  const { component, capability } = createComponent(urn, instance, reducer);

  // Wrap with lifecycle if hooks exist
  if (onInitMethod || onShutdownMethod) {
    return {
      component: withLifecycle(component, {
        onInit: onInitMethod ? () => (instance as any)[onInitMethod]() : undefined,
        onShutdown: onShutdownMethod ? () => (instance as any)[onShutdownMethod]() : undefined,
      }),
      capability,
    };
  }

  return { component, capability };
};
```

### Transport Layer (@servicejs/transport)

Location-transparent communication:

```typescript
export interface Transport {
  send(target: URN, message: Message): void;
  register(urn: URN, handler: (message: Message) => void): void;
  unregister(urn: URN): void;
  start(): Promise<void>;
  stop(): Promise<void>;
}

// Local transport (in-memory, direct calls)
export const createLocalTransport = (): Transport => {
  const handlers = new Map<string, (message: Message) => void>();
  let running = false;

  return {
    send(target: URN, message: Message) {
      if (!running) throw new Error('Transport not started');
      const handler = handlers.get(target);
      if (!handler) throw new Error(`No handler for ${target}`);
      handler(message);
    },

    register(urn: URN, handler: (message: Message) => void) {
      handlers.set(urn, handler);
    },

    unregister(urn: URN) {
      handlers.delete(urn);
    },

    async start() {
      running = true;
    },

    async stop() {
      running = false;
      handlers.clear();
    },
  };
};

// Worker transport (Web Workers / Node.js worker_threads)
export const createWorkerTransport = (worker: Worker): Transport => {
  const handlers = new Map<string, (message: Message) => void>();
  let running = false;

  worker.onmessage = (event) => {
    const { target, message } = event.data;
    const handler = handlers.get(target);
    if (handler) {
      handler(message);
    }
  };

  return {
    send(target: URN, message: Message) {
      if (!running) throw new Error('Transport not started');
      worker.postMessage({ target, message });
    },

    register(urn: URN, handler: (message: Message) => void) {
      handlers.set(urn, handler);
    },

    unregister(urn: URN) {
      handlers.delete(urn);
    },

    async start() {
      running = true;
    },

    async stop() {
      running = false;
      worker.terminate();
    },
  };
};
```

### Schema Validation (@servicejs/schema)

Runtime message validation:

```typescript
import { z } from 'zod';

export interface MessageSchema<T extends Message> {
  validate(message: unknown): Result<T, Error>;
  parse(message: unknown): T;
}

export const createZodSchema = <T extends Message>(
  schema: z.ZodType<T>
): MessageSchema<T> => {
  return {
    validate(message: unknown): Result<T, Error> {
      const result = schema.safeParse(message);
      if (result.success) {
        return Ok(result.data);
      } else {
        return Err(new Error(result.error.message));
      }
    },
    parse(message: unknown): T {
      return schema.parse(message);
    },
  };
};

// Capability with automatic validation
export const withValidation = <TMsg extends Message>(
  capability: Capability<TMsg>,
  schema: MessageSchema<TMsg>,
  onInvalid?: (error: Error) => void
): Capability<TMsg> => {
  return {
    send(message: TMsg) {
      const result = schema.validate(message);
      if (result.ok) {
        capability.send(result.value);
      } else {
        onInvalid?.(result.error);
      }
    },
  };
};
```

---

## Runtime Environment and Platform Capabilities

### Philosophy

ServiceJS maintains strict capability discipline: components should never directly access ambient authority like `process`, `window`, `Deno`, or other global objects. Instead, runtime features are provided as **explicit capability objects** that are injected into the application root.

This approach provides:

1. **No ambient authority**: All runtime access is explicit
2. **Platform independence**: Same interface across runtimes (where feasible)
3. **Testability**: Easy to mock runtime capabilities
4. **Security**: Can restrict what application components can access
5. **Portability**: Write once, run anywhere (with graceful degradation)

### Architecture

The runtime system is split into two layers:

1. **Capability packages** (`@servicejs/capability-*`): Define interfaces and provide in-memory/noop implementations
2. **Runtime packages** (`@servicejs/runtime-*`): Provide platform-specific implementations

This separation allows:

- Testing with mock capabilities
- Platform-agnostic application code
- Runtime selection at bootstrap time
- Gradual capability adoption

### Capability Packages

Each capability package defines:

- TypeScript interfaces for the capability
- In-memory implementation for testing
- No-op implementation where appropriate
- Helper functions and utilities

All operations return `Result<T, E>` - **never throw exceptions**.

#### Environment Capability (@servicejs/capability-env)

Access to environment variables and platform metadata:

```typescript
import { Result, Option } from '@servicejs/result';

export interface EnvironmentCapability {
  /**
   * Get environment variable by key
   */
  get(key: string): Option<string>;

  /**
   * Get all environment variables
   */
  getAll(): Record<string, string>;

  /**
   * Platform identifier
   */
  readonly platform: Platform;

  /**
   * Platform version (e.g., Node.js v20.0.0)
   */
  readonly version: string;
}

export type Platform =
  | 'node'
  | 'node-worker'
  | 'browser'
  | 'web-worker'
  | 'shared-worker'
  | 'service-worker'
  | 'cloudflare-worker'
  | 'deno'
  | 'bun';

// In-memory implementation
export const createInMemoryEnv = (
  vars: Record<string, string>,
  platform: Platform = 'node'
): EnvironmentCapability => ({
  get: (key) => key in vars ? Some({ value: vars[key] }) : None(),
  getAll: () => ({ ...vars }),
  platform,
  version: 'in-memory',
});
```

#### Time Capability (@servicejs/capability-time)

Time and scheduling operations:

```typescript
export interface TimeCapability {
  /**
   * Get current timestamp (milliseconds since epoch)
   */
  now(): number;

  /**
   * Schedule a callback after delay
   * Returns cancel function
   */
  setTimeout(callback: () => void, ms: number): Result<CancelFn, TimeError>;

  /**
   * Schedule a recurring callback
   * Returns cancel function
   */
  setInterval(callback: () => void, ms: number): Result<CancelFn, TimeError>;

  /**
   * High-resolution time (nanoseconds)
   * For performance measurement
   */
  hrtime?(): bigint;
}

export type CancelFn = () => void;

export interface TimeError {
  readonly code: 'INVALID_DELAY' | 'CALLBACK_ERROR';
  readonly message: string;
}

// Controllable fake time for testing
export const createFakeTime = (): TimeCapability & {
  advance(ms: number): void;
  tick(): void;
} => {
  let currentTime = 0;
  const timers: Array<{ time: number; callback: () => void }> = [];

  return {
    now: () => currentTime,
    setTimeout: (callback, ms) => {
      if (ms < 0) return Err({ code: 'INVALID_DELAY', message: 'Delay must be non-negative' });
      timers.push({ time: currentTime + ms, callback });
      return Ok(() => {
        const index = timers.findIndex(t => t.callback === callback);
        if (index !== -1) timers.splice(index, 1);
      });
    },
    setInterval: (callback, ms) => {
      // Similar implementation
      return Ok(() => {});
    },
    advance: (ms) => {
      currentTime += ms;
      // Fire pending timers
    },
    tick: () => {
      // Fire all pending timers
    },
  };
};
```

#### Lifecycle Capability (@servicejs/capability-lifecycle)

Application lifecycle and graceful shutdown:

```typescript
export interface LifecycleCapability {
  /**
   * Register shutdown handler
   * Returns unregister function
   */
  onShutdown(handler: ShutdownHandler): Result<UnregisterFn, LifecycleError>;

  /**
   * Initiate graceful shutdown
   */
  shutdown(reason?: string): Promise<Result<void, ShutdownError>>;

  /**
   * Get capability for shutdown signals
   */
  shutdownSignals(): Capability<ShutdownSignalMessage>;
}

export type ShutdownHandler = (signal: ShutdownSignal) => Promise<void> | void;
export type UnregisterFn = () => void;

export interface ShutdownSignal {
  readonly reason: string;
  readonly signal?: string; // e.g., 'SIGTERM', 'SIGINT'
  readonly timestamp: number;
}

export interface ShutdownSignalMessage extends Message {
  readonly type: 'shutdown-signal';
  readonly signal: ShutdownSignal;
}
```

#### File System Capability (@servicejs/capability-fs)

File system operations:

```typescript
export interface FileSystemCapability {
  /**
   * Read file contents
   */
  readFile(path: string): Promise<Result<Uint8Array, FSError>>;

  /**
   * Write file contents
   */
  writeFile(path: string, data: Uint8Array): Promise<Result<void, FSError>>;

  /**
   * Check if path exists
   */
  exists(path: string): Promise<Result<boolean, FSError>>;

  /**
   * List directory contents
   */
  readdir(path: string): Promise<Result<string[], FSError>>;

  /**
   * Get file stats
   */
  stat(path: string): Promise<Result<FileStats, FSError>>;

  /**
   * Create directory
   */
  mkdir(path: string, options?: { recursive?: boolean }): Promise<Result<void, FSError>>;

  /**
   * Remove file or directory
   */
  remove(path: string, options?: { recursive?: boolean }): Promise<Result<void, FSError>>;
}

export interface FileStats {
  readonly size: number;
  readonly isFile: boolean;
  readonly isDirectory: boolean;
  readonly created: number;
  readonly modified: number;
}

export interface FSError {
  readonly code: 'ENOENT' | 'EACCES' | 'EISDIR' | 'ENOTDIR' | 'EEXIST' | 'UNKNOWN';
  readonly message: string;
  readonly path: string;
}

// In-memory file system for testing
export const createInMemoryFS = (): FileSystemCapability => {
  const files = new Map<string, Uint8Array>();
  // Implementation...
};
```

#### HTTP Capability (@servicejs/capability-http)

HTTP client operations:

```typescript
export interface HTTPCapability {
  /**
   * Make HTTP request
   */
  request(request: HTTPRequest): Promise<Result<HTTPResponse, HTTPError>>;

  /**
   * Convenience methods
   */
  get(url: string, options?: HTTPRequestOptions): Promise<Result<HTTPResponse, HTTPError>>;
  post(url: string, body: unknown, options?: HTTPRequestOptions): Promise<Result<HTTPResponse, HTTPError>>;
  put(url: string, body: unknown, options?: HTTPRequestOptions): Promise<Result<HTTPResponse, HTTPError>>;
  delete(url: string, options?: HTTPRequestOptions): Promise<Result<HTTPResponse, HTTPError>>;
}

export interface HTTPRequest {
  readonly url: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  readonly headers?: Record<string, string>;
  readonly body?: unknown;
  readonly timeout?: number;
}

export interface HTTPResponse {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly body: Uint8Array;
}

export interface HTTPError {
  readonly code: 'TIMEOUT' | 'NETWORK_ERROR' | 'INVALID_URL' | 'ABORTED';
  readonly message: string;
}

// Mock HTTP for testing
export const createMockHTTP = (): HTTPCapability & {
  addMockResponse(url: string, response: HTTPResponse): void;
} => {
  // Implementation...
};
```

#### Console Capability (@servicejs/capability-console)

Logging and console output:

```typescript
export interface ConsoleCapability {
  /**
   * Log at various levels
   */
  log(message: string, ...args: unknown[]): Result<void, ConsoleError>;
  info(message: string, ...args: unknown[]): Result<void, ConsoleError>;
  warn(message: string, ...args: unknown[]): Result<void, ConsoleError>;
  error(message: string, ...args: unknown[]): Result<void, ConsoleError>;
  debug(message: string, ...args: unknown[]): Result<void, ConsoleError>;
}

// Buffered console for testing
export const createBufferedConsole = (): ConsoleCapability & {
  getLogs(): Array<{ level: string; message: string; args: unknown[] }>;
  clear(): void;
} => {
  // Implementation...
};

// No-op console (silent)
export const createNoOpConsole = (): ConsoleCapability => {
  const noop = () => Ok(undefined);
  return { log: noop, info: noop, warn: noop, error: noop, debug: noop };
};
```

#### Streams Capability (@servicejs/capability-streams)

Standard streams (stdin/stdout/stderr):

```typescript
export interface StreamsCapability {
  readonly stdin?: ReadableStreamCapability;
  readonly stdout?: WritableStreamCapability;
  readonly stderr?: WritableStreamCapability;
}

export interface ReadableStreamCapability {
  read(size?: number): Promise<Result<Uint8Array, StreamError>>;
  close(): Promise<Result<void, StreamError>>;
}

export interface WritableStreamCapability {
  write(data: Uint8Array): Promise<Result<void, StreamError>>;
  flush(): Promise<Result<void, StreamError>>;
  close(): Promise<Result<void, StreamError>>;
}

export interface StreamError {
  readonly code: 'CLOSED' | 'EOF' | 'WRITE_ERROR' | 'READ_ERROR';
  readonly message: string;
}
```

#### Crypto Capability (@servicejs/capability-crypto)

Cryptographic operations:

```typescript
export interface CryptoCapability {
  /**
   * Generate random bytes
   */
  randomBytes(size: number): Result<Uint8Array, CryptoError>;

  /**
   * Generate random UUID (v4)
   */
  randomUUID(): Result<string, CryptoError>;

  /**
   * Hash data
   */
  hash(algorithm: HashAlgorithm, data: Uint8Array): Promise<Result<Uint8Array, CryptoError>>;

  /**
   * HMAC
   */
  hmac(algorithm: HashAlgorithm, key: Uint8Array, data: Uint8Array): Promise<Result<Uint8Array, CryptoError>>;
}

export type HashAlgorithm = 'sha256' | 'sha512';

export interface CryptoError {
  readonly code: 'UNSUPPORTED_ALGORITHM' | 'INVALID_SIZE' | 'CRYPTO_ERROR';
  readonly message: string;
}
```

### Runtime Packages

Each runtime package provides platform-specific implementations of capabilities and a `bootstrap` function:

#### Node.js Runtime (@servicejs/runtime-node)

```typescript
export interface NodeRuntimeCapabilities {
  readonly env: EnvironmentCapability;
  readonly time: TimeCapability;
  readonly lifecycle: LifecycleCapability;
  readonly fs: FileSystemCapability;
  readonly http: HTTPCapability;
  readonly console: ConsoleCapability;
  readonly streams: StreamsCapability;
  readonly crypto: CryptoCapability;
  readonly process: NodeProcessCapability;
}

export interface NodeProcessCapability {
  readonly pid: number;
  readonly ppid: number;
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly platform: string;
  readonly arch: string;
  exit(code: number): never;
  chdir(directory: string): Result<void, ProcessError>;
}

export interface NodeBootstrapOptions {
  captureShutdownSignals?: boolean;
  signals?: Partial<Record<NodeJS.Signals, boolean>>;
  captureUncaughtErrors?: boolean;
  captureUnhandledRejections?: boolean;
}

export function bootstrap(
  options?: NodeBootstrapOptions
): NodeRuntimeCapabilities {
  // Implementation wraps Node.js globals
}
```

#### Browser Runtime (@servicejs/runtime-browser)

```typescript
export interface BrowserRuntimeCapabilities {
  readonly env: EnvironmentCapability;
  readonly time: TimeCapability;
  readonly lifecycle: LifecycleCapability;
  readonly http: HTTPCapability; // Uses fetch
  readonly console: ConsoleCapability;
  readonly crypto: CryptoCapability; // Uses Web Crypto API
  readonly window: WindowCapability;
  readonly storage?: StorageCapability;
}

export interface WindowCapability {
  readonly location: LocationInfo;
  readonly dimensions: { width: number; height: number };
  readonly userAgent: string;
}

export interface StorageCapability {
  get(key: string): Result<Option<string>, StorageError>;
  set(key: string, value: string): Result<void, StorageError>;
  remove(key: string): Result<void, StorageError>;
  clear(): Result<void, StorageError>;
}

export function bootstrap(
  options?: BrowserBootstrapOptions
): BrowserRuntimeCapabilities {
  // Implementation wraps browser globals
}
```

#### Other Runtime Packages

- **@servicejs/runtime-node-worker**: Worker thread runtime (uses `parentPort`)
- **@servicejs/runtime-web-worker**: Web Worker runtime (uses `self`)
- **@servicejs/runtime-shared-worker**: Shared Worker runtime
- **@servicejs/runtime-service-worker**: Service Worker runtime (adds caches, fetch interception)
- **@servicejs/runtime-cloudflare**: Cloudflare Workers (per-request lifecycle, KV/R2/Durable Objects)
- **@servicejs/runtime-deno**: Deno runtime (uses `Deno` namespace)

### Usage Pattern

#### Bootstrap and Inject

```typescript
// main.ts (Node.js)
import { bootstrap } from '@servicejs/runtime-node';
import { createApp } from './app.js';

// Bootstrap runtime
const runtime = bootstrap({
  captureShutdownSignals: true,
  captureUncaughtErrors: true,
});

// Create and start app with injected capabilities
const app = createApp({
  env: runtime.env,
  time: runtime.time,
  lifecycle: runtime.lifecycle,
  fs: runtime.fs,
  http: runtime.http,
  console: runtime.console,
});

// Register shutdown handler
runtime.lifecycle.onShutdown(async (signal) => {
  runtime.console.log('Shutting down...', { reason: signal.reason });
  await app.shutdown();
  runtime.console.log('Shutdown complete');
});

// Start app
await app.start();
```

#### Application Code (Platform-Independent)

```typescript
// app.ts
import type { EnvironmentCapability, HTTPCapability } from '@servicejs/capability-env';
import type { HTTPCapability } from '@servicejs/capability-http';

export interface AppDependencies {
  readonly env: EnvironmentCapability;
  readonly http: HTTPCapability;
  // ... other capabilities
}

export function createApp(deps: AppDependencies) {
  // Application only sees capability interfaces
  // No direct access to process, window, etc.

  const apiUrl = deps.env.get('API_URL').unwrapOr('http://localhost:3000');

  return {
    async start() {
      const response = await deps.http.get(apiUrl);
      // Handle response...
    },
    async shutdown() {
      // Cleanup...
    },
  };
}
```

#### Testing with Mock Capabilities

```typescript
// app.test.ts
import { createApp } from './app.js';
import { createInMemoryEnv } from '@servicejs/capability-env';
import { createMockHTTP } from '@servicejs/capability-http';

test('app fetches from API', async () => {
  const mockEnv = createInMemoryEnv({ API_URL: 'http://test.local' });
  const mockHTTP = createMockHTTP();

  mockHTTP.addMockResponse('http://test.local', {
    status: 200,
    headers: {},
    body: new TextEncoder().encode('{"ok": true}'),
  });

  const app = createApp({ env: mockEnv, http: mockHTTP });
  await app.start();

  // Assert...
});
```

### Platform-Specific Features

When platform-specific features are needed, use type guards:

```typescript
import type { NodeRuntimeCapabilities } from '@servicejs/runtime-node';

function hasNodeProcess(
  runtime: unknown
): runtime is NodeRuntimeCapabilities {
  return (runtime as NodeRuntimeCapabilities).process !== undefined;
}

function main(runtime: RuntimeCapabilities) {
  // Common code works everywhere
  const apiKey = runtime.env.get('API_KEY');

  // Platform-specific code
  if (hasNodeProcess(runtime)) {
    console.log('Running in Node.js, PID:', runtime.process.pid);

    // Use Node-specific filesystem
    const config = await runtime.fs.readFile('./config.json');
  }
}
```

### Benefits

1. **Testability**: Mock capabilities trivially
2. **Security**: Explicit capability grants
3. **Portability**: Platform-agnostic application code
4. **Type Safety**: TypeScript enforces capability interfaces
5. **Graceful Degradation**: Optional capabilities with type guards
6. **No Ambient Authority**: All runtime access explicit

### Trade-offs

1. **Verbosity**: Must pass capabilities explicitly
2. **Bootstrap Overhead**: Initial setup more complex
3. **Learning Curve**: Different from direct global access

**Mitigation**:

- Helper factories reduce boilerplate
- Documentation provides clear patterns
- Type safety catches errors early

---

## Security Considerations

### Capability Discipline

1. **Never expose raw components** - Always return capabilities from factories
2. **Never use URNs for lookup** - URNs are for debugging, not addressing
3. **Validate at boundaries** - Use schema validation for network/worker boundaries
4. **Attenuate capabilities** - Grant minimal necessary permissions
5. **Time-limited capabilities** - Expire after timeout if needed
6. **Revocable capabilities** - Support revocation pattern

### Network Security

1. **Encrypt all network messages** - Use TLS or application-level encryption
2. **Authenticate all connections** - Token-based or cert-based auth
3. **Sign messages** - Cryptographic signatures prevent tampering
4. **Rate limiting** - Per-capability rate limits prevent DoS
5. **Audit logging** - Log all capability grants and uses

### Input Validation

1. **Validate at boundaries** - Network, worker, inter-process
2. **Use schemas** - Zod, Cap'n Proto, JSON Schema
3. **Sanitize untrusted input** - Prevent injection attacks
4. **Size limits** - Prevent memory exhaustion
5. **Timeout limits** - Prevent resource exhaustion

---

## Performance Considerations

### Local Transport

- **Zero-copy**: Pass immutable objects by reference
- **Direct calls**: Function call overhead only
- **Batching**: Process multiple messages in one tick

### Worker Transport

- **Structured clone**: Efficient serialization
- **Transferables**: Zero-copy for large data (ArrayBuffer, etc.)
- **Worker pooling**: Reuse workers to avoid spawn overhead

### Network Transport

- **Connection pooling**: Reuse TCP connections
- **Message batching**: Combine small messages
- **Compression**: Compress large payloads
- **Keep-alive**: Persistent connections

### Memory

- **Structural sharing**: JS engines optimize immutable updates
- **Content-addressed storage**: Automatic deduplication
- **Weak references**: Automatic cleanup of unused components
- **Snapshots**: Periodic state snapshots, discard old events

---

## Testing Strategy

### Unit Testing

```typescript
// Test pure reducers
test('counter increments', () => {
  const reducer = counterReducer;
  const result = reducer({ count: 0 }, { type: 'increment', amount: 5 });
  expect(result.state.count).toBe(5);
});
```

### Integration Testing

```typescript
// Test with mock transport
test('request-reply pattern', async () => {
  const transport = createMockTransport();
  // ... test full interaction
});
```

### Property Testing

```typescript
// Test mailbox ordering
test('FIFO mailbox preserves order', () => {
  fc.assert(
    fc.property(fc.array(fc.integer()), (messages) => {
      // ... verify order preserved
    })
  );
});
```

### Deterministic Testing

```typescript
// Control time and message delivery
const testRunner = createDeterministicTestRunner();
testRunner.send(message1);
testRunner.send(message2);
testRunner.advance(100); // Advance virtual time
testRunner.flush(); // Process all pending messages
```

---

## Future Work

### Short Term

- Complete observability (tracing, metrics)
- Visual debugging tools
- Network transport implementation
- Cap'n Proto serialization

### Medium Term

- Content-addressed storage
- Distributed consensus algorithms
- Actor mobility (migrate components)
- Formal verification tools

### Long Term

- Multi-language support (Go, Rust, Python)
- WebAssembly components
- Distributed transactions
- Query language for message traces

---

## Appendix: Example Application

Complete counter example:

```typescript
import {
  createComponent,
  createURN,
  stay,
  emitTo,
  type Reducer,
  type Message
} from '@servicejs/core';
import { createFIFOMailbox } from '@servicejs/mailbox';
import { sendRequest, replyWith } from '@servicejs/patterns';

// State
interface CounterState {
  count: number;
}

// Messages
interface IncrementMessage extends Message {
  type: 'increment';
  amount: number;
  replyTo: Capability<Result<number, never>>;
}

interface GetMessage extends Message {
  type: 'get';
  replyTo: Capability<Result<number, never>>;
}

type CounterMessage = IncrementMessage | GetMessage;

// Reducer
const counterReducer: Reducer<CounterState, CounterMessage> = (state, message) => {
  switch (message.type) {
    case 'increment': {
      const newCount = state.count + message.amount;
      return stay(
        { count: newCount },
        counterReducer,
        [replyWith(message.replyTo, Ok(newCount))]
      );
    }
    case 'get': {
      return stay(
        state,
        counterReducer,
        [replyWith(message.replyTo, Ok(state.count))]
      );
    }
  }
};

// Factory
const createCounter = (initialCount: number) => {
  const urn = generateURN('counter');
  const { component, capability } = createComponent(
    urn,
    { count: initialCount },
    counterReducer
  );

  // Wrap with mailbox
  const mailbox = createFIFOMailbox<CounterMessage>((msg) => component.reduce(msg));
  mailbox.start();

  // Return mailbox-wrapped capability
  const mailboxCapability: Capability<CounterMessage> = {
    send: (msg) => mailbox.enqueue(msg),
  };

  return mailboxCapability;
};

// Usage
const counter = createCounter(0);

const result = await sendRequest(counter, 'increment', { amount: 5 });
if (result.ok) {
  console.log(result.value); // 5
}
```

---

**End of Design Document**
