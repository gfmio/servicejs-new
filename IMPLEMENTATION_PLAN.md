# ServiceJS Implementation Plan

**Version:** 0.1.0
**Status:** Milestones 0-8 Complete + CAS (10.1) + Security (10.3) + Performance (10.4) + Documentation (10.5-10.6)
**Last Updated:** 2025-10-28

---

## Overview

This document outlines the complete implementation plan for ServiceJS, organized as milestones with detailed tasks. Each task includes implementation notes and checkboxes for tracking progress.

---

## Milestone 1: Project Infrastructure & Core Foundation

**Goal:** Set up the project structure, tooling, and implement the absolute core types.

**Estimated Effort:** 3-5 days

### 1.1 Project Setup

- [ ] **Initialize monorepo structure**
  - Create root `package.json` with workspace configuration
  - Set up bun workspaces
  - Configure TypeScript project references
  - Notes: Use `bun init` and workspace protocol for inter-package dependencies

- [ ] **Configure TypeScript**
  - Create root `tsconfig.json` with strict settings
  - Create base `tsconfig.base.json` for packages
  - Enable strict null checks, no implicit any, exact optional properties
  - Configure path aliases for imports
  - Notes: Use `"composite": true` for project references

- [ ] **Configure build tooling**
  - Set up tsup for each package
  - Create shared tsup config
  - Configure entry points, formats (ESM, CJS), and source maps
  - Add build scripts to root package.json
  - Notes: Use `tsup --format esm,cjs --dts` for dual format output

- [ ] **Configure testing**
  - Set up bun test
  - Create test utilities and helpers
  - Configure test coverage reporting
  - Add test scripts to root package.json
  - Notes: Use `bun test` built-in runner, aim for >90% coverage

- [ ] **Configure linting and formatting**
  - Set up ESLint with TypeScript rules
  - Configure Prettier
  - Add lint-staged and husky for pre-commit hooks
  - Add lint and format scripts
  - Notes: Use `@typescript-eslint/parser` and strict rules

- [ ] **Configure CI/CD**
  - Create GitHub Actions workflow for tests
  - Create workflow for build validation
  - Create workflow for linting
  - Add automatic dependency updates (Dependabot)
  - Notes: Run on PRs and main branch pushes

- [ ] **Create package structure**
  - Create `packages/hkt` directory (HKT foundation)
  - Create `packages/result` directory (Result type utility)
  - Create `packages/option` directory (Option type utility)
  - Create `packages/either` directory (Either type utility)
  - Create `packages/pure` directory (Pure function utilities)
  - Create `packages/core` directory
  - Create `packages/mailbox` directory
  - Create `packages/patterns` directory
  - Create `packages/transport` directory
  - Create `packages/lifecycle` directory
  - Create `packages/backpressure` directory
  - Create `packages/decorators` directory
  - Create `packages/schema` directory
  - Create `packages/testing` directory
  - Create `packages/tracing` directory
  - Create `examples` directory
  - Notes: Each package needs package.json, tsconfig.json, src/, tests/

- [ ] **Initialize package.json for each package**
  - Set up proper naming (`@servicejs/core`, etc.)
  - Configure exports for ESM/CJS
  - Set up peer dependencies
  - Add build/test scripts
  - Notes: Use workspace protocol for internal dependencies

- [ ] **Create initial documentation structure**
  - Create `docs/` directory
  - Create `docs/api/` for API documentation
  - Create `docs/guides/` for tutorials
  - Create `docs/examples/` for code examples
  - Add README.md to each package
  - Notes: Use TypeDoc for API docs generation

---

## Milestone 0: HKT Foundation & Type Utilities

**Goal:** Implement the Higher-Kinded Types foundation and basic type utilities that all other packages will build on.

**Estimated Effort:** 4-6 days

### 0.1 HKT Core (@servicejs/hkt-core)

- [x] **Implement HKTF namespace**
  - Define `ArgsSymbol`, `DefaultsSymbol`, `ResultSymbol` unique symbols
  - Define `HKTF.Base` interface
  - Implement `HKTF.Args<F>` type to extract merged args
  - Implement `HKTF.Result<F>` type to extract result
  - Implement `HKTF.Apply<F, Input>` for applying type functions
  - Implement `HKTF.PartialApply<F, NewDefaults>` for partial application
  - Implement `HKTF.ToFunction<F>` to derive runtime function signature
  - Notes: Pure type-level, zero runtime code ✅

- [x] **Implement Method namespace**
  - Define `Method.Base<Message, Result>` interface
  - Implement `Method.MessageOf<M>` type to extract message type
  - Notes: Methods are HKTFs specialized for message handling ✅

- [x] **Implement HKTO namespace**
  - Define `MethodsSymbol` unique symbol
  - Define `HKTO.Base` interface extending HKTF.Base
  - Implement `HKTO.Send<O, Message>` for message dispatch
  - Implement `SendToMethods` helper for tuple recursion
  - Implement `HKTO.Combine<Methods>` for composing methods into HKTO
  - Implement `ExtractMessages<Methods>` to extract all message types
  - Implement `HKTO.ToObject<O>` to derive runtime object type
  - Implement `MethodsToObject` helper for converting method tuple to object methods
  - Implement `MethodToObjectMethod` helper for single method conversion
  - Implement `ExtractMethodName` to extract method name from message type field
  - Notes: Core HKTO machinery, tuple-based composition ✅

- [x] **Implement Protocol namespace**
  - Implement `Protocol.ToReducer<O, State>` to convert HKTO to reducer signature
  - Implement `Protocol.Implements<Protocol, Impl>` to verify implementation
  - Notes: Bridge between HKTOs and ServiceJS reducers ✅

- [x] **Write tests for HKT core**
  - Test HKTF.Apply with various type functions
  - Test HKTF.PartialApply with defaults
  - Test HKTO.Send with message dispatch
  - Test HKTO.Combine with method tuples
  - Test HKTO.ToObject derives correct object type
  - Test Protocol.ToReducer derives correct reducer signature
  - Notes: Type-level tests implemented ✅

- [x] **Write HKT documentation**
  - Document HKTF concept and usage
  - Document HKTO concept and usage
  - Document Method pattern
  - Document Protocol helpers
  - Add examples (calculator, option, etc. from hkt.ts)
  - Notes: Comprehensive README.md created with detailed examples ✅

- [x] **Create HKT package exports**
  - Export all HKTF types from index.ts
  - Export all HKTO types from index.ts
  - Export all Method types from index.ts
  - Export all Protocol types from index.ts
  - Add JSDoc comments to all exports
  - Notes: Clean public API surface ✅

### 0.2 Result Type (@servicejs/result)

- [x] **Define Result HKT types**
  - Define `OkMap<T>` method type
  - Define `OkMapErr<T, E>` method type
  - Define `OkAndThen<T>` method type
  - Define `OkUnwrap<T>` method type
  - Define `OkUnwrapOr<T>` method type
  - Define `OkHKTO<T>` combining Ok methods
  - Define `ErrMap<E>` method type
  - Define `ErrMapErr<E>` method type
  - Define `ErrAndThen<E>` method type
  - Define `ErrUnwrap<E>` method type
  - Define `ErrUnwrapOr<E>` method type
  - Define `ErrHKTO<E>` combining Err methods
  - Define `ResultHKTO<T, E>` as union
  - Define `Ok` HKTF constructor type
  - Define `Err` HKTF constructor type
  - Notes: Complete type-level Result definition ✅

- [x] **Implement Result runtime**
  - Derive `Result<T, E>` type from `ResultHKTO<T, E>` using HKTO.ToObject
  - Derive `OkFunction` type from `Ok` HKTF using ToFunction
  - Derive `ErrFunction` type from `Err` HKTF using ToFunction
  - Implement `Ok` constructor matching OkFunction
  - Implement `Err` constructor matching ErrFunction
  - Implement `map` helper function
  - Implement `mapErr` helper function
  - Implement `andThen` helper function
  - Implement `unwrap` helper function
  - Implement `unwrapOr` helper function
  - Implement `isOk` type guard
  - Implement `isErr` type guard
  - Notes: Runtime matches type-level exactly ✅

- [x] **Write tests for Result type**
  - Test Ok construction and methods
  - Test Err construction and methods
  - Test map with Ok and Err
  - Test mapErr with Ok and Err
  - Test andThen chaining
  - Test unwrap success and failure
  - Test unwrapOr with defaults
  - Test isOk and isErr type guards
  - Test type inference throughout
  - Notes: Comprehensive test coverage ✅

- [x] **Write Result documentation**
  - Document Result type and philosophy
  - Document each method with examples
  - Document type guards
  - Document when to use Result vs Option vs Either
  - Add comparison to other error handling approaches
  - Notes: Complete README.md with Rust-style error handling examples ✅

### 0.3 Option Type (@servicejs/option)

- [x] **Define Option HKT types**
  - Define `SomeMap<T>` method type
  - Define `SomeFlatMap<T>` method type
  - Define `SomeFilter<T>` method type
  - Define `SomeGetOrElse<T>` method type
  - Define `SomeGet<T>` method type
  - Define `SomeHKTO<T>` combining Some methods
  - Define `NoneMap` method type
  - Define `NoneFlatMap` method type
  - Define `NoneFilter` method type
  - Define `NoneGetOrElse` method type
  - Define `NoneGet` method type
  - Define `NoneHKTO` combining None methods
  - Define `OptionHKTO<T>` as union
  - Define `Some` HKTF constructor type
  - Define `None` HKTF constructor type
  - Notes: Complete type-level Option definition ✅

- [x] **Implement Option runtime**
  - Derive `Option<T>` type from `OptionHKTO<T>` using HKTO.ToObject
  - Derive `SomeFunction` type from `Some` HKTF
  - Derive `NoneFunction` type from `None` HKTF
  - Implement `Some` constructor matching SomeFunction
  - Implement `None` constructor matching NoneFunction
  - Implement `map` helper function
  - Implement `flatMap` helper function
  - Implement `filter` helper function
  - Implement `getOrElse` helper function
  - Implement `get` helper function
  - Implement `isSome` type guard
  - Implement `isNone` type guard
  - Notes: Runtime matches type-level exactly ✅

- [x] **Write tests for Option type**
  - Test Some construction and methods
  - Test None construction and methods
  - Test map with Some and None
  - Test flatMap chaining
  - Test filter with predicate
  - Test getOrElse with defaults
  - Test get success and failure
  - Test isSome and isNone type guards
  - Test type inference throughout
  - Notes: Comprehensive test coverage ✅

- [x] **Write Option documentation**
  - Document Option type and philosophy
  - Document each method with examples
  - Document type guards
  - Document when to use Option vs Result
  - Add examples for common use cases (null handling, etc.)
  - Notes: Complete README.md with functional programming patterns ✅

### 0.4 Either Type (@servicejs/either)

- [x] **Define Either HKT types**
  - Define `LeftMap<L>` method type
  - Define `LeftMapRight<L>` method type
  - Define `LeftGet<L>` method type
  - Define `LeftHKTO<L>` combining Left methods
  - Define `RightMap<R>` method type
  - Define `RightMapLeft<R>` method type
  - Define `RightGet<R>` method type
  - Define `RightHKTO<R>` combining Right methods
  - Define `EitherHKTO<L, R>` as union
  - Define `Left` HKTF constructor type
  - Define `Right` HKTF constructor type
  - Notes: Complete type-level Either definition ✅

- [x] **Implement Either runtime**
  - Derive `Either<L, R>` type from `EitherHKTO<L, R>` using HKTO.ToObject
  - Derive `LeftFunction` type from `Left` HKTF
  - Derive `RightFunction` type from `Right` HKTF
  - Implement `Left` constructor matching LeftFunction
  - Implement `Right` constructor matching RightFunction
  - Implement `map` helper function (maps right)
  - Implement `mapLeft` helper function
  - Implement `isLeft` type guard
  - Implement `isRight` type guard
  - Notes: Runtime matches type-level exactly ✅

- [x] **Write tests for Either type**
  - Test Left construction and methods
  - Test Right construction and methods
  - Test map with Left and Right
  - Test mapLeft with Left and Right
  - Test isLeft and isRight type guards
  - Test type inference throughout
  - Notes: Comprehensive test coverage ✅

- [x] **Write Either documentation**
  - Document Either type and philosophy
  - Document each method with examples
  - Document type guards
  - Document when to use Either vs Result
  - Add examples for validation, parsing, etc.
  - Notes: Complete README.md with validation examples ✅

### 0.5 Pure Function Utilities (@servicejs/pure)

- [x] **Define pure function HKT types**
  - Define `Identity` HKTF type
  - Define `Const<A>` HKTF type
  - Define `Compose<F, G>` HKTF type
  - Define `Pipe<Fns>` HKTF type (tuple of functions)
  - Notes: Type-level pure function utilities ✅

- [x] **Implement pure function runtime**
  - Implement `identity<T>(x: T): T` function
  - Implement `constant<T>(x: T): () => T` function
  - Implement `compose<A, B, C>(f: (b: B) => C, g: (a: A) => B): (a: A) => C`
  - Implement `pipe` with overloads for 2-10 functions
  - Implement `curry` for currying functions
  - Implement `uncurry` for uncurrying functions
  - Implement `flip<A, B, C>(f: (a: A, b: B) => C): (b: B, a: A) => C`
  - Notes: Standard functional programming utilities ✅

- [x] **Write tests for pure functions**
  - Test identity with various types
  - Test constant creates constant function
  - Test compose chains functions correctly
  - Test pipe chains functions correctly
  - Test curry and uncurry
  - Test flip swaps arguments
  - Test type inference throughout
  - Notes: Comprehensive test coverage ✅

- [x] **Write pure function documentation**
  - Document each function with examples
  - Document type signatures
  - Document when to use each utility
  - Add examples of function composition
  - Notes: Complete README.md with functional programming patterns ✅

### 0.6 Type Utilities Integration

- [x] **Create type utilities comparison guide**
  - Table comparing Result, Option, Either
  - Decision tree for choosing appropriate type
  - Examples of each use case
  - Notes: Documentation included in individual package READMEs ✅

- [x] **Create comprehensive examples**
  - Result example: File operations with error handling
  - Option example: Null-safe user lookup
  - Either example: Validation with detailed errors
  - Pure functions example: Data transformation pipeline
  - Combined example: Using all utilities together
  - Notes: Examples included in package test files and READMEs ✅

- [x] **Write migration guide from standard TypeScript**
  - Comprehensive guide for converting `null | T` to `Option<T>`
  - Complete guide for converting `try/catch` to `Result<T, E>`
  - Full guide for converting validation to `Either<Error, T>`
  - Incremental migration strategy
  - Coexistence patterns for legacy code
  - Common patterns and examples
  - Notes: Complete migration guide in docs/MIGRATION_GUIDE.md ✅

---

## Milestone 1: Project Infrastructure & Core Foundation

**Goal:** Set up the project structure, tooling, and implement the core framework types built on HKT foundation.

**Estimated Effort:** 3-5 days

### 1.1 Core Types (@servicejs/core)

- [x] **Implement URN type**
  - Define `URN` interface with namespace, id, toString
  - Implement `createURN(namespace, id)` factory
  - Implement `parseURN(urn)` parser
  - Implement `safeCreateURN` with validation
  - Add `validateURN` for namespace and id format
  - Add `equalURN` for URN comparison
  - Add error handling for invalid URNs with URNError types
  - Notes: Uses regex validation, returns Result types ✅

- [x] **Write tests for URN type**
  - Test createURN with valid inputs
  - Test createURN with invalid inputs (empty, colons)
  - Test parseURN with valid URNs
  - Test parseURN with invalid URNs
  - Test safeCreateURN validation
  - Test validateURN validation
  - Test equalURN comparison
  - Notes: Comprehensive test coverage (94 tests total for core) ✅

- [x] **Implement Message type**
  - Define base `Message` interface with `type` field
  - Implement `createMessage<T, D>` factory
  - Implement `isMessageType` type guard
  - Implement `matchMessage` for pattern matching
  - Add `MessageOf<T, D>` type helper
  - Notes: Clean message type discrimination ✅

- [x] **Write tests for Message type**
  - Test message creation with createMessage
  - Test message type discrimination with isMessageType
  - Test pattern matching with matchMessage
  - Test TypeScript type inference
  - Notes: Type-safe message handling ✅

- [x] **Implement Capability type**
  - Define `Capability<TMsg>` interface with `send` method
  - Implement `createCapability` factory
  - Implement `mapCapability` transformer
  - Implement `filterCapability` for filtering messages
  - Implement `composeCapabilities` for composition
  - Implement `interceptCapability` for interception
  - Implement `nullCapability` for no-op
  - Notes: Complete capability API ✅

- [x] **Write tests for Capability type**
  - Test createCapability creates working capability
  - Test mapCapability transforms messages correctly
  - Test filterCapability filters messages
  - Test composeCapabilities chains transformations
  - Test interceptCapability intercepts messages
  - Test nullCapability does nothing
  - Notes: Full capability test coverage ✅

- [x] **Implement Effect type**
  - Define `Effect` union type (EmitEffect | BatchEffect | NoneEffect)
  - Implement `emitTo` helper for emitting to capabilities
  - Implement `batch` for combining effects
  - Implement `none` for no effects
  - Implement `executeEffect` to run single effect
  - Implement `executeEffects` to run effect array
  - Notes: Effects as data structures with execution ✅

- [x] **Write tests for Effect type**
  - Test emitTo creates correct effect
  - Test batch combines effects
  - Test none creates no-op effect
  - Test executeEffect runs single effect
  - Test executeEffects calls all send functions
  - Test executeEffects with empty array
  - Notes: Complete effect test coverage ✅

- [x] **Implement Reducer type**
  - Define `Reducer<TState, TMsg>` function type
  - Define `ReducerResult<TState, TMsg>` interface
  - Implement `stay` helper (same reducer)
  - Implement `become` helper (new reducer for session types)
  - Implement `initialResult` helper
  - Notes: Support session types via reducer replacement ✅

- [x] **Write tests for Reducer type**
  - Test stay returns correct structure
  - Test become for session type transitions
  - Test initialResult for initial state
  - Test effects are included in result
  - Notes: Reducer pattern fully tested ✅

- [x] **Implement Component type**
  - Define `Component<TState, TMsg>` interface
  - Implement `createComponent` factory
  - Component tracks state and reducer internally
  - Capability.send processes messages via reducer
  - Reducer results update state and execute effects
  - getState returns current state
  - getCapability returns capability
  - Notes: Complete component implementation with capability discipline ✅

- [x] **Write tests for Component type**
  - Test createComponent creates working component
  - Test capability.send processes messages
  - Test state updates correctly
  - Test reducer replacement (session types)
  - Test effects are executed
  - Test getState returns current state
  - Notes: Full component lifecycle tested ✅

- [x] **Create core package exports**
  - Export all types from index.ts
  - Export all factories and utilities
  - Add JSDoc comments to all exports
  - Export from urn.ts, message.ts, capability.ts, reducer.ts, effect.ts, component.ts
  - Notes: Clean public API surface ✅

- [x] **Write comprehensive core documentation**
  - Complete README.md with overview and philosophy
  - Document URN creation and usage with examples
  - Document Message and message types with pattern matching
  - Document Capability and composition utilities
  - Document Reducer and session types
  - Document Component lifecycle and state management
  - Document Effect types and execution
  - Add code examples for each concept
  - Notes: Comprehensive README with all core concepts ✅

### 1.3 Documentation and Examples

- [x] **Write core concepts guide**
  - Complete explanation of messages and message passing
  - Detailed explanation of capabilities and security model
  - Comprehensive guide to reducers and pure functions
  - Clear explanation of effects and side effects
  - Full guide to session types and protocol evolution
  - Complete task manager example
  - Beginner-friendly with code examples
  - Notes: Complete core concepts guide in docs/CORE_CONCEPTS.md ✅

- [x] **Create minimal counter example**
  - Simple counter with increment/decrement/reset/getCount
  - Uses only core types (no mailbox)
  - Demonstrates reducer pattern and pure functions
  - Demonstrates capability usage and encapsulation
  - Detailed comments and explanations
  - Runnable with bun
  - Notes: Complete example in packages/core/examples/counter.ts ✅

- [x] **Create session types example**
  - Three state machines: Traffic Light, Door Lock, Connection Protocol
  - Demonstrates reducer replacement with become()
  - Demonstrates type-safe state transitions
  - Shows error handling in different states
  - Complete with async state transitions
  - Notes: Comprehensive examples in packages/core/examples/sessionTypes.ts ✅

---

## Milestone 2: Standard Utilities - Mailboxes

**Goal:** Implement mailbox abstractions for controlling message execution semantics.

**Estimated Effort:** 3-4 days

**Status:** ✅ Complete - All mailbox types implemented with tests and documentation

### 2.1 Mailbox Interfaces

- [x] **Define mailbox interfaces**
  - Define `FIFOMailbox<TMsg>` interface with enqueue, dequeue, peek, size, isEmpty, clear
  - Define `PriorityMailbox<TMsg>` interface with same methods
  - Define `BoundedMailbox<TMsg>` interface with additional capacity, isFull, available
  - Define `EnqueueResult` type for bounded mailbox (success/failure with reason)
  - Notes: Each mailbox type has its own interface ✅

- [x] **Write mailbox interface documentation**
  - Document mailbox concept and use cases
  - Document each mailbox type
  - Add examples of mailbox usage
  - Add comparison guide for choosing mailbox type
  - Notes: Comprehensive README.md with all three types ✅

### 2.2 FIFO Mailbox

- [x] **Implement FIFO mailbox**
  - Create `createFIFOMailbox` factory
  - Implement internal message queue using array
  - Implement enqueue (push)
  - Implement dequeue (shift) returning Option
  - Implement peek returning Option
  - Implement size, isEmpty, clear
  - Notes: Simple FIFO queue, O(1) enqueue/dequeue ✅

- [x] **Write tests for FIFO mailbox**
  - Test enqueue adds to queue
  - Test dequeue removes in order (FIFO)
  - Test peek doesn't remove message
  - Test dequeue on empty returns None
  - Test size returns correct queue depth
  - Test isEmpty works correctly
  - Test clear empties queue
  - Notes: 13 tests for FIFO mailbox ✅

- [x] **Write FIFO mailbox documentation**
  - Document use cases (stateful components, event processing)
  - Document ordering guarantees (FIFO)
  - Document API methods
  - Add usage examples
  - Notes: Complete documentation in README.md ✅

### 2.3 Priority Mailbox

- [x] **Define priority mechanism**
  - Accept `getPriority: (message: TMsg) => number` function
  - Higher priority = processed first
  - Equal priority = FIFO within priority level
  - Notes: Flexible priority extraction ✅

- [x] **Implement priority mailbox**
  - Create `createPriorityMailbox` factory
  - Implement priority queue with insertion sort
  - Ensure highest priority processed first
  - Maintain FIFO for equal priorities
  - Implement all mailbox methods
  - Notes: O(n) enqueue (insertion), O(1) dequeue ✅

- [x] **Write tests for priority mailbox**
  - Test high priority processed before low
  - Test equal priority processed FIFO
  - Test multiple priority levels
  - Test all mailbox methods work correctly
  - Notes: 13 tests for priority mailbox ✅

- [x] **Write priority mailbox documentation**
  - Document use cases (task scheduling, alert systems)
  - Document priority semantics (higher first)
  - Document equal priority behavior (FIFO)
  - Add usage examples
  - Notes: Warn about starvation risk in README ✅

### 2.4 Bounded Mailbox

- [x] **Define EnqueueResult type**
  - Define `{ success: true }` for successful enqueue
  - Define `{ success: false, reason: 'full' }` for capacity exceeded
  - Notes: Type-safe result handling ✅

- [x] **Implement bounded mailbox**
  - Create `createBoundedMailbox(maxCapacity)` factory
  - Implement capacity checking on enqueue
  - Return EnqueueResult instead of void
  - Implement isFull() method
  - Implement available() method
  - Implement capacity() method
  - Notes: Backpressure via capacity limits ✅

- [x] **Write tests for bounded mailbox**
  - Test capacity is enforced
  - Test enqueue returns success when not full
  - Test enqueue returns failure when full
  - Test isFull() works correctly
  - Test available() returns remaining capacity
  - Test all mailbox methods work correctly
  - Notes: 12 tests for bounded mailbox ✅

- [x] **Write bounded mailbox documentation**
  - Document use cases (backpressure, resource limits, memory protection)
  - Document EnqueueResult type
  - Document capacity methods
  - Add usage examples including overflow handling
  - Notes: Recommend bounded for production ✅

### 2.5 Async Mailbox

- [x] **Implement async mailbox**
  - Create `createAsyncMailbox` factory
  - Accept async handler via `start(handler)` method
  - Implement async processing loop with start/stop
  - Ensure sequential processing (awaits each message)
  - Handle errors in async handlers gracefully
  - Add `isRunning()` to check processing state
  - Messages can be enqueued while processing
  - Notes: Complete async mailbox with graceful shutdown ✅

- [x] **Write tests for async mailbox**
  - Test async handlers are awaited
  - Test messages processed sequentially (not concurrently)
  - Test errors don't crash mailbox (continues processing)
  - Test stop waits for current message to complete
  - Test messages can be added while processing
  - Test start throws error when already running
  - Test graceful shutdown behavior
  - Notes: 12 comprehensive tests covering all scenarios ✅

- [x] **Write async mailbox documentation**
  - Document use cases (I/O operations, API calls, database queries)
  - Document error handling (continues after errors)
  - Document start/stop lifecycle
  - Add usage examples with API requests and database operations
  - Notes: Complete documentation in README.md ✅

### 2.6 Mailbox Integration

- [x] **Create mailbox utility helpers**
  - Implement `wrapComponentWithMailbox` helper
  - Implement `createMailboxCapability` helper
  - Implement `createAutoProcessingCapability` helper
  - Support options: autoProcess, batchSize
  - Provide processMessages() and processBatch(count) functions
  - Notes: Complete helper utilities for easy component integration ✅

- [x] **Write integration tests**
  - Test FIFO mailbox with component (sequential processing)
  - Test priority mailbox with component (priority-based execution)
  - Test bounded mailbox with component (backpressure handling)
  - Test component with effects and mailbox
  - Test auto-processing wrapper
  - Test multiple components with separate mailboxes
  - Test component state machines with mailboxes
  - Notes: 8 comprehensive integration tests ✅

- [x] **Create mailbox comparison guide**
  - Table comparing mailbox types
  - Decision tree for choosing mailbox
  - Performance characteristics (O notation)
  - Notes: Complete comparison in README.md ✅

- [x] **Write comprehensive mailbox examples**
  - FIFO mailbox examples (producer-consumer, buffering)
  - Priority mailbox examples (task scheduling, alerts)
  - Bounded mailbox examples (backpressure handling, overflow strategies)
  - Async mailbox examples (I/O operations, API requests, database queries)
  - Helper utility examples (component integration, auto-processing)
  - Notes: 7 complete example files in examples/ directory ✅

### Mailbox Summary

**Status:** ✅ Complete - All mailbox types and utilities implemented

**Packages Completed:**

- FIFO Mailbox - O(1) enqueue/dequeue, standard queue
- Priority Mailbox - O(n) enqueue, O(1) dequeue, priority-based
- Bounded Mailbox - O(1) operations, capacity-limited with backpressure
- Async Mailbox - Sequential async processing for I/O operations (NEW)
- Helper Utilities - Easy component integration (NEW)

**Test Coverage:**

- FIFO: 13 tests ✅
- Priority: 13 tests ✅
- Bounded: 12 tests ✅
- Async: 12 tests ✅
- Helpers: 11 tests ✅
- Integration: 8 tests ✅
- **Total: 62 tests passing**

**Documentation:**

- Complete README.md with all mailbox types
- API reference for all methods
- Performance characteristics (O notation)
- 7 example files with 20+ examples
- Integration examples with components

---

## Milestone 3: Communication Patterns

**Goal:** Implement common communication patterns built on core primitives.

**Estimated Effort:** 4-5 days

**Status:** ✅ Complete - Request/Reply and Pub/Sub implemented as separate packages

**Note:** Communication patterns were implemented as separate packages instead of a single @servicejs/patterns package:

- @servicejs/request-reply - RPC-style request-response messaging
- @servicejs/pub-sub - Topic-based publish/subscribe messaging

### 3.1 Request/Reply Pattern (@servicejs/request-reply)

- [x] **Define request/reply message types**
  - Define `RequestMessage<TRequest, TResponseMsg>` interface with correlationId, replyTo, request
  - Define `ResponseMessage<TResponse>` interface with correlationId, response
  - Define `PendingRequest<TResponse>` interface for tracking in-flight requests
  - Define `RequestReplyError` type (TIMEOUT | CANCELLED)
  - Notes: Generic over request and response types ✅

- [x] **Implement request message factory**
  - Create `createRequestReply` factory
  - Accept request payload and response capability
  - Generate unique correlation ID
  - Create request message with replyTo capability
  - Return both request message and pending request tracker
  - Notes: Complete request creation ✅

- [x] **Implement async response waiting**
  - Create `waitForResponse` async function
  - Accept pending request and timeout (ms)
  - Poll for response with configurable interval
  - Return Result<TResponse, RequestReplyError>
  - Handle timeout by returning TIMEOUT error
  - Handle cancellation by returning CANCELLED error
  - Notes: Async/await integration ✅

- [x] **Implement reply helper**
  - Create `createReply` helper
  - Accept request message and response payload
  - Return response message with matching correlation ID
  - Notes: Makes replying ergonomic in reducers ✅

- [x] **Write tests for request/reply**
  - Test successful request/reply (correlation ID matching)
  - Test timeout handling
  - Test cancellation handling
  - Test multiple concurrent requests
  - Test pending request state tracking
  - Notes: 9 tests covering all scenarios ✅

- [x] **Write request/reply documentation**
  - Document request/reply pattern and use cases
  - Document timeout behavior
  - Document cancellation support
  - Document correlation ID matching
  - Add usage examples (both client and server)
  - Notes: Complete README.md with RPC examples ✅

- [x] **Create request/reply examples**
  - Basic request/reply example
  - Timeout handling example
  - Cancellation example
  - Error handling example
  - Multiple concurrent requests example
  - Notes: Comprehensive examples in examples/ directory ✅

### 3.2 Pub/Sub Pattern (@servicejs/pub-sub)

- [x] **Define pub/sub interfaces**
  - Define `PubSub<TMsg>` interface with subscribe, publish, unsubscribe
  - Define `Subscription` interface with topic, unsubscribe, isActive
  - Add subscriberCount and topics methods
  - Add clear method for cleanup
  - Notes: Topic-based messaging API ✅

- [x] **Implement pub/sub broker**
  - Create `createPubSub` factory
  - Implement subscribe with topic and capability
  - Implement publish to send to all subscribers on topic
  - Return number of subscribers that received message
  - Implement unsubscribe to remove subscription
  - Handle subscription lifecycle and cleanup
  - Notes: Uses Map<topic, Set<subscriber>> for storage ✅

- [x] **Implement subscription management**
  - Track active/inactive subscriptions
  - Auto-cleanup empty topic sets
  - Implement subscription.unsubscribe() method
  - Implement subscription.isActive() method
  - Prevent memory leaks from orphaned subscriptions
  - Notes: Complete subscription lifecycle ✅

- [x] **Write tests for pub/sub**
  - Test subscribe adds subscription
  - Test publish sends to all subscribers
  - Test unsubscribe removes subscription
  - Test multiple subscriptions per topic
  - Test publish to non-existent topic (returns 0)
  - Test subscription cleanup
  - Test subscriberCount and topics methods
  - Notes: 19 tests covering all functionality ✅

- [x] **Write pub/sub documentation**
  - Document pub/sub pattern and use cases
  - Document topic naming conventions (hierarchical, flat, action-based, domain-based)
  - Document subscription management
  - Add usage examples (event bus, multiple subscribers, dynamic subscriptions)
  - Add monitoring and debugging examples
  - Notes: Complete README.md with comprehensive guide ✅

- [x] **Create pub/sub examples**
  - Basic pub/sub example
  - Multiple subscribers example
  - Multiple topics example
  - Dynamic subscriptions example
  - Event bus pattern example
  - Cleanup example
  - Notes: 6 complete examples in examples/ directory ✅

### 3.3 Supervision Pattern

- [x] **Define supervision types** ✅
  - Define `SupervisionStrategy` union type
  - Add 'restart', 'stop', 'escalate' strategies
  - Define `SupervisorConfig` interface
  - Define `ErrorNotification` message type
  - Define `Supervisor` interface
  - Notes: Based on Erlang/Akka supervision

- [x] **Implement supervisor** ✅
  - Create `createSupervisor` factory
  - Implement registerChild with URN and restart function
  - Implement unregisterChild
  - Implement notifyError with strategy handling
  - Track retry counts per child
  - Implement retry delays
  - Handle max retries exceeded
  - Notes: Stateful supervisor component

- [x] **Implement restart strategy** ✅
  - Call restart function on error
  - Increment retry count
  - Respect retry delay
  - Stop after max retries
  - Notes: Most common strategy (23 tests)

- [x] **Implement stop strategy** ✅
  - Unregister child on error
  - Send error notification
  - Notes: Simplest strategy

- [x] **Implement escalate strategy** ✅
  - Send error to parent supervisor
  - Stop child
  - Notes: For hierarchical supervision

- [x] **Write tests for supervision** ✅
  - Test restart strategy restarts child
  - Test retry count and max retries
  - Test retry delay timing
  - Test stop strategy stops child
  - Test escalate strategy notifies parent
  - Test error notification sent
  - Notes: Real timers used (23 tests)

- [x] **Write supervision documentation** ✅
  - Document supervision patterns
  - Document each strategy
  - Document supervision hierarchies
  - Add usage examples
  - Notes: Complete README with error recovery philosophy

- [x] **Create supervision example** ✅
  - Implement failing component
  - Implement supervisor with restart
  - Demonstrate automatic recovery
  - Show supervision hierarchy
  - Notes: 9 comprehensive examples (supervision.ts)

### 3.4 Pattern Integration

- [x] **Create pattern combination examples**
  - Request/reply with pub/sub (worker processes tasks and publishes events)
  - Supervision with request/reply (supervised worker pool with automatic restart)
  - All patterns together (complete task processing system)
  - Three comprehensive examples demonstrating pattern composition
  - Notes: Complete examples in examples/pattern-integration.ts ✅

- [x] **Write patterns comparison guide**
  - Compare request/reply vs pub/sub vs direct capability
  - Document when to use each pattern
  - Add comparison table in pub/sub README
  - Notes: Complete comparison guide in README.md ✅

### Summary of Completed Work

**Packages Implemented:**

- @servicejs/core - Complete core framework (URN, Message, Capability, Reducer, Effect, Component)
- @servicejs/mailbox - Four mailbox types (FIFO, Priority, Bounded, Async) + Helper utilities
- @servicejs/request-reply - RPC-style request-response pattern
- @servicejs/pub-sub - Topic-based publish/subscribe pattern
- @servicejs/supervision - Erlang/Akka-style supervision (restart, stop, escalate strategies)
- @servicejs/lifecycle - Lifecycle hooks, shutdown coordination, resource management (RAII)
- @servicejs/flow-control - Backpressure, circuit breaker, rate limiting, batching
- @servicejs/transport - Location-transparent transports (Local, Worker, Network/WebSocket)

**Test Coverage:**

- Core: 94 tests passing ✅
- Mailbox: 62 tests passing (13 FIFO + 13 Priority + 12 Bounded + 12 Async + 11 Helpers + 8 Integration) ✅
- Request-Reply: 9 tests passing ✅
- Pub-Sub: 19 tests passing ✅
- Supervision: 23 tests passing ✅
- Lifecycle: 42 tests passing (17 Lifecycle + 13 Shutdown + 12 Resources) ✅
- Flow Control: 42 tests passing (7 Async + 13 Circuit Breaker + 14 Rate Limiter + 8 Batching) ✅
- Transport: 47 tests passing (13 Serialization + 12 Local + 11 Worker + 14 Network) ✅
- **Total: 338 tests passing**

**Integration Examples:**

- Counter with FIFO mailbox ✅
- Task scheduler with priority mailbox ✅
- Key-value store with request/reply ✅
- Event bus with pub/sub ✅
- Complete task management application (all patterns together) ✅

**Documentation:**

- Complete README.md for all seven packages ✅
- Comprehensive API documentation with examples ✅
- Usage patterns and best practices ✅
- 20+ example files with 99+ working examples ✅
- Integration examples demonstrating real-world usage ✅

**Package Structure:**

- All packages follow one export per file pattern ✅
- Consistent package.json structure ✅
- TypeScript with strict type checking ✅
- ESM module exports ✅

---

## Milestone 4: Lifecycle and Resource Management

**Goal:** Implement optional lifecycle patterns and resource management utilities.

**Estimated Effort:** 2-3 days

### 4.1 Lifecycle Hooks

- [x] **Define lifecycle interfaces** ✅
  - Define `LifecycleHooks` interface
  - Add optional `onInit` async method
  - Add optional `onShutdown` async method
  - Define `ManagedComponent` interface extending Component
  - Notes: Opt-in lifecycle support

- [x] **Implement lifecycle wrapper** ✅
  - Create `withLifecycle` function
  - Wrap component with lifecycle hooks
  - Return `ManagedComponent` with init/shutdown methods
  - Ensure hooks are called appropriately
  - Notes: Decorator pattern

- [x] **Write tests for lifecycle** ✅
  - Test onInit is called
  - Test onShutdown is called
  - Test component works without hooks
  - Test async hooks are awaited
  - Test errors in hooks
  - Notes: Test both with and without hooks (17 tests)

- [x] **Write lifecycle documentation** ✅
  - Document lifecycle hooks
  - Document when to use lifecycle
  - Add usage examples
  - Notes: Explain relationship to messages

### 4.2 Shutdown Coordinator

- [x] **Define shutdown coordinator interface** ✅
  - Define `ShutdownCoordinator` interface
  - Add `register` method for components
  - Add `shutdown` method to shutdown all
  - Notes: Centralized shutdown management

- [x] **Implement shutdown coordinator** ✅
  - Create `createShutdownCoordinator` factory
  - Implement register to add components
  - Implement shutdown to call all shutdowns in reverse order
  - Handle shutdown errors (continueOnError, timeout options)
  - Notes: Array of components, reverse iteration (LIFO)

- [x] **Write tests for shutdown coordinator** ✅
  - Test register adds components
  - Test shutdown calls all shutdowns
  - Test shutdown order (reverse registration)
  - Test shutdown error handling
  - Notes: Test with mock components (13 tests)

- [x] **Write shutdown documentation** ✅
  - Document shutdown coordinator
  - Document shutdown order guarantees
  - Add usage example
  - Notes: Application-level shutdown

### 4.3 Resource Management

- [x] **Define resource management types** ✅
  - Define `Resource` interface with cleanup
  - Define `ResourceOwner` interface
  - Notes: For components owning resources

- [x] **Implement resource helpers** ✅
  - Create `withResource` helper (RAII pattern)
  - Create `createResourceOwner` for multiple resources
  - Implement automatic cleanup with LIFO order
  - Notes: RAII pattern with error handling

- [x] **Write tests for resource management** ✅
  - Test resources are cleaned up
  - Test cleanup on shutdown
  - Test error handling in acquire and cleanup
  - Notes: Test with mock resources (12 tests)

- [x] **Write resource management documentation** ✅
  - Document resource management patterns
  - Document cleanup best practices
  - Add usage examples
  - Notes: File handles, connections, transactions

### 4.4 Lifecycle Examples

- [x] **Create lifecycle example** ✅
  - Component with database connection simulation
  - Initialize connection on init
  - Close connection on shutdown
  - Error handling demonstrations
  - Notes: Realistic resource management (lifecycle.ts)

- [x] **Create shutdown coordinator example** ✅
  - Multiple service components
  - Coordinated shutdown in reverse order
  - Error handling strategies (continueOnError)
  - Timeout handling
  - Notes: Application-level shutdown (shutdown.ts)

- [x] **Create resource management example** ✅
  - File operations with automatic cleanup
  - Multiple resource management with ResourceOwner
  - RAII pattern with withResource
  - Database transaction pattern
  - Notes: Complete RAII demonstrations (resources.ts)

### Summary of Milestone 4

**Package Implemented:**

- @servicejs/lifecycle - Complete lifecycle and resource management system

**Features:**

- **Lifecycle Hooks**: withLifecycle() wrapper with onInit/onShutdown hooks
- **Shutdown Coordinator**: createShutdownCoordinator() for graceful multi-component shutdown
- **Resource Management**: withResource() RAII pattern and createResourceOwner() for multiple resources
- **Error Handling**: Comprehensive error types (LifecycleError, ShutdownError, ResourceError)
- **LIFO Cleanup**: Automatic reverse-order cleanup for both shutdown and resources

**Test Coverage:**

- Lifecycle hooks: 17 tests passing ✅
- Shutdown coordinator: 13 tests passing ✅
- Resource management: 12 tests passing ✅
- **Total: 42 tests passing**

**Examples:**

- lifecycle.ts - Database connection lifecycle with hooks (5 examples)
- shutdown.ts - Coordinated multi-component shutdown (5 examples)
- resources.ts - RAII pattern with files, transactions (9 examples)
- **Total: 19 examples demonstrating lifecycle patterns**

**Documentation:**

- Complete README.md with API reference ✅
- Usage patterns and best practices ✅
- Error handling strategies ✅
- Performance characteristics ✅

---

## Milestone 5: Backpressure and Flow Control

**Goal:** Implement backpressure mechanisms and flow control utilities.

**Estimated Effort:** 3-4 days

### 5.1 Async Capability

- [x] **Define async capability interface** ✅
  - Define `AsyncCapability<TMsg>` interface
  - Add `sendAsync(message)` returning Promise<void>
  - Notes: Async variant of Capability

- [x] **Implement async capability** ✅
  - Create `createAsyncCapability` factory
  - Accept mailbox and max queue size
  - Implement sendAsync that waits when queue full
  - Poll queue size until below threshold
  - Notes: Simple backpressure via polling

- [x] **Write tests for async capability** ✅
  - Test sendAsync resolves when sent
  - Test sendAsync waits when queue full
  - Test sendAsync resumes when space available
  - Test multiple concurrent sendAsync
  - Notes: Test backpressure behavior (7 tests)

- [x] **Write async capability documentation** ✅
  - Document backpressure mechanism
  - Document use cases
  - Add usage example
  - Notes: Explain when to use async send

### 5.2 Circuit Breaker

- [x] **Define circuit breaker types** ✅
  - Define `CircuitState` union type: 'closed' | 'open' | 'half-open'
  - Define `CircuitBreakerConfig` interface
  - Add failure threshold
  - Add reset timeout
  - Add optional state change callback
  - Notes: Classic circuit breaker pattern

- [x] **Implement circuit breaker** ✅
  - Create `createCircuitBreaker` factory
  - Wrap capability with circuit breaker logic
  - Track failure count
  - Implement state transitions
  - Return error when circuit open
  - Implement half-open retry logic
  - Notes: Fail fast when downstream broken

- [x] **Write tests for circuit breaker** ✅
  - Test circuit closes on success
  - Test circuit opens after threshold failures
  - Test circuit stays open until timeout
  - Test circuit transitions to half-open
  - Test half-open success closes circuit
  - Test half-open failure reopens circuit
  - Notes: Test all state transitions (13 tests)

- [x] **Write circuit breaker documentation** ✅
  - Document circuit breaker pattern
  - Document state machine
  - Add usage example
  - Notes: Explain failure handling

### 5.3 Rate Limiting

- [x] **Define rate limiter types** ✅
  - Define `RateLimiterConfig` interface
  - Add requests per window
  - Add window duration
  - Add optional overflow strategy (drop/error)
  - Notes: Token bucket algorithm

- [x] **Implement rate limiter** ✅
  - Create `createRateLimiter` factory
  - Wrap capability with rate limiting logic
  - Implement token bucket algorithm
  - Drop or error messages when limited
  - Reset tokens per window
  - Notes: Simple rate limiting

- [x] **Write tests for rate limiter** ✅
  - Test allows messages under limit
  - Test blocks messages over limit
  - Test resets after window
  - Test token refill
  - Notes: Real timers used (14 tests)

- [x] **Write rate limiter documentation** ✅
  - Document rate limiting pattern
  - Document configuration
  - Add usage example
  - Notes: API rate limiting use case

### 5.4 Batching

- [x] **Define batching types** ✅
  - Define `BatchingConfig` interface
  - Add max batch size
  - Add max batch delay
  - Notes: Batch messages for efficiency

- [x] **Implement batching capability** ✅
  - Create `createBatchingCapability` factory
  - Accumulate messages in buffer
  - Flush on max size or max delay
  - Send batch as array message
  - Notes: Optimization for high throughput

- [x] **Write tests for batching** ✅
  - Test batches on max size
  - Test batches on max delay
  - Test partial batches
  - Test empty batches
  - Notes: Real timers used (8 tests)

- [x] **Write batching documentation** ✅
  - Document batching pattern
  - Document use cases (bulk operations)
  - Add usage example
  - Notes: Network efficiency

### 5.5 Flow Control Examples

- [x] **Create backpressure example** ✅
  - Fast producer, slow consumer
  - Demonstrate async send with backpressure
  - Show queue depth management
  - Notes: Producer/consumer pattern (backpressure.ts, 5 examples)

- [x] **Create circuit breaker example** ✅
  - Unreliable downstream service
  - Demonstrate failure detection
  - Show recovery after timeout
  - Notes: Resilient microservices (circuitBreaker.ts, 8 examples)

- [x] **Create rate limiting example** ✅
  - API client with rate limiting
  - Demonstrate request throttling
  - Show token bucket behavior
  - Notes: External API integration (rateLimiting.ts, 9 examples)

- [x] **Create batching example** ✅
  - Bulk database operations
  - Network request batching
  - Time and size-based flushing
  - Notes: High-throughput patterns (batching.ts, 9 examples)

### Summary of Milestone 5

**Package Implemented:**

- @servicejs/flow-control - Complete backpressure and flow control system

**Features:**

- **Async Capability**: Backpressure via async send with queue monitoring and polling
- **Circuit Breaker**: Three-state pattern (closed/open/half-open) with automatic recovery
- **Rate Limiter**: Token bucket algorithm with drop/error overflow strategies
- **Batching**: Time and size-based batching for efficiency and throughput

**Test Coverage:**

- Async capability: 7 tests passing ✅
- Circuit breaker: 13 tests passing ✅
- Rate limiter: 14 tests passing ✅
- Batching: 8 tests passing ✅
- **Total: 42 tests passing**

**Examples:**

- backpressure.ts - Producer-consumer patterns with backpressure (5 examples)
- circuitBreaker.ts - Circuit breaker states and recovery (8 examples)
- rateLimiting.ts - Rate limiting strategies and monitoring (9 examples)
- batching.ts - Batch accumulation and flushing patterns (9 examples)
- **Total: 31 examples demonstrating flow control patterns**

**Documentation:**

- Complete README.md with API reference ✅
- Usage patterns and best practices ✅
- Error handling strategies ✅
- Performance characteristics ✅
- Pattern combination examples ✅

---

## Milestone 6: Transport Layer

**Goal:** Implement location-transparent transports for local, worker, and network communication.

**Estimated Effort:** 5-6 days

### 6.1 Transport Interface

- [x] **Define transport interface**
  - ✅ Define `Transport` interface
  - ✅ Add `connect()` async method
  - ✅ Add `disconnect()` async method
  - ✅ Add `send(envelope)` method
  - ✅ Add `onReceive(handler)` method
  - ✅ Add `onError(handler)` method
  - ✅ Add `isConnected()` method
  - ✅ Add `getLocalUrn()` method
  - Notes: Generic transport abstraction with Result types

- [x] **Define transport factory type**
  - ✅ Define `TransportFactory` type
  - ✅ Accept configuration
  - ✅ Return Transport instance
  - Notes: For dependency injection

- [x] **Define message envelope**
  - ✅ Define `MessageEnvelope` interface
  - ✅ Add `from`, `to`, `message` fields
  - ✅ Add optional `correlationId` and `timestamp`
  - Notes: Standardized message format

- [x] **Define serialization interface**
  - ✅ Define `Serializer` interface
  - ✅ Implement JSON serializer
  - ✅ Implement structured clone serializer
  - Notes: Pluggable serialization

- [x] **Write transport interface documentation**
  - ✅ Document transport concept
  - ✅ Document each method
  - ✅ Document error types
  - Notes: Complete API documentation in README

### 6.2 Local Transport

- [x] **Implement local transport**
  - ✅ Create `createLocalTransport` factory
  - ✅ Store transports in local registry
  - ✅ Implement send as direct message delivery (no serialization)
  - ✅ Implement connect/disconnect lifecycle
  - ✅ Implement error handling
  - Notes: Zero overhead, direct references, synchronous delivery

- [x] **Write tests for local transport**
  - ✅ Test send delivers message
  - ✅ Test connect/disconnect lifecycle
  - ✅ Test send to unregistered URN fails
  - ✅ Test multiple transports
  - ✅ Test error handling
  - ✅ Test correlation ID and timestamp
  - Notes: 12 comprehensive tests

- [x] **Write local transport documentation**
  - ✅ Document local transport
  - ✅ Document performance characteristics
  - ✅ Add 8 usage examples
  - Notes: Comprehensive examples in localTransport.ts

### 6.3 Worker Transport (Web Workers)

- [x] **Implement worker transport**
  - ✅ Create `createWorkerTransport` factory
  - ✅ Accept Worker instance
  - ✅ Implement send via postMessage
  - ✅ Implement onReceive for incoming messages
  - ✅ Handle worker message events
  - ✅ Implement connect/disconnect lifecycle
  - ✅ Handle serialization errors
  - Notes: Uses pluggable serializers (JSON or structured clone)

- [x] **Implement worker message protocol**
  - ✅ Use MessageEnvelope format
  - ✅ Include from/to URNs
  - ✅ Include message payload
  - ✅ Handle serialization/deserialization errors
  - Notes: Standardized protocol with error handling

- [x] **Write tests for worker transport**
  - ✅ Test send posts message
  - ✅ Test receive from worker
  - ✅ Test serialization/deserialization
  - ✅ Test error handling
  - ✅ Test connect/disconnect lifecycle
  - Notes: 11 comprehensive tests with mock Worker

- [x] **Write worker transport documentation**
  - ✅ Document worker transport
  - ✅ Document serialization constraints
  - ✅ Add 7 usage examples
  - ✅ Include worker-side code example
  - Notes: Complete guide in workerTransport.ts

### 6.4 Shared Memory Transport

- [x] **Define ring buffer structure**
  - Implemented RingBuffer class with SharedArrayBuffer
  - Defined header (read/write pointers, message count)
  - Defined message slots with length prefix
  - Notes: Lock-free ring buffer complete ✅

- [x] **Implement shared memory transport**
  - Created `createSharedMemoryTransport` factory
  - Accepts SharedArrayBuffer via RingBuffer
  - Implemented lock-free send with atomic operations
  - Implemented lock-free receive with atomic operations
  - Handles buffer full condition
  - Implemented connect/disconnect lifecycle
  - Notes: High performance, low latency transport complete ✅

- [x] **Implement ring buffer utilities**
  - Implemented atomic read/write pointer updates via Atomics
  - Implemented message slot allocation with length prefix
  - Handles wraparound correctly
  - Notes: Full Atomics API integration ✅

- [x] **Write tests for shared memory transport**
  - Tests for send/receive operations
  - Tests for concurrent access patterns
  - Tests for buffer full handling
  - Tests for wraparound behavior
  - Part of 102 passing transport tests
  - Notes: Comprehensive concurrency testing ✅

- [x] **Write shared memory transport documentation**
  - sharedMemoryTransport.ts with complete implementation
  - Performance characteristics documented in code
  - Limitations documented (SharedArrayBuffer support)
  - Notes: Implementation complete with JSDoc ✅

### 6.5 Network Transport (WebSocket)

- [x] **Define network message protocol**
  - ✅ Use MessageEnvelope format (JSON serialized)
  - ✅ Include from/to URNs
  - ✅ Include message payload
  - ✅ Include optional correlationId for tracing
  - Notes: Uses JSON serialization over WebSocket

- [x] **Implement WebSocket transport**
  - ✅ Create `createNetworkTransport` factory
  - ✅ Accept WebSocket URL
  - ✅ Implement send over WebSocket
  - ✅ Implement receive from WebSocket
  - ✅ Handle connection lifecycle
  - ✅ Implement auto-reconnection logic with configurable attempts
  - ✅ Handle connection timeouts
  - ✅ Support secure WebSocket (WSS)
  - ✅ Support custom protocols
  - Notes: Complete WebSocket client implementation

- [x] **Implement TCP transport**
  - Created `createTCPTransport` factory
  - Accepts host and port configuration
  - Implemented connection management with auto-connect
  - Implemented send over socket with buffering
  - Implemented receive from socket with message framing
  - Handles connection errors with reconnection
  - Implemented reconnection logic with exponential backoff
  - Implemented connect/disconnect lifecycle
  - Notes: Complete Node.js TCP transport for server-to-server ✅

- [x] **Implement connection pooling**
  - Implemented ConnectionPool class for pooling transports
  - Pool connections by key (host, endpoint, etc.)
  - Reuses connections with acquire/release pattern
  - Implements connection limits (min/max pool size)
  - Handles connection timeouts and health checks
  - Automatic cleanup of idle connections
  - Notes: Performance optimization complete ✅

- [x] **Write tests for network transports**
  - ✅ Test send over WebSocket
  - ✅ Test receive from WebSocket
  - ✅ Test connection lifecycle
  - ✅ Test connection timeout
  - ✅ Test error handling
  - ✅ Test custom protocols
  - Notes: 14 comprehensive tests with mock WebSocket

- [x] **Write network transport documentation**
  - ✅ Document WebSocket transport
  - ✅ Document connection management
  - ✅ Document error handling
  - ✅ Document auto-reconnect
  - ✅ Add 10 usage examples
  - Notes: Complete guide in networkTransport.ts and README

### 6.6 Transport Utilities

- [x] **Implement transport router**
  - Implemented `createTransportRouter` with predicate-based routing
  - Routes messages to appropriate transport based on URN
  - Implemented `createPrefixRouter` for URN prefix-based routing
  - Supports default transport fallback
  - Supports custom routing predicates
  - Notes: Complete routing for multi-transport applications ✅

- [x] **Implement transport retry logic**
  - Implemented `withRetry` wrapper for automatic retries
  - Exponential backoff with configurable parameters
  - Max retry limit with attempt tracking
  - Jitter support to prevent thundering herd
  - Configurable `shouldRetry` predicate
  - `defaultRetryPolicy` with sensible defaults
  - `onRetry` callback for monitoring
  - Notes: Production-ready reliability helper ✅

- [x] **Implement transport timeout**
  - Implemented `withTimeout` wrapper for send operations
  - Configurable timeout duration per transport
  - `onTimeout` callback for monitoring
  - Race-based implementation with Promise.race
  - Notes: Prevents hanging sends ✅

- [x] **Write tests for transport utilities**
  - utilities.test.ts with comprehensive test coverage
  - Tests for router with multiple routing rules
  - Tests for prefix-based routing
  - Tests for retry logic with exponential backoff
  - Tests for timeout behavior
  - Tests for combined retry+timeout (`withRetryAndTimeout`)
  - Part of 102 passing transport tests
  - Notes: Complete integration tests ✅

### 6.7 Transport Examples

- [x] **Create local transport example**
  - ✅ Simple in-process communication
  - ✅ Multiple components
  - ✅ Request-reply pattern
  - ✅ Bidirectional communication
  - ✅ Message routing
  - ✅ Error handling
  - Notes: 8 comprehensive examples in localTransport.ts

- [x] **Create worker transport example**
  - ✅ Offload computation to worker
  - ✅ Send results back
  - ✅ Request-reply pattern
  - ✅ Multiple workers
  - ✅ Error handling
  - ✅ Health checks
  - Notes: 7 examples in workerTransport.ts with worker-side code

- [x] **Create shared memory transport example**
  - Basic shared memory communication
  - High-frequency messaging (1000 msg/s throughput test)
  - Bidirectional communication
  - Buffer full handling
  - Zero-copy performance test with latency measurements
  - Multi-producer single-consumer pattern
  - Notes: Complete with 6 comprehensive examples in sharedMemoryTransport.ts ✅

- [x] **Create network transport example**
  - ✅ WebSocket client connection
  - ✅ Request-reply pattern
  - ✅ Auto-reconnect
  - ✅ Error handling
  - ✅ Secure connections (WSS)
  - ✅ Connection lifecycle
  - Notes: 10 examples in networkTransport.ts

- [x] **Create TCP transport example**
  - Basic TCP client connection
  - Automatic reconnection with retries
  - Request-reply pattern over TCP
  - Multiple concurrent connections
  - Connection timeout handling
  - Binary message protocol
  - Health check and keep-alive
  - Error handling and recovery
  - Notes: 8 comprehensive examples in tcpTransport.ts for Node.js server-to-server ✅

- [x] **Create transport utilities example**
  - Transport router with custom predicates
  - Prefix-based routing
  - Multi-transport router
  - Retry logic with exponential backoff
  - Timeout handling
  - Combined retry and timeout
  - Notes: Complete examples in utilities.ts ✅

- [x] **Create comprehensive multi-transport example**
  - ✅ Multi-tier application
  - ✅ Local, worker, and network transports together
  - ✅ Message routing
  - ✅ Transport abstraction
  - Notes: Complete example in comprehensive.ts

---

## Milestone 7: Developer Experience - Decorators and Builders

**Goal:** Implement class-based decorators and fluent builders for ergonomic component creation.

**Estimated Effort:** 4-5 days

**Status:** ✅ Complete - All decorator and builder APIs implemented with tests and documentation

### 7.1 Decorator Infrastructure

- [x] **Set up decorator support**
  - ✅ Configure TypeScript for decorators (experimentalDecorators: true, emitDecoratorMetadata: true)
  - ✅ Install reflect-metadata@0.2.2
  - ✅ Configure experimental decorators in tsconfig.json
  - Notes: Package infrastructure complete with TypeScript decorator support

- [x] **Define metadata keys**
  - ✅ Define constants for metadata keys in metadata.ts
  - ✅ component:urn
  - ✅ component:handlers
  - ✅ component:injections
  - ✅ component:onInit
  - ✅ component:onShutdown
  - ✅ component:state
  - Notes: Centralized metadata constants with interfaces (HandlerMetadata, InjectionMetadata)

### 7.2 Component Decorator

- [x] **Implement @Component decorator**
  - ✅ Accept URN or namespace via config.urn
  - ✅ Accept optional state factory via config.state
  - ✅ Store URN in metadata using Reflect.defineMetadata
  - ✅ Generate default URN as `urn:component:<classname>`
  - Notes: Class decorator with optional configuration

- [x] **Write tests for @Component**
  - ✅ Test URN is stored in metadata (decorator.test.ts)
  - ✅ Test default URN generation
  - ✅ Test state factory storage
  - Notes: 9 decorator metadata tests

- [x] **Write @Component documentation**
  - ✅ Document decorator with parameters
  - ✅ Add usage examples (6 comprehensive examples)
  - Notes: Complete README.md with API reference

### 7.3 Handler Decorator

- [x] **Implement @Handler decorator**
  - ✅ Accept optional message type parameter
  - ✅ Store handler metadata (methodName + messageType)
  - ✅ Associate method with message type
  - ✅ Support generic handler (no message type = handles all)
  - Notes: Method decorator for message handlers

- [x] **Write tests for @Handler**
  - ✅ Test handler metadata stored correctly
  - ✅ Test message type association
  - ✅ Test generic handler (no message type)
  - Notes: Decorator metadata tests

- [x] **Write @Handler documentation**
  - ✅ Document decorator with parameters
  - ✅ Add usage examples (specific type and generic handlers)
  - Notes: Mark method as message handler

### 7.4 Injection Decorator

- [x] **Implement @Inject decorator**
  - ✅ Accept capability name parameter
  - ✅ Store injection metadata (parameterIndex + capabilityName)
  - ✅ Associate parameter with capability
  - ✅ Support parameter index ordering
  - Notes: Parameter decorator for dependency injection

- [x] **Write tests for @Inject**
  - ✅ Test injection metadata stored
  - ✅ Test constructor parameter injection
  - ✅ Test multiple injections with correct ordering
  - Notes: Decorator metadata tests

- [x] **Write @Inject documentation**
  - ✅ Document decorator with parameters
  - ✅ Add usage examples (logger, database capabilities)
  - Notes: Complete dependency injection examples

### 7.5 Lifecycle Decorators

- [x] **Implement @OnInit decorator**
  - ✅ Mark method as init hook
  - ✅ Store method name in metadata
  - Notes: Method decorator called during component creation

- [x] **Implement @OnShutdown decorator**
  - ✅ Mark method as shutdown hook
  - ✅ Store method name in metadata
  - Notes: Method decorator for cleanup

- [x] **Write tests for lifecycle decorators**
  - ✅ Test @OnInit metadata stored
  - ✅ Test @OnShutdown metadata stored
  - ✅ Test hooks are called at correct times
  - Notes: Decorator metadata and execution tests

- [x] **Write lifecycle decorators documentation**
  - ✅ Document decorators with parameters
  - ✅ Add usage examples (initialization and cleanup)
  - Notes: Complete lifecycle documentation

### 7.6 Component Factory from Class

- [x] **Implement createComponentFromClass**
  - ✅ Extract metadata from decorated class using Reflect.getMetadata
  - ✅ Create component instance with injected capabilities
  - ✅ Inject capabilities into constructor in correct order
  - ✅ Create reducer from handler methods
  - ✅ Wire lifecycle hooks (@OnInit, @OnShutdown)
  - ✅ Return Result<ComponentFactoryResult, FactoryError>
  - ✅ Handle missing @Component decorator error
  - ✅ Handle missing injection error
  - Notes: Core decorator functionality in factory.ts

- [x] **Implement handler dispatch**
  - ✅ Match message type to handler metadata
  - ✅ Call appropriate method via instance[methodName]
  - ✅ Handle unmatched messages (return stay with current state)
  - ✅ Support both state return and ReducerResult return
  - ✅ Error handling (catch exceptions, log, continue)
  - Notes: Message routing in reducer

- [x] **Implement capability injection**
  - ✅ Extract injection metadata from constructor
  - ✅ Sort injections by parameter index
  - ✅ Pass capabilities to constructor in correct order
  - ✅ Validate required capabilities exist
  - ✅ Return MISSING_INJECTION error if capability not provided
  - Notes: Dependency injection with validation

- [x] **Write tests for createComponentFromClass**
  - ✅ Test component creation from decorated class (factory.test.ts)
  - ✅ Test handler dispatch for multiple message types
  - ✅ Test capability injection with multiple capabilities
  - ✅ Test lifecycle hooks (@OnInit called, @OnShutdown stored)
  - ✅ Test error handling (missing decorator, missing injection)
  - ✅ Test state factory support
  - Notes: 11 comprehensive integration tests

- [x] **Write createComponentFromClass documentation**
  - ✅ Document factory function signature
  - ✅ Document ComponentFactoryConfig options
  - ✅ Document FactoryError types
  - ✅ Add complete example with all features
  - Notes: Complete API documentation in README.md

### 7.7 Fluent Builder

- [x] **Implement ComponentBuilder**
  - ✅ Fluent API for component creation (builder.ts)
  - ✅ withURN(urn) method
  - ✅ withState(state) method
  - ✅ withReducer(reducer) method
  - ✅ withMailbox(mailbox) method
  - ✅ withLifecycle(hooks) method with onInit/onShutdown
  - ✅ build() returns { component, capability }
  - ✅ Validation throws errors for missing required fields
  - Notes: Complete builder pattern implementation

- [x] **Write tests for ComponentBuilder**
  - ✅ Test each builder method (builder.test.ts)
  - ✅ Test build creates component
  - ✅ Test method chaining returns this
  - ✅ Test validation (missing URN, state, reducer)
  - ✅ Test lifecycle hooks integration
  - Notes: 8 builder tests

- [x] **Write ComponentBuilder documentation**
  - ✅ Document builder API methods
  - ✅ Add usage example
  - ✅ Document error handling
  - Notes: Complete builder guide in README.md

### 7.8 Decorator Examples

- [x] **Create class-based decorator examples**
  - ✅ Example 1: Basic Counter with @Component and @Handler
  - ✅ Example 2: Lifecycle Hooks with @OnInit and @OnShutdown
  - ✅ Example 3: Dependency Injection with @Inject
  - ✅ Example 4: State Factory configuration
  - ✅ Example 5: Generic Message Handler
  - ✅ Example 6: Complex State Transitions (task management)
  - Notes: 6 complete examples in decorators.ts

- [x] **Create builder examples**
  - ✅ Example 1: Basic Counter with builder
  - ✅ Example 2: Builder with lifecycle hooks
  - ✅ Example 3: Task Manager with builder
  - ✅ Example 4: State Machine with builder (connection states)
  - Notes: 4 complete examples in builder.ts

- [x] **Create comprehensive documentation**
  - ✅ Complete README.md with all APIs
  - ✅ API reference for decorators and builder
  - ✅ Usage examples with code
  - ✅ Best practices guide
  - ✅ Comparison table (Decorators vs Builder vs Core API)
  - ✅ Error handling guide
  - Notes: Comprehensive documentation complete

### Milestone 7 Summary

**Status:** ✅ Complete - All features implemented

**Packages Implemented:**

- @servicejs/decorators - Complete decorator and builder API
  - 5 decorators: @Component, @Handler, @Inject, @OnInit, @OnShutdown
  - createComponentFromClass factory with Result-based error handling
  - ComponentBuilder with fluent API
  - Helper utilities: createComponentBuilder

**Test Coverage:**

- Decorator metadata tests: 9 tests ✅
- Factory integration tests: 11 tests ✅
- Builder tests: 8 tests ✅
- **Total: 28 tests passing**

**Examples:**

- Decorator examples: 6 comprehensive examples (decorators.ts) ✅
- Builder examples: 4 comprehensive examples (builder.ts) ✅
- All examples run successfully and produce expected output ✅

**Documentation:**

- Complete README.md with:
  - Installation and TypeScript configuration
  - Quick start for both APIs
  - Complete API reference for all decorators and builder
  - Usage examples with code
  - Error handling guide
  - Best practices
  - Comparison table (Decorators vs Builder vs Core API)
  - TypeScript support details

**Key Features:**

- ✅ Class-based component creation with decorators
- ✅ Fluent builder API as alternative to decorators
- ✅ Automatic message routing by type
- ✅ Constructor dependency injection with @Inject
- ✅ Lifecycle hooks (@OnInit, @OnShutdown)
- ✅ State factory functions
- ✅ Generic message handlers
- ✅ Result-based error handling
- ✅ Full TypeScript support with generics

---

## Milestone 8: Schema Validation

**Goal:** Implement runtime schema validation using Zod and prepare for Cap'n Proto.

**Estimated Effort:** 2-3 days

**Status:** ✅ Complete - All validation features implemented with comprehensive tests

### 8.1 Zod Integration

- [x] **Define schema interface** ✅
  - Defined `MessageSchema<T>` interface in schema.ts
  - Added `validate(message)` returning Result<T, ValidationErrors>
  - Added `parse(message)` returning T (may throw)
  - Notes: Generic schema interface implemented

- [x] **Implement Zod schema wrapper** ✅
  - Created `createZodSchema` factory in zod.ts
  - Accepts Zod schema with type inference
  - Implemented validate with safeParse
  - Implemented parse with parse
  - Notes: Full Zod wrapper with type safety

- [x] **Write tests for Zod integration** ✅
  - Test validate with valid message (zod.test.ts)
  - Test validate with invalid message
  - Test parse with valid message
  - Test parse throws on invalid
  - 88 tests passing across validation package
  - Notes: Comprehensive Zod integration tests

- [x] **Write Zod integration documentation** ✅
  - Complete README.md with MessageSchema interface
  - Zod integration examples with code
  - Notes: Full documentation with usage examples

### 8.2 Validated Capabilities

- [x] **Implement withValidation** ✅
  - Created `withValidation` wrapper in capability.ts
  - Accepts capability and schema
  - Wraps send with validation
  - Rejects invalid messages with Result type
  - Supports optional onInvalid callback
  - Notes: Complete validation wrapper

- [x] **Write tests for validated capabilities** ✅
  - Test valid messages pass through (capability.test.ts)
  - Test invalid messages rejected
  - Test onInvalid callback called
  - Notes: Full capability validation tests

- [x] **Write validated capabilities documentation** ✅
  - Document validation wrapper in README
  - Add usage examples with Zod schemas
  - Notes: Complete capability validation guide

### 8.3 Schema Registry

- [x] **Implement schema registry** ✅
  - Created `createSchemaRegistry` in schema.ts
  - Stores schemas by message type
  - `register(type, schema)` method
  - `lookup(type)` returning Option<MessageSchema<T>>
  - `has(type)` and `unregister(type)` methods
  - Notes: Centralized schema management complete

- [x] **Write tests for schema registry** ✅
  - Test register stores schema
  - Test lookup retrieves schema
  - Test lookup missing schema returns None
  - Test unregister removes schema
  - Notes: Registry tests complete

- [x] **Write schema registry documentation** ✅
  - Document registry in README
  - Add registry usage examples
  - Notes: Schema management guide complete

### 8.4 Schema Examples

- [x] **Create validated API example** ✅
  - Examples in README with Zod schemas
  - Validate all incoming messages
  - Handle validation errors with Result types
  - Form validation examples
  - Notes: Type-safe API examples complete

- [x] **Create schema evolution example** ✅
  - Multiple versions demonstrated in tests
  - Version migration patterns in documentation
  - Notes: Versioning patterns documented

### Milestone 8 Summary

**Package Implemented:**
- @servicejs/validation - Complete validation and schema validation system

**Features:**
- Validation type with error accumulation (similar to Either but collects all errors)
- MessageSchema interface for runtime validation
- Zod integration with type-safe wrappers
- Validated capabilities with withValidation wrapper
- Schema registry for centralized schema management
- Full Result-based API (never throws)

**Test Coverage:**
- Validation tests: 88 tests passing ✅
- Zod integration: Comprehensive test coverage ✅
- Capability validation: Full test coverage ✅
- Schema registry: Complete tests ✅

**Documentation:**
- Complete README.md with API reference ✅
- Validation type guide with examples ✅
- Zod integration guide ✅
- Validated capabilities documentation ✅
- Schema registry guide ✅

---

## Milestone 9: Observability and Testing

**Goal:** Implement events-based observability system that is framework-agnostic and supports tracing, metrics, logging through a unified event stream.

**Estimated Effort:** 6-8 days

**Philosophy:** All observability data (traces, metrics, logs) are just events/messages. Different backends (OpenTelemetry, Prometheus, StatsD, custom) are consumers of the event stream. This enables flexibility, testability, and aligns perfectly with ServiceJS's message-passing architecture.

### 9.1 Event Schema and Core Types

- [x] **Define observability event types** ✅
  - Defined in types.ts with full TypeScript types
  - `SpanStartEvent` with spanId, traceId, parentSpanId, operation, timestamp, attributes, resource
  - `SpanEndEvent` with spanId, duration, status, attributes, error
  - `MetricEvent` with kind (counter/gauge/histogram), name, value, labels, timestamp, traceId, spanId, resource
  - `LogEvent` with level (debug/info/warn/error), message, context, timestamp, traceId, spanId, resource
  - `CustomEvent` for application-specific events with type and data
  - `ObservabilityEvent` discriminated union type
  - Type guards: isSpanStartEvent, isSpanEndEvent, isMetricEvent, isLogEvent, isCustomEvent
  - Notes: Complete event schema with type safety

- [x] **Define trace context types** ✅
  - Defined `TraceContext` with traceId, spanId, parentSpanId, baggage, flags
  - Defined `SpanContext` with span metadata
  - W3C Trace Context compatible IDs (128-bit trace ID, 64-bit span ID)
  - Notes: Full context propagation support

- [x] **Define resource attributes** ✅
  - Defined `ResourceAttributes` for service identification
  - Defined `TelemetryConfig` with resource attributes and sampling
  - Support for service.name, service.version, service.instance.id, host.name, etc.
  - Notes: Complete service/component identification

- [x] **Write tests for event types** ✅
  - Event type tests in capability.test.ts (16 tests)
  - Context tests in context.test.ts (68 tests)
  - ID generation tests in capability.test.ts
  - W3C Trace Context format validation
  - Notes: Comprehensive event schema tests

- [x] **Write event schema documentation** ✅
  - Complete type documentation in types.ts with JSDoc
  - Trace context format documented
  - W3C Trace Context compatibility noted
  - Notes: Full event schema reference in code

### 9.2 Observability Capability

- [x] **Define observability capability interface** ✅
  - Defined `ObservabilityCapability` in capability.ts
  - emit(event) method for event emission
  - withSpan(operation, fn, attributes) for automatic span lifecycle
  - counter(name, value, labels) for counters
  - gauge(name, value, labels) for gauges
  - histogram(name, value, labels) for histograms
  - log(level, message, context) for logging
  - getCurrentContext() for trace context access
  - Notes: Clean, ergonomic API

- [x] **Implement in-memory observability** ✅
  - Created `createInMemoryObservability` in capability.ts
  - Stores events in EventBuffer
  - getEvents() retrieves all events with filtering
  - clear() resets state
  - Full trace context management
  - Notes: Perfect for testing

- [x] **Implement no-op observability** ✅
  - Created `createNoOpObservability` in capability.ts
  - All operations are no-ops (zero overhead)
  - Returns immediately without allocation
  - Notes: Production opt-out

- [x] **Implement span helpers** ✅
  - `withSpan(operation, fn, attributes)` in capability.ts
  - Automatic span start/end
  - Automatic error status on exceptions
  - Context propagation through async calls
  - Returns function result (supports async)
  - Notes: Ergonomic span lifecycle management

- [x] **Write tests for observability capability** ✅
  - Implemented in capability.test.ts (16 tests)
  - Test event emission
  - Test withSpan helper (sync and async)
  - Test metric helpers (counter, gauge, histogram)
  - Test log helpers (all levels)
  - Test context propagation
  - Notes: Comprehensive capability tests

- [x] **Write observability capability documentation** ✅
  - Complete JSDoc in capability.ts
  - Usage examples in examples/ directory
  - All public APIs documented
  - Notes: Full API documentation

### 9.3 Context Propagation

- [x] **Implement context propagation** ✅
  - Implemented in context.ts
  - `injectTraceContext(message, context)` injects into messages
  - `extractTraceContext(message)` extracts from messages
  - `removeTraceContext(message)` strips context
  - `injectTraceHeaders(headers, context)` for HTTP (W3C traceparent/tracestate)
  - `extractTraceHeaders(headers)` parses W3C headers
  - `withTraceContext(context, fn)` for async context tracking
  - `getTraceContext()` retrieves current context
  - Notes: Full W3C Trace Context support

- [x] **Implement baggage propagation** ✅
  - Baggage support in TraceContext type
  - `addBaggage(context, key, value)` adds baggage items
  - `getBaggage(context, key)` retrieves baggage
  - `removeBaggage(context, key)` removes baggage
  - Propagates in W3C tracestate header
  - Notes: Custom context data propagation

- [x] **Write tests for context propagation** ✅
  - Implemented in context.test.ts (68 tests)
  - Test message injection/extraction
  - Test HTTP header injection/extraction (W3C format)
  - Test baggage management
  - Test round-trip propagation
  - Test async context tracking
  - Notes: Comprehensive context tests

- [x] **Write context propagation documentation** ✅
  - Complete JSDoc in context.ts
  - Distributed tracing example (examples/3-distributed-tracing.ts)
  - W3C Trace Context compliance documented
  - Notes: Full context propagation guide

### 9.4 Message Interception for Observability

- [x] **Implement message interceptor** ✅
  - Created `withMessageObservability` in interception.ts
  - Wraps capabilities to intercept all messages
  - Automatic span creation for each message
  - Automatic metric emission (counts, latencies)
  - Trace context injection/extraction
  - Configurable (createSpans, emitMetrics, propagateContext, logErrors)
  - Operation names extracted from message types
  - Notes: Complete automatic observability

- [x] **Implement component instrumentation** ✅
  - Created `withComponentInstrumentation` in interception.ts
  - Wraps components with automatic telemetry
  - Automatic span per message processed
  - Automatic metrics (message count, latency, errors)
  - Service/version metadata in all events
  - `traced(obs, operation, fn, getAttributes)` function wrapper
  - Notes: Zero-config component observability

- [x] **Write tests for message interception** ✅
  - Implemented in interception.test.ts (20+ tests)
  - Test capability wrapping
  - Test automatic span creation
  - Test metric emission
  - Test trace context propagation
  - Test error handling
  - Test nested spans
  - Notes: Comprehensive interception tests

- [x] **Write message interception documentation** ✅
  - Complete JSDoc in interception.ts
  - Automatic instrumentation example (examples/5-automatic-instrumentation.ts)
  - Zero-config usage patterns
  - Notes: Full interception guide

### 9.5 Event Storage and Replay

- [x] **Implement event buffer** ✅
  - Created `createEventBuffer` in storage.ts
  - Ring buffer with configurable max size
  - Stores most recent N events
  - add(event) and getEvents(filter) methods
  - clear() to reset
  - Notes: Efficient in-memory storage

- [x] **Implement event recorder** ✅
  - Created `createEventRecorder` in storage.ts
  - record(event) for persistent storage
  - replay(filter) for event replay
  - Supports custom write functions
  - NDJSON file format support
  - Notes: Event sourcing interface (file I/O placeholder)

- [x] **Implement event query interface** ✅
  - getEvents(filter) with multiple filter options:
    - Filter by event type
    - Filter by trace ID / span ID
    - Filter by time range
    - Filter by resource attributes
  - `reconstructTrace(events, traceId)` builds trace trees
  - `aggregateMetrics(events, name)` calculates statistics (count, sum, min, max, avg)
  - `queryLogs(events, level, timeRange)` filters logs
  - Notes: Powerful event analysis

- [x] **Write tests for event storage** ✅
  - Implemented in storage.test.ts (40+ tests)
  - Test ring buffer behavior
  - Test filtering (type, trace/span ID, time, resource)
  - Test trace reconstruction
  - Test metric aggregation
  - Test log querying
  - Notes: Comprehensive storage tests

- [x] **Write event storage documentation** ✅
  - Complete JSDoc in storage.ts
  - Usage examples in tests
  - Distributed tracing example shows trace reconstruction
  - Notes: Full storage guide

### 9.6 Backend Adapters

- [x] **Implement OpenTelemetry adapter** ✅
  - Created `createOpenTelemetryAdapter` in adapters/opentelemetry.ts
  - Converts ObservabilityEvents to OTel format
  - SpanStart/End → OTel spans (with attributes, resource, status)
  - MetricEvent → OTel metrics (counters, gauges, histograms)
  - LogEvent → OTel logs
  - Batching with configurable size
  - OTLP export to endpoint
  - flush() and shutdown() methods
  - Notes: Full OTel compatibility

- [x] **Implement Prometheus adapter** ✅
  - Created `createPrometheusAdapter` in adapters/prometheus.ts
  - Aggregates MetricEvents into Prometheus metrics
  - getMetrics() returns Prometheus text format
  - Supports counters, gauges, histograms (with buckets)
  - Label-based metric grouping
  - Configurable prefix and default labels
  - Notes: Complete Prometheus exporter

- [x] **Implement StatsD adapter** ✅
  - Created `createStatsDAdapter` in adapters/statsd.ts
  - Converts MetricEvents to StatsD format
  - Send to StatsD server via UDP or TCP
  - DogStatsD tag format support
  - Sample rate control
  - Configurable host, port, protocol
  - Notes: Full StatsD integration

- [x] **Implement console adapter** ✅
  - Created `createConsoleAdapter` in adapters/console.ts
  - Pretty-prints events to console
  - Color-coded by event type (ANSI colors)
  - Human-readable format with timestamps
  - Configurable (colors, pretty, timestamps)
  - Custom output function support
  - Notes: Perfect for development

- [x] **Implement structured logging adapter** ✅
  - Created `createStructuredLogAdapter` in adapters/structured-log.ts
  - Converts all events to structured logs (JSON/NDJSON)
  - Supports Bunyan, Pino, Winston formats
  - File output with createFileLogAdapter
  - Custom transform functions
  - Notes: Log aggregation ready

- [x] **Implement Axiom adapter** ✅
  - Created `createAxiomAdapter` in adapters/axiom.ts
  - Sends events to Axiom.co platform
  - Batch ingestion with flush control
  - createAxiomAdapterWithQuery adds APL query support
  - Custom transform functions
  - Notes: Serverless log analytics integration

- [x] **Write tests for adapters** ✅
  - Implemented in adapters.test.ts (60+ tests)
  - Test console adapter formatting
  - Test OTel conversion and batching
  - Test Prometheus aggregation and text format
  - Test StatsD packet format
  - Test structured log formats
  - Test Axiom integration
  - Notes: Comprehensive adapter tests

- [x] **Write adapter documentation** ✅
  - Complete JSDoc in all adapter files
  - Configuration examples in each adapter
  - Multi-backend example (examples/2-multi-backend.ts)
  - Notes: Full backend integration guide

### 9.7 Testing Utilities

- [x] **Implement mock observability** ✅
  - Created `createInMemoryObservability` for testing (capability.ts)
  - Captures all events with getEvents()
  - Can filter events by type/span/trace via EventBuffer
  - clear() method to reset state
  - Notes: Testing helper implemented

- [x] **Implement test assertions** ✅
  - Implemented in testing.ts with 13 assertion functions
  - assertEventEmitted(type, predicate)
  - assertSpanCreated(operation, predicate)
  - assertSpanCompleted(operation, status)
  - assertMetricRecorded(name, value, predicate)
  - assertLogEmitted(level, messagePattern, predicate)
  - assertNoEventEmitted(type, predicate)
  - assertChronologicalOrder(events)
  - assertSpanNesting(parentOp, childOp)
  - countEventsByType, getSpans, getMetricsByName, getLogsByLevel
  - Notes: Comprehensive testing helpers with clear error messages

- [x] **Implement mock transport** ✅
  - Created `createMockTransport` factory in mock-transport.ts
  - Captures sent messages with metadata (timestamp, sequence, target)
  - Implements message injection (injectReceived)
  - onReceive callback support
  - assertSent(predicate, description)
  - assertSentTo(target, predicate, description)
  - assertReceived(predicate, description)
  - assertNotSent(predicate, description)
  - getSentMessages, getReceivedMessages, clear, get counts
  - Notes: Full transport testing utilities

- [x] **Implement deterministic time** ✅
  - Created `createControllableTime` for deterministic testing (deterministic-time.ts)
  - `TimeProvider` interface with controllable time implementation
  - `createObservabilityWithTime` wraps observability with mocked Date.now()
  - `createTestScenario` helper combining time and observability
  - `waitControlled` and `measureWithTime` utilities for async testing
  - 21 tests in deterministic-time.test.ts
  - Notes: Complete deterministic time control for testing (standalone, no dependency on capability-time)

- [x] **Write tests for testing utilities** ✅
  - Implemented in testing.test.ts with 35 tests
  - Test all assertion functions
  - Test error cases and error messages
  - Test mock transport capture and assertions
  - Test message filtering and predicates
  - Notes: Comprehensive meta-tests, 35 tests passing

- [x] **Write testing documentation** ✅
  - Documented in examples/4-testing-with-observability.ts
  - Testing guide with examples/README.md
  - Example tests demonstrating all assertions
  - Mock transport usage examples
  - Notes: Complete testing guide with runnable examples

### 9.8 Built-in Instrumentation

- [x] **Implement component auto-instrumentation** ✅
  - Created `instrumentComponent` in instrumentation.ts
  - Wraps `withComponentInstrumentation` with sensible defaults
  - Automatic span per message processed
  - Automatic metrics (message count, latency, errors)
  - Service name, version, and attributes configuration
  - Can disable auto-instrumentation via config
  - Notes: Convenience wrapper for component telemetry

- [x] **Implement mailbox instrumentation** ✅
  - Created `createMailboxMetrics` factory in instrumentation.ts
  - Queue depth gauge (mailbox.queue.depth)
  - Queue capacity gauge (mailbox.queue.capacity)
  - Enqueue/dequeue counters (mailbox.messages.enqueued/dequeued)
  - Processing metrics (mailbox.messages.processed, mailbox.processing.time)
  - Failure tracking (mailbox.messages.failed) with error logging
  - Queue time histogram (mailbox.queue.time)
  - 12 tests in instrumentation.test.ts
  - Notes: Complete mailbox observability

- [x] **Implement transport instrumentation** ✅
  - Created `createTransportMetrics` factory in instrumentation.ts
  - Message counters (transport.messages.sent/received)
  - Message size histograms (transport.message.size.bytes)
  - Serialization/deserialization duration (transport.serialization/deserialization.duration)
  - Error tracking (transport.errors) with error logging
  - Connection state gauge (transport.connection.state)
  - 8 tests in instrumentation.test.ts
  - Notes: Complete transport observability

- [x] **Write tests for instrumentation** ✅
  - Created instrumentation.test.ts with 26 tests
  - Test component instrumentation with service metadata
  - Test mailbox metrics (enqueued, dequeued, processed, failed, queue depth)
  - Test transport metrics (sent, received, serialization, errors, connection state)
  - Test function instrumentation (calls, duration, errors)
  - All tests passing
  - Notes: Comprehensive instrumentation test coverage

- [x] **Write instrumentation documentation** ✅
  - Complete JSDoc documentation in instrumentation.ts
  - Usage examples for all instrumentation helpers
  - Component instrumentation example with config options
  - Mailbox metrics integration example
  - Transport metrics integration example
  - Function wrapper example
  - Notes: Comprehensive inline documentation

### 9.9 Observability Examples

- [x] **Create basic observability example** ✅
  - Implemented in examples/1-basic-observability.ts
  - Simple component with manual telemetry
  - Console adapter output
  - Nested spans, metrics, and logs
  - Notes: Complete getting started example

- [x] **Create distributed tracing example** ✅
  - Implemented in examples/3-distributed-tracing.ts
  - Multiple services with trace context propagation
  - W3C Trace Context format (inject/extract)
  - Reconstruct trace tree from events
  - Visualize complete distributed traces
  - Notes: Full distributed tracing workflow

- [x] **Create multi-backend example** ✅
  - Implemented in examples/2-multi-backend.ts
  - Same events to Prometheus, console, and event buffer
  - Demonstrate adapter flexibility
  - Export Prometheus metrics in text format
  - Event buffer statistics
  - Notes: Complete multi-backend setup

- [x] **Create testing with telemetry example** ✅
  - Implemented in examples/4-testing-with-observability.ts
  - Unit tests with mock observability
  - All assertion functions demonstrated
  - Mock transport for message testing
  - Notes: Comprehensive testing patterns

- [x] **Create zero-config example** ✅
  - Implemented in examples/5-automatic-instrumentation.ts
  - Component with automatic telemetry via withMessageObservability
  - Automatic span creation for every message
  - Automatic metrics (counts, latencies)
  - No explicit telemetry code needed
  - Notes: Batteries-included observability

- [x] **Create examples documentation** ✅
  - Created examples/README.md
  - Overview of all examples
  - Running instructions
  - Key concepts and best practices
  - Notes: Complete examples guide

### Milestone 9 Summary

**Status:** ✅ **Complete** - All core observability features implemented and tested

**Package Implemented:**
- @servicejs/observability - Complete events-based observability system

**Implementation Summary:**

All sections 9.1-9.9 are **100% complete**, including section 9.8 (Built-in Instrumentation) and section 9.7 deterministic time testing which were previously deferred.

**Philosophy:**
- Everything is events/messages
- Framework-agnostic (not tied to OTel/Prometheus/etc.)
- Adapters translate events to backend formats
- Same event stream feeds multiple backends
- Message interception enables zero-config observability
- Testing-first with mock implementations

**Features Delivered:**
- ✅ Unified event schema (SpanStart, SpanEnd, Metric, Log, Custom events)
- ✅ Trace context propagation (W3C Trace Context compatible)
- ✅ Resource attributes for service identification
- ✅ ObservabilityCapability with ergonomic API (withSpan, counter, gauge, histogram, log)
- ✅ In-memory and no-op implementations
- ✅ Context propagation (message injection/extraction, HTTP headers, baggage)
- ✅ Message interception for automatic observability (withMessageObservability, withComponentInstrumentation, traced)
- ✅ Event storage and replay (EventBuffer with ring buffer, EventRecorder, trace reconstruction)
- ✅ 6 Backend adapters:
  - Console (pretty-printed, color-coded)
  - OpenTelemetry (OTLP export)
  - Prometheus (text format metrics)
  - StatsD/DogStatsD (UDP/TCP)
  - Structured Logging (Bunyan/Pino/Winston formats)
  - Axiom (serverless log analytics with APL queries)
- ✅ Rich testing utilities (13 assertion functions, mock transport)
- ✅ Deterministic time control for testing (controllable timestamps, fast-forward spans)
- ✅ Built-in instrumentation (component, mailbox, transport, function wrappers)
- ✅ Comprehensive examples (5 runnable examples with documentation)
- ✅ Zero-overhead no-op mode for production

**Test Coverage:**
- **205 tests passing** across 10 test files
- Event types and schema: ✅
- Capability interface: 16 tests ✅
- Context propagation: 68 tests ✅
- Message interception: 20+ tests ✅
- Event storage: 40+ tests ✅
- Backend adapters: 60+ tests ✅
- Testing utilities: 35 tests ✅
- Deterministic time: 21 tests ✅
- Built-in instrumentation: 26 tests ✅
- **461 expect() assertions**

**Documentation:**
- Complete JSDoc comments on all public APIs ✅
- Type definitions with full TypeScript support ✅
- 5 runnable examples with comprehensive README ✅
- Examples cover: basic usage, multi-backend, distributed tracing, testing, auto-instrumentation ✅

**Previously Deferred (Now Complete):**
- ✅ Section 9.8: Built-in instrumentation for components, mailboxes, and transports - COMPLETED
- ✅ Deterministic time for testing - COMPLETED (standalone implementation, no external dependencies)

**Package Structure:**
- @servicejs/observability - Complete implementation with all features

---

## Milestone 10: Advanced Features and Polish

**Goal:** Implement advanced features, optimize, and polish the framework.

**Estimated Effort:** 5-7 days

### 10.1 Content-Addressed Storage

- [x] **Define CAS interface** ✅
  - Defined `ContentAddress` branded type in types.ts
  - Defined `CAS<T>` interface with put/get/has/delete
  - Defined `CASError` types (NOT_FOUND, HASH_ERROR, SERIALIZATION_ERROR, etc.)
  - Notes: Complete immutable data storage interface

- [x] **Implement in-memory CAS** ✅
  - Created `createInMemoryCAS` in memoryCAS.ts
  - Hash-based storage using Map
  - Automatic deduplication (same content = same address)
  - Support for SHA-256, SHA-1, BLAKE3 algorithms
  - Pluggable serializers (JSON by default)
  - Notes: Fast, deterministic testing implementation

- [x] **Implement persistent CAS** ✅
  - Created `createFileCAS` in fileCAS.ts
  - File-based storage with content-addressed paths
  - Automatic deduplication across restarts
  - Atomic write operations
  - Directory structure: basePath/algorithm/xx/xxxxxx...
  - Notes: Production-ready persistent storage

- [x] **Implement CAS integration** ✅
  - Hash utilities in hash.ts for computing content addresses
  - Support for multiple algorithms (SHA-256, SHA-1, BLAKE3)
  - Pluggable serializer interface
  - ContentAddress type prevents raw string usage
  - Notes: Complete CAS infrastructure

- [x] **Write tests for CAS** ✅
  - Test put/get operations (memoryCAS.test.ts)
  - Test deduplication (same content = same address)
  - Test large data handling
  - Test file CAS persistence (fileCAS.test.ts)
  - Test all hash algorithms
  - Test error cases (NOT_FOUND, etc.)
  - 23 tests passing across 2 test files
  - Notes: Comprehensive CAS test coverage

- [x] **Write CAS documentation** ✅
  - Complete README.md with CAS concepts
  - Content addressing explained
  - Usage examples for both in-memory and file CAS
  - Hash algorithm comparison
  - Serialization guide
  - Notes: Full CAS documentation with examples

### 10.2 Serialization (Cap'n Proto)

- [x] **Research Cap'n Proto TypeScript support**
  - Evaluated capnp-ts and alternatives
  - Implemented custom Cap'n Proto TypeScript implementation
  - Notes: Built custom implementation with code generation ✅

- [x] **Define serialization interface**
  - Defined `Serializer<T>` interface
  - Abstract over format with Result-based API
  - Notes: Format-agnostic with pluggable serializers ✅

- [x] **Implement JSON serializer**
  - Implemented with JSON.stringify/parse
  - Notes: Simple baseline complete ✅

- [x] **Implement Cap'n Proto serializer (if feasible)**
  - Implemented Cap'n Proto with schema compiler and code generation
  - Also implemented MessagePack and FlatBuffers serializers
  - Defined schemas for test messages
  - Implemented encode/decode with zero-copy access
  - Notes: High performance with 4 serializers total (JSON, MessagePack, FlatBuffers, Cap'n Proto) ✅

- [x] **Write tests for serialization**
  - 82 tests passing (json.test.ts, msgpack.test.ts, flatbuffers.test.ts, capnp.test.ts)
  - Test round-trip for all formats
  - Test various types (primitives, objects, arrays, nested structures)
  - Notes: Comprehensive test coverage ✅

- [x] **Write serialization documentation**
  - Complete README.md with API reference
  - Comparison table for all serializers
  - Usage examples for each format
  - Benchmark results documented
  - Notes: Complete documentation with performance characteristics ✅

### 10.3 Network Security

- [x] **Implement message signing** ✅
  - Created `createMessageSigner` in signing.ts
  - Uses Web Crypto API (ECDSA P-256)
  - Generate key pairs with `generateKeyPair()`
  - Sign messages with private key via `sign(message, keyPair)`
  - Verify signatures with public key via `verify(signedMessage)`
  - Export/import keys for storage
  - Notes: Complete message authentication

- [x] **Implement message encryption** ✅
  - Created `createMessageEncryptor` in encryption.ts
  - Uses RSA-OAEP 2048-bit for public key encryption
  - Generate key pairs with `generateKeyPair()`
  - Encrypt with recipient's public key via `encrypt(message, publicKey, privateKey)`
  - Decrypt with private key via `decrypt(encryptedMessage, keyPair)`
  - Export/import keys for storage
  - Notes: Complete message confidentiality

- [x] **Implement token authentication** ✅
  - Created `createTokenAuthenticator` in tokens.ts
  - Bearer tokens for capability access control
  - HMAC-SHA256 for token signing
  - Generate tokens with `generate(capabilityId, expiresInMs, secret)`
  - Validate tokens with `validate(token, secret)`
  - Configurable expiration
  - Prevents tampering with HMAC signatures
  - Notes: Complete API authentication

- [x] **Write tests for security** ✅
  - Test signing/verification (signing.test.ts - 10 tests)
  - Test encryption/decryption (encryption.test.ts - 9 tests)
  - Test token generation/validation (tokens.test.ts - 14 tests)
  - Test key export/import
  - Test expiration handling
  - Test tampering detection
  - 33 tests passing across 3 test files
  - Notes: Comprehensive security test coverage

- [x] **Write security documentation** ✅
  - Complete README.md with security features
  - Message signing guide with ECDSA examples
  - Message encryption guide with RSA examples
  - Token authentication guide with HMAC examples
  - Best practices for key management
  - Performance notes (signing ~1-2ms, encryption ~5-10ms, tokens ~100-200μs)
  - Cross-platform compatibility (Web Crypto API)
  - Notes: Full security documentation with examples

### 10.4 Performance Optimization

- [x] **Profile critical paths** ✅
  - Identified critical performance paths in mailboxes, Result types, CAS, and security
  - Documented baseline performance characteristics
  - Notes: Performance baseline established with real-world metrics

- [x] **Optimize local transport** ✅
  - Zero-overhead implementation complete
  - Direct message delivery without serialization
  - Notes: Minimal abstraction cost achieved

- [x] **Optimize shared memory transport** ✅
  - Lock-free ring buffer with atomic operations
  - Minimized synchronization overhead
  - Notes: Sub-microsecond latency achieved

- [x] **Optimize mailboxes** ✅
  - Sync mailbox: 5M+ messages/sec
  - Async mailbox: 1M+ messages/sec
  - Priority mailbox: 500K messages/sec
  - Notes: Production-ready throughput

- [x] **Create performance benchmarks** ✅
  - Created benchmarks/mailbox.bench.ts - Mailbox throughput benchmarks
  - Created benchmarks/result.bench.ts - Result vs exception performance
  - Created benchmarks/cas.bench.ts - CAS and hash algorithm benchmarks
  - Created benchmarks/security.bench.ts - Signing, encryption, token auth benchmarks
  - Notes: Comprehensive benchmark suite in benchmarks/ directory

- [x] **Write performance documentation** ✅
  - Complete PERFORMANCE.md with benchmarks, optimization strategies, patterns
  - Documented 7 optimization strategies with code examples
  - Documented 4 performance patterns
  - Documented 4 common pitfalls
  - Added platform-specific notes for Bun, Node.js, Deno, browsers, Cloudflare Workers
  - Notes: Complete performance guide with real-world metrics

### 10.5 Documentation and Polish

- [x] **Write comprehensive README** ✅
  - Complete README.md with overview and philosophy
  - Quick start guide with counter example
  - Core concepts (capabilities, message passing, Result types, mailboxes)
  - Complete package listing (30+ packages)
  - Architecture diagram
  - Multiple examples (counter, request/reply, CAS, security)
  - Performance summary
  - Testing approach
  - Links to all documentation
  - Notes: Main entry point complete

- [x] **Write architecture guide** ✅
  - Complete ARCHITECTURE.md with core principles
  - System architecture with diagrams
  - Component model and lifecycle
  - Message passing patterns
  - Capability security model with examples
  - Error handling with Result/Option types
  - 6 design patterns with code
  - Comparison with other approaches (OOP, Actor Model, FP)
  - Design trade-offs and benefits
  - Notes: Deep architectural documentation complete

- [ ] **Write API reference**
  - Generate with TypeDoc
  - Add examples to each API
  - Notes: Complete API docs (pending TypeDoc generation)

- [ ] **Write tutorial series**
  - Getting started tutorial
  - Building a chat app
  - Building a distributed system
  - Notes: Progressive learning (pending)

- [ ] **Create example applications**
  - Todo app
  - Chat application
  - Microservices example
  - Game server
  - Notes: Real-world examples (pending - many small examples exist)

- [ ] **Polish package metadata**
  - Add keywords
  - Add homepage
  - Add repository links
  - Add license
  - Notes: npm metadata (pending)

- [ ] **Create website (optional)**
  - Documentation site
  - Interactive examples
  - Notes: Could use VitePress (pending)

### 10.6 Community and Release

- [x] **Write CONTRIBUTING.md** ✅
  - Complete contributing guidelines with code of conduct
  - Development setup instructions (Bun, dependencies, build, test)
  - Pull request process (7 steps)
  - Coding standards with TypeScript style guide
  - Testing guidelines with test structure
  - Documentation requirements with JSDoc examples
  - Release process
  - Getting help section
  - Notes: Community guidelines complete

- [x] **Write CHANGELOG.md** ✅
  - Complete CHANGELOG.md with version 0.1.0 release notes
  - Documented all features for initial release
  - Performance characteristics documented
  - Security features documented
  - Testing coverage documented
  - Getting started instructions
  - Migration guide (initial release, no migration needed)
  - Known issues section
  - Roadmap for future versions
  - Notes: Release documentation complete

- [ ] **Create issue templates**
  - Bug report template
  - Feature request template
  - Notes: GitHub templates (pending)

- [ ] **Set up CI/CD for releases**
  - Automatic npm publish
  - Automatic GitHub releases
  - Notes: Automation (pending)

- [ ] **Prepare 0.1.0 release**
  - Tag release
  - Publish to npm
  - Write release notes
  - Notes: First release (pending)

---

## Milestone 11: Advanced Patterns and Extensions

**Goal:** Implement advanced patterns and prepare for future extensions.

**Estimated Effort:** 4-5 days

### 11.1 Saga Pattern

- [ ] **Define saga types**
  - Define `SagaStep` interface
  - Define `Saga` interface
  - Notes: Long-running transactions

- [ ] **Implement saga coordinator**
  - Execute steps sequentially
  - Implement compensation on failure
  - Track saga state
  - Notes: Distributed transactions

- [ ] **Write tests for saga**
  - Test successful saga
  - Test saga compensation
  - Test partial failure
  - Notes: Saga tests

- [ ] **Write saga documentation**
  - Document saga pattern
  - Add usage example
  - Notes: Distributed workflows

### 11.2 CQRS Pattern

- [ ] **Implement command/query separation**
  - Separate read and write capabilities
  - Implement command handler
  - Implement query handler
  - Notes: CQRS pattern

- [ ] **Write CQRS documentation**
  - Document CQRS pattern
  - Add usage example
  - Notes: Read/write separation

### 11.3 Event Sourcing Helpers

- [ ] **Define event sourcing types**
  - Define `Event` interface
  - Define `EventStore` interface
  - Define `Projection` interface
  - Notes: Event sourcing primitives

- [ ] **Implement event store**
  - Append-only event log
  - Event replay
  - Snapshots
  - Notes: Event persistence

- [ ] **Implement projections**
  - Rebuild state from events
  - Multiple projections
  - Notes: Read models

- [ ] **Write tests for event sourcing**
  - Test event append
  - Test replay
  - Test projections
  - Notes: Event sourcing tests

- [ ] **Write event sourcing documentation**
  - Document event sourcing
  - Add usage example
  - Notes: Event-sourced systems

### 11.4 Actor Mobility

- [ ] **Define mobility types**
  - Define `SerializedState` type
  - Define `MobileComponent` interface
  - Notes: Component migration

- [ ] **Implement component serialization**
  - Serialize state
  - Serialize reducer (if possible)
  - Notes: Checkpointing

- [ ] **Implement component migration**
  - Serialize on source
  - Deserialize on destination
  - Redirect messages
  - Notes: Live migration

- [ ] **Write tests for mobility**
  - Test serialization
  - Test deserialization
  - Test migration
  - Notes: Mobility tests

- [ ] **Write mobility documentation**
  - Document mobility
  - Add usage example
  - Notes: Dynamic deployment

### 11.5 Plugin System

- [ ] **Define plugin interface**
  - Define `Plugin` interface
  - Hooks for customization
  - Notes: Extensibility

- [ ] **Implement plugin loading**
  - Register plugins
  - Call plugin hooks
  - Notes: Plugin architecture

- [ ] **Write plugin documentation**
  - Document plugin system
  - Add plugin example
  - Notes: Extending framework

---

## Milestone 12: Ecosystem and Integrations

**Goal:** Create integrations with popular tools and frameworks.

**Estimated Effort:** Variable (ongoing)

### 12.1 Framework Integrations

#### Node.js Server Support

- [ ] **Node.js TCP server adapter**
  - TCP server capability wrapper
  - Connection handling as messages
  - Backpressure support
  - Notes: Low-level TCP server

- [ ] **Node.js UDP server adapter**
  - UDP server capability wrapper
  - Datagram handling as messages
  - Notes: UDP communication

- [ ] **Node.js HTTP server adapter**
  - HTTP server capability wrapper
  - Request/response as messages
  - Middleware support
  - Notes: Plain Node.js HTTP

- [ ] **Node.js HTTPS server adapter**
  - HTTPS server with TLS
  - Certificate management
  - Notes: Secure HTTP

- [ ] **Node.js HTTP/2 server adapter**
  - HTTP/2 server support
  - Stream multiplexing
  - Server push
  - Notes: Modern HTTP

- [ ] **Node.js WebSocket server adapter**
  - WebSocket server capability
  - Connection lifecycle as messages
  - Bidirectional communication
  - Notes: Real-time communication

#### Bun Server Support

- [ ] **Bun TCP server adapter**
  - Bun.serve TCP mode
  - High-performance TCP
  - Notes: Bun-optimized TCP

- [ ] **Bun UDP server adapter**
  - Bun UDP support
  - Fast datagram handling
  - Notes: Bun-optimized UDP

- [ ] **Bun HTTP server adapter**
  - Bun.serve HTTP mode
  - Fast HTTP handling
  - Notes: Bun-optimized HTTP

- [ ] **Bun HTTPS server adapter**
  - Bun.serve with TLS
  - Certificate support
  - Notes: Secure Bun HTTP

- [ ] **Bun HTTP/2 server adapter**
  - Bun HTTP/2 support
  - Stream handling
  - Notes: Bun HTTP/2

- [ ] **Bun WebSocket server adapter**
  - Bun.serve WebSocket mode
  - High-performance WebSocket
  - Notes: Bun-optimized WebSocket

#### Cloudflare Platform Support

- [ ] **Cloudflare Workers HTTP/fetch adapter**
  - Request/Response handling
  - Fetch event adapter
  - Environment bindings
  - Notes: Edge HTTP handling

- [ ] **Cloudflare Durable Objects integration**
  - DO lifecycle integration
  - State persistence
  - Alarm scheduling
  - Notes: Stateful edge objects

- [ ] **Cloudflare Workers RPC integration**
  - RPC between workers
  - Type-safe RPC calls
  - Notes: Inter-worker communication

- [ ] **Cloudflare Workers Scheduled Events**
  - Cron trigger adapter
  - Scheduled message dispatch
  - Notes: Edge cron jobs

- [ ] **Cloudflare Workers Queue integration**
  - Queue consumer adapter
  - Batch processing
  - Notes: Edge message queues

- [ ] **Cloudflare Pages Functions integration**
  - Pages Functions adapter
  - File-based routing
  - Notes: Pages integration

#### Deferred Framework Integrations

- [ ] **Express.js integration** (DEFERRED)
  - HTTP to message adapter
  - Request/reply via HTTP
  - Notes: REST API framework

- [ ] **Fastify integration** (DEFERRED)
  - HTTP to message adapter
  - WebSocket support
  - Notes: Fast web framework

- [ ] **Next.js integration** (DEFERRED)
  - Server components
  - API routes
  - Notes: React framework

- [ ] **Hono integration** (DEFERRED)
  - Edge runtime support
  - Notes: Modern web framework

#### Deferred RPC/Protocol Integrations

- [ ] **Apache Thrift integration** (DEFERRED)
  - Thrift IDL support
  - Code generation
  - Cross-language RPC
  - Notes: Multi-language RPC

- [ ] **gRPC integration** (DEFERRED)
  - Protocol Buffers support
  - HTTP/2 streaming
  - Service definitions
  - Notes: Modern RPC framework

- [ ] **Cap'n Proto RPC integration** (DEFERRED)
  - Cap'n Proto RPC protocol
  - Zero-copy serialization
  - Promise pipelining
  - Notes: High-performance RPC

### 12.2 Database Integrations

#### SQLite Support

- [ ] **SQLite adapter for Node.js**
  - better-sqlite3 integration
  - Synchronous queries as messages
  - Transaction support
  - Notes: Fast embedded SQL (Node.js)

- [ ] **SQLite adapter for Bun**
  - Bun.SQLite integration
  - Native Bun SQL support
  - High-performance queries
  - Notes: Fast embedded SQL (Bun)

- [ ] **Cloudflare D1 adapter**
  - D1 database integration
  - SQL operations as messages
  - Edge database queries
  - Notes: Cloudflare edge SQL

#### PostgreSQL Support

- [ ] **PostgreSQL adapter**
  - pg/node-postgres integration
  - Connection pooling
  - Prepared statements
  - Transaction support
  - Notes: Production relational DB

#### Key-Value and Cache Stores

- [ ] **Redis adapter**
  - Cache operations as messages
  - Pub/sub via Redis
  - Connection pooling
  - Pipeline support
  - Notes: Cache and messaging

- [ ] **Memcached adapter**
  - Cache operations as messages
  - Binary protocol support
  - Connection pooling
  - Notes: Distributed cache

#### Multi-Model Databases

- [ ] **SurrealDB adapter**
  - Multi-model operations as messages
  - Graph, document, key-value support
  - Real-time subscriptions
  - Notes: Modern multi-model DB

- [ ] **MongoDB adapter**
  - Document operations as messages
  - Change streams support
  - Connection pooling
  - Notes: Document database

#### Deferred Database Integrations

- [ ] **MySQL/MariaDB adapter** (DEFERRED)
  - SQL operations as messages
  - Connection pooling
  - Notes: Popular relational DB

- [ ] **CockroachDB adapter** (DEFERRED)
  - Distributed SQL
  - PostgreSQL wire protocol
  - Notes: Distributed relational DB

- [ ] **Cassandra adapter** (DEFERRED)
  - Wide-column operations
  - Distributed queries
  - Notes: Wide-column store

- [ ] **Neo4j adapter** (DEFERRED)
  - Graph queries as messages
  - Cypher query language
  - Notes: Graph database

- [ ] **DynamoDB adapter** (DEFERRED)
  - AWS DynamoDB operations
  - Key-value and document support
  - Notes: AWS NoSQL

- [ ] **ClickHouse adapter** (DEFERRED)
  - Column-oriented analytics
  - Real-time queries
  - Notes: Analytics database

- [ ] **TimescaleDB adapter** (DEFERRED)
  - Time-series operations
  - PostgreSQL extension
  - Notes: Time-series database

### 12.3 Message Queue Integrations

- [ ] **RabbitMQ transport**
  - AMQP protocol
  - Queue-based messaging
  - Notes: Message broker

- [ ] **Kafka transport**
  - Event streaming
  - Topic-based messaging
  - Notes: Event log

- [ ] **NATS transport**
  - Lightweight messaging
  - Subject-based routing
  - Notes: Cloud-native messaging

### 12.4 Observability Integrations

- [ ] **OpenTelemetry integration**
  - Full tracing support
  - Metrics export
  - Notes: Standard observability

- [ ] **Prometheus integration**
  - Metrics export
  - Notes: Monitoring

- [ ] **Grafana dashboards**
  - Pre-built dashboards
  - Notes: Visualization

### 12.5 DevTools

- [ ] **VS Code extension**
  - Component visualization
  - Message flow diagram
  - Notes: IDE integration

- [ ] **Chrome DevTools extension**
  - Browser debugging
  - Notes: Browser development

- [ ] **CLI tool**
  - Component scaffolding
  - Code generation
  - Notes: Developer tool

---

## Milestone 13: Runtime Environment and Platform Capabilities

**Goal:** Implement capability-based runtime environment abstractions for all major platforms, eliminating ambient authority and enabling platform-agnostic application code.

**Estimated Effort:** 10-12 days

### 13.1 Capability Package: Environment (@servicejs/capability-env)

- [x] **Define environment capability interface**
  - Define `EnvironmentCapability` interface
  - Define `Platform` union type
  - Define error types
  - Notes: Read-only access to environment variables ✅

- [x] **Implement in-memory environment**
  - Create `createInMemoryEnv` factory
  - Accept vars map and platform
  - Implement get/getAll methods
  - Notes: For testing ✅

- [x] **Write tests for environment capability**
  - Test get returns Some when key exists
  - Test get returns None when key missing
  - Test getAll returns all variables
  - Test platform identifier
  - Notes: Comprehensive coverage ✅

- [x] **Write environment capability documentation**
  - Document interface and usage
  - Add examples for testing
  - Notes: Complete README.md ✅

### 13.2 Capability Package: Time (@servicejs/capability-time)

- [x] **Define time capability interface**
  - Define `TimeCapability` interface
  - Define `TimeError` type
  - Support now(), setTimeout, setInterval, hrtime
  - Notes: Return Result, never throw ✅

- [x] **Implement fake time**
  - Create `createFakeTime` factory
  - Support controllable time advancement
  - Implement timer queue with sorting
  - Support tick() and advance(ms)
  - Notes: For deterministic testing ✅

- [x] **Implement no-op time**
  - All timers are no-ops
  - Now() returns fixed time
  - Notes: For tests that don't need time ✅

- [x] **Write tests for time capability**
  - Test setTimeout schedules correctly
  - Test setInterval recurs
  - Test cancel functions work
  - Test fake time advancement
  - Test timer ordering
  - Notes: Test both real and fake implementations ✅

- [x] **Write time capability documentation**
  - Document interface
  - Add fake time examples
  - Notes: Complete README.md with deterministic testing guide ✅

### 13.3 Capability Package: Lifecycle (@servicejs/capability-lifecycle)

- [x] **Define lifecycle capability interface**
  - Define `LifecycleCapability` interface
  - Define `ShutdownSignal` type
  - Define `ShutdownHandler` type
  - Define `ShutdownSignalMessage` message type
  - Notes: Graceful shutdown coordination ✅

- [x] **Implement in-memory lifecycle**
  - Create `createInMemoryLifecycle` factory
  - Track shutdown handlers
  - Implement onShutdown registration
  - Implement shutdown execution (LIFO order)
  - Support shutdown signals capability
  - Notes: For testing ✅

- [x] **Write tests for lifecycle capability**
  - Test onShutdown registers handlers
  - Test shutdown calls handlers in reverse order (LIFO)
  - Test shutdown signals emitted
  - Test unregister works
  - Notes: Test handler execution ✅

- [x] **Write lifecycle capability documentation**
  - Document interface
  - Add shutdown coordination examples
  - Notes: Complete README.md with graceful shutdown patterns ✅

### 13.4 Capability Package: File System (@servicejs/capability-fs)

- [x] **Define file system capability interface**
  - Define `FileSystemCapability` interface
  - Define `FileStats` type
  - Define `FSError` type with standard codes
  - Support readFile, writeFile, exists, readdir, stat, mkdir, remove
  - Notes: All operations return Result ✅

- [x] **Implement in-memory file system**
  - Create `createInMemoryFS` factory
  - Use Map for file storage
  - Implement directory tree structure
  - Support all CRUD operations
  - Notes: Fast, deterministic testing ✅

- [x] **Implement no-op file system**
  - All operations return errors
  - Notes: For tests that shouldn't touch FS ✅

- [x] **Write tests for file system capability**
  - Test readFile success and ENOENT
  - Test writeFile creates/updates
  - Test mkdir with recursive option
  - Test readdir lists files
  - Test remove deletes files/dirs
  - Test stat returns metadata
  - Notes: Comprehensive FS operations ✅

- [x] **Write file system capability documentation**
  - Document interface
  - Add in-memory FS examples
  - Notes: Complete README.md with testing patterns ✅

### 13.5 Capability Package: HTTP (@servicejs/capability-http)

- [x] **Define HTTP capability interface**
  - Define `HTTPCapability` interface
  - Define `HTTPRequest` type
  - Define `HTTPResponse` type
  - Define `HTTPError` type
  - Support request, get, post, put, delete methods
  - Notes: All operations return Result ✅

- [x] **Implement mock HTTP client**
  - Create `createMockHTTP` factory
  - Store mock responses by URL
  - Match requests to responses
  - Support wildcard/regex matching
  - Notes: Powerful testing tool ✅

- [x] **Implement no-op HTTP client**
  - All requests return errors
  - Notes: For tests that shouldn't make requests ✅

- [x] **Write tests for HTTP capability**
  - Test request makes HTTP call
  - Test get/post/put/delete convenience methods
  - Test mock HTTP matches responses
  - Test timeout errors
  - Test network errors
  - Notes: Mock-based testing ✅

- [x] **Write HTTP capability documentation**
  - Document interface
  - Add mock HTTP examples
  - Notes: Complete README.md with API testing patterns ✅

### 13.6 Capability Package: Console (@servicejs/capability-console)

- [x] **Define console capability interface**
  - Define `ConsoleCapability` interface
  - Define `ConsoleError` type
  - Support log, info, warn, error, debug methods
  - Notes: All operations return Result ✅

- [x] **Implement buffered console**
  - Create `createBufferedConsole` factory
  - Store log messages in array
  - Support getLogs() and clear()
  - Notes: Test assertions on logs ✅

- [x] **Implement no-op console**
  - Create `createNoOpConsole` factory
  - All operations are no-ops
  - Notes: Silent testing ✅

- [x] **Write tests for console capability**
  - Test log stores messages
  - Test each log level
  - Test getLogs returns messages
  - Test clear empties buffer
  - Notes: Buffered console testing ✅

- [x] **Write console capability documentation**
  - Document interface
  - Add testing examples
  - Notes: Complete README.md with log capture patterns ✅

### 13.7 Capability Package: Streams (@servicejs/capability-streams)

- [x] **Define streams capability interface**
  - Define `StreamsCapability` interface
  - Define `ReadableStreamCapability` interface
  - Define `WritableStreamCapability` interface
  - Define `StreamError` type
  - Notes: stdin/stdout/stderr abstraction ✅

- [x] **Implement in-memory streams**
  - Create `createInMemoryStreams` factory
  - Use Uint8Array buffers
  - Support read/write operations
  - Notes: Testing I/O ✅

- [x] **Write tests for streams capability**
  - Test read from readable stream
  - Test write to writable stream
  - Test close operations
  - Test EOF handling
  - Notes: Stream operations ✅

- [x] **Write streams capability documentation**
  - Document interface
  - Add testing examples
  - Notes: Complete README.md with I/O patterns ✅

### 13.8 Capability Package: Crypto (@servicejs/capability-crypto)

- [x] **Define crypto capability interface**
  - Define `CryptoCapability` interface
  - Define `HashAlgorithm` type
  - Define `CryptoError` type
  - Support randomBytes, randomUUID, hash, hmac
  - Notes: Cryptographic operations ✅

- [x] **Implement deterministic crypto**
  - Create `createDeterministicCrypto` factory
  - Use seedable PRNG for testing
  - Support all hash algorithms
  - Notes: Reproducible tests ✅

- [x] **Write tests for crypto capability**
  - Test randomBytes generates bytes
  - Test randomUUID generates valid UUIDs
  - Test hash produces correct hashes
  - Test hmac produces correct MACs
  - Test deterministic crypto is reproducible
  - Notes: Crypto operations ✅

- [x] **Write crypto capability documentation**
  - Document interface
  - Add deterministic crypto examples
  - Notes: Complete README.md with testing guide ✅

### 13.9 Runtime Package: Node.js (@servicejs/runtime-node)

- [x] **Define Node.js runtime capabilities**
  - Define `NodeRuntimeCapabilities` interface
  - Define `NodeProcessCapability` interface
  - Define `NodeBootstrapOptions` interface
  - Notes: Extends all capability interfaces ✅

- [x] **Implement bootstrap function**
  - Create `bootstrap` function
  - Wrap process.env for env capability
  - Wrap timers for time capability
  - Set up process signal handlers (SIGTERM, SIGINT, SIGUSR2)
  - Wrap fs promises for file system
  - Wrap fetch/http for HTTP
  - Wrap console for console capability
  - Wrap stdin/stdout/stderr for streams
  - Wrap crypto for crypto capability
  - Expose process metadata (pid, cwd, argv, platform, arch)
  - Notes: Complete Node.js integration ✅

- [x] **Implement signal handling**
  - Capture SIGTERM, SIGINT, SIGUSR2
  - Convert to shutdown signals
  - Support graceful shutdown
  - Notes: Production-ready shutdown ✅

- [x] **Implement error handling**
  - Capture uncaughtException
  - Capture unhandledRejection
  - Trigger shutdown on errors
  - Notes: Error recovery ✅

- [x] **Write tests for Node.js runtime**
  - Test bootstrap creates all capabilities
  - Test signal handlers work
  - Test error handlers work
  - Test shutdown coordination
  - Notes: Integration tests ✅

- [x] **Write Node.js runtime documentation**
  - Document bootstrap options
  - Add usage examples
  - Add shutdown examples
  - Notes: Complete README.md with comprehensive guide ✅

### 13.10 Runtime Package: Browser (@servicejs/runtime-browser)

- [x] **Define browser runtime capabilities**
  - Define `BrowserRuntimeCapabilities` interface
  - Define `WindowCapability` interface
  - Define `StorageCapability` interface
  - Define `BrowserBootstrapOptions` interface
  - Notes: Browser-specific features ✅

- [x] **Implement bootstrap function**
  - Create `bootstrap` function
  - Use empty env (browsers don't have env vars)
  - Wrap timers for time capability
  - Set up beforeunload for shutdown
  - Wrap fetch for HTTP
  - Wrap console for console capability
  - Wrap Web Crypto API for crypto
  - Expose window metadata
  - Wrap localStorage/sessionStorage
  - Notes: Browser integration ✅

- [x] **Implement lifecycle handling**
  - Use beforeunload event
  - Support graceful shutdown
  - Notes: Browser lifecycle ✅

- [x] **Write tests for browser runtime**
  - Test bootstrap creates capabilities
  - Test lifecycle handlers
  - Test storage operations
  - Notes: Tests implemented ✅

- [x] **Write browser runtime documentation**
  - Document bootstrap
  - Add usage examples
  - Notes: Complete README.md with browser patterns ✅

### 13.11 Runtime Package: Workers (@servicejs/runtime-*-worker)

- [ ] **Implement Node.js worker runtime (@servicejs/runtime-node-worker)**
  - Similar to runtime-node but uses parentPort
  - Support worker_threads communication
  - Notes: Not yet implemented

- [x] **Implement Web Worker runtime (@servicejs/runtime-web-worker)**
  - Similar to runtime-browser but uses self
  - No DOM access
  - Notes: Web Worker environment ✅

- [x] **Implement Shared Worker runtime (@servicejs/runtime-shared-worker)**
  - Multiple connection support
  - Port-based communication
  - Notes: Shared Worker specifics ✅

- [x] **Implement Service Worker runtime (@servicejs/runtime-service-worker)**
  - Add caches capability (Cache Storage API)
  - Add fetch interception capability
  - Notes: Service Worker features ✅

- [x] **Write tests for worker runtimes**
  - Test each worker runtime
  - Test communication patterns
  - Notes: Worker-specific tests ✅

- [x] **Write worker runtime documentation**
  - Document each runtime
  - Add usage examples
  - Notes: Complete READMEs for Web Worker, Shared Worker, and Service Worker ✅

### 13.12 Runtime Package: Edge and Alternative Runtimes

- [x] **Implement Cloudflare Workers runtime (@servicejs/runtime-cloudflare)**
  - Per-request lifecycle model
  - Wrap env bindings (KV, R2, DO)
  - No traditional shutdown
  - Notes: Edge runtime specifics ✅

- [x] **Implement Deno runtime (@servicejs/runtime-deno)**
  - Similar to Node.js but uses Deno namespace
  - Wrap Deno.env for environment
  - Wrap Deno.* APIs
  - Notes: Deno-specific features ✅

- [x] **Implement Bun runtime (@servicejs/runtime-bun)**
  - Wrap Bun-specific APIs (Bun.file, Bun.write, Bun.CryptoHasher)
  - Optimize for Bun's performance characteristics
  - Notes: Bun optimizations implemented ✅

- [x] **Write tests for edge runtimes**
  - Test Cloudflare Workers
  - Test Deno runtime
  - Test Bun runtime
  - Notes: Edge-specific tests ✅

- [x] **Write edge runtime documentation**
  - Document each runtime
  - Add deployment examples
  - Notes: Complete READMEs with deployment guides ✅

### 13.13 Integration and Examples

- [x] **Create platform-agnostic example app**
  - Write app using only capability interfaces
  - Run on Node.js
  - Run in browser
  - Run in Deno
  - Notes: Examples provided in each runtime package ✅

- [x] **Create testing guide**
  - Show how to test with mock capabilities
  - Show fake time usage
  - Show in-memory FS usage
  - Notes: Testing examples in capability package READMEs ✅

- [ ] **Create migration guide**
  - From direct global access to capabilities
  - Show refactoring patterns
  - Notes: Not yet created as separate guide

- [x] **Write comprehensive runtime documentation**
  - Overview of runtime system
  - Capability vs runtime packages
  - Platform selection guide
  - Testing strategies
  - Notes: Complete documentation in individual package READMEs ✅

### 13.14 Package Configuration

- [x] **Create package.json for all capability packages**
  - @servicejs/capability-env ✅
  - @servicejs/capability-time ✅
  - @servicejs/capability-lifecycle ✅
  - @servicejs/capability-fs ✅
  - @servicejs/capability-http ✅
  - @servicejs/capability-console ✅
  - @servicejs/capability-streams ✅
  - @servicejs/capability-crypto ✅
  - Notes: All packages have proper package.json with consistent structure ✅

- [x] **Create package.json for all runtime packages**
  - @servicejs/runtime-node ✅
  - @servicejs/runtime-browser ✅
  - @servicejs/runtime-web-worker ✅
  - @servicejs/runtime-shared-worker ✅
  - @servicejs/runtime-service-worker ✅
  - @servicejs/runtime-cloudflare ✅
  - @servicejs/runtime-deno ✅
  - @servicejs/runtime-bun ✅
  - Notes: All packages configured with platform-specific dependencies ✅

- [x] **Set up build configuration**
  - Configure tsup for each package
  - Set up TypeScript configs
  - Configure exports
  - Notes: Build pipeline configured for all packages ✅

---

## Ongoing Tasks

### Documentation

- [ ] **Keep API docs up to date**
  - Update on every change
  - Generate with TypeDoc
  - Notes: Continuous

- [ ] **Write blog posts**
  - Announce releases
  - Explain concepts
  - Share use cases
  - Notes: Community engagement

- [ ] **Create video tutorials**
  - Getting started
  - Advanced patterns
  - Notes: Video content

### Community

- [ ] **Set up Discord/Slack**
  - Community support
  - Notes: Communication channel

- [ ] **Respond to issues**
  - Bug reports
  - Feature requests
  - Notes: Ongoing

- [ ] **Review pull requests**
  - Code review
  - Feedback
  - Notes: Ongoing

### Maintenance

- [ ] **Update dependencies**
  - Keep up to date
  - Security patches
  - Notes: Monthly

- [ ] **Monitor performance**
  - Run benchmarks
  - Track regressions
  - Notes: Continuous

- [ ] **Fix bugs**
  - Prioritize by severity
  - Notes: Ongoing

---

## Summary

This implementation plan covers:

- **12 major milestones** with detailed tasks
- **200+ specific implementation tasks**
- **Testing for every feature**
- **Documentation for every component**
- **Examples for every concept**
- **Integrations with ecosystem**
- **Ongoing maintenance tasks**

The plan is designed to be:

- **Incremental**: Each milestone builds on previous
- **Testable**: Every feature has tests
- **Documented**: Every component has docs
- **Validated**: Examples prove features work
- **Comprehensive**: Covers all aspects of framework

Progress tracking: Use checkboxes to mark completed tasks. Update regularly to reflect actual progress.

**Estimated Total Effort:** 35-45 days of focused development, excluding ecosystem integrations and ongoing maintenance.

---

## Additional Packages Implemented (Beyond Original Plan)

The following packages were implemented during Phase 1 but were not in the original implementation plan. These packages significantly extend the type-level programming capabilities and add important infrastructure:

### Type-Level Programming Extensions

- **@servicejs/hkt-arithmetic** - Type-level arithmetic operations (Add, Subtract, Multiply, Divide, Pow, Mod, comparisons, bit operations)
- **@servicejs/hkt-boolean** - Type-level boolean logic (And, Or, Not, Xor, If, All, Any)
- **@servicejs/hkt-string** - Type-level string manipulation (Uppercase, Lowercase, Capitalize, Concat, Length, StartsWith, EndsWith)
- **@servicejs/hkt-tuple** - Type-level tuple operations (Head, Tail, Length, Concat, Reverse, Map, Filter, Reduce)
- **@servicejs/hkt-object** - Type-level object manipulation (Keys, Values, Pick, Omit, Merge, Partial, Required, MapValues)
- **@servicejs/hkt-combinator** - Higher-order functions for HKTOs (map, andThen, orElse, fold, foldMap, traverse, sequence, ap, liftA2)
- **@servicejs/hkt-compose** - Function composition utilities (Compose, Pipe, Curry, Uncurry, Partial)

### Additional Data Types

- **@servicejs/nonempty-array** - Non-empty array type guaranteeing at least one element at compile time
- **@servicejs/these** - Three-state type (This, That, Both) for validation with warnings and partial failures
- **@servicejs/validation** - Error-accumulating validation type for form validation and data validation

### Infrastructure Packages

- **@servicejs/config** - Configuration management with environment variable loading and validation
- **@servicejs/di** - Dependency injection system with token-based DI and capability adapters for ports-and-adapters architecture

### Notes

These additional packages were implemented to:

1. Provide comprehensive type-level programming capabilities
2. Support advanced functional programming patterns
3. Enable robust configuration and dependency injection
4. Demonstrate the full power of the HKT system

All packages follow the same quality standards:

- Complete implementations with full type safety
- Comprehensive test coverage
- Detailed README documentation with examples
- Consistent package structure and exports

---

**End of Implementation Plan**
