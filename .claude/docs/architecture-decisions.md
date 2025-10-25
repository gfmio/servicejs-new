# Architecture Decision Records

**Last Updated:** 2025-10-25

This document records key architectural decisions made during ServiceJS development.

---

## ADR-001: Higher-Kinded Types Foundation

**Status:** Accepted

**Context:**
TypeScript doesn't natively support higher-kinded types, but they're crucial for type-safe, composable abstractions.

**Decision:**
Implement HKT encoding using the Args/Result pattern with unique symbols.

**Rationale:**
- **Type Safety**: Compile-time verification of protocols
- **Composability**: HKTFs and HKTOs compose naturally
- **Zero Runtime**: Pure type-level, no runtime overhead
- **Extensibility**: Users can define custom HKTFs/HKTOs

**Consequences:**
- ✅ Enables sophisticated type-level programming
- ✅ Protocol verification at compile time
- ✅ Zero-cost abstraction
- ❌ Learning curve for developers unfamiliar with HKTs
- ❌ Complex type errors can be hard to debug

**Alternatives Considered:**
- Type classes (not supported in TypeScript)
- Conditional types only (too limited)
- Runtime encoding (performance overhead)

---

## ADR-002: Args/Result Pattern Over Conditional Types

**Status:** Accepted

**Context:**
Need a consistent way to define HKTFs that works with TypeScript's type system.

**Decision:**
Use explicit `ArgsSymbol` and `ResultSymbol` with interfaces extending `HKTF.Base`.

```typescript
interface MyHKTFArgs { input: number; }
interface MyHKTFResult<T extends MyHKTFArgs> { output: T['input']; }
interface MyHKTF extends HKTF.Base {
  [HKTF.ArgsSymbol]: MyHKTFArgs;
  [HKTF.ResultSymbol]: MyHKTFResult<HKTF.Args<this>>;
}
```

**Rationale:**
- Avoids TypeScript distributivity issues
- Explicit argument structure
- Better type inference
- Consistent pattern across all HKTFs

**Consequences:**
- ✅ Reliable type inference
- ✅ No distributivity bugs
- ✅ Clear, consistent pattern
- ❌ More verbose than conditional types
- ❌ Requires understanding of pattern

---

## ADR-003: FunctionHKTF for All Function Types

**Status:** Accepted

**Context:**
Method dispatch requires function types to be HKTFs, not raw function types.

**Decision:**
All functions in the system must be represented as `FunctionHKTF.Fn1`, `FunctionHKTF.Fn2`, etc.

**Rationale:**
- Enables pattern matching in Method dispatch
- Consistent with HKTO philosophy
- Allows function composition at type level

**Consequences:**
- ✅ Type-safe method dispatch
- ✅ Composable function types
- ❌ Cannot use raw `(a: A) => B` types
- ❌ More verbose function signatures

---

## ADR-004: Capability-Based Security Model

**Status:** Accepted

**Context:**
Traditional ambient authority (global variables, imports) is a security risk and makes testing hard.

**Decision:**
All platform access must go through explicit capability references. No ambient authority.

**Rationale:**
- **Security**: Principle of least privilege enforced structurally
- **Testability**: Easy to mock capabilities
- **Auditability**: Clear dependency graph
- **Composability**: Capabilities can be wrapped, filtered, attenuated

**Consequences:**
- ✅ Structurally secure
- ✅ Easy to test
- ✅ Clear dependencies
- ❌ More verbose than global imports
- ❌ Requires discipline to maintain

**Alternatives Considered:**
- Dependency injection only (not secure)
- Effect systems (too complex)
- Ambient authority (insecure, hard to test)

---

## ADR-005: Result Types Over Exceptions

**Status:** Accepted

**Context:**
JavaScript exceptions are not type-safe and can be thrown from anywhere.

**Decision:**
All fallible operations return `Result<T, E>`. Exceptions only for programmer errors.

**Rationale:**
- **Type Safety**: Errors are part of the signature
- **Explicit**: Caller must handle errors
- **Composable**: Result has map, andThen, etc.
- **No Surprises**: No hidden control flow

**Consequences:**
- ✅ Type-safe error handling
- ✅ Explicit error paths
- ✅ Composable with other Results
- ❌ More verbose than try/catch
- ❌ Cannot use with libraries that throw

---

## ADR-006: Separate Capability Packages vs Bundled Runtime

**Status:** Accepted

**Context:**
Different platforms (Node, Deno, Browser) need different implementations, but application code should be platform-agnostic.

**Decision:**
Separate `@servicejs/capability-*` packages (interfaces) from `@servicejs/runtime-*` packages (implementations).

**Rationale:**
- **Testability**: Use in-memory implementations in tests
- **Flexibility**: Swap implementations without changing code
- **Clarity**: Clear separation of interface and implementation
- **Reusability**: Capability interfaces work across all runtimes

**Consequences:**
- ✅ Platform-agnostic application code
- ✅ Easy testing with fakes
- ✅ Clear dependency structure
- ❌ More packages to maintain
- ❌ Need to install both capability and runtime packages

---

## ADR-007: LIFO Shutdown Handler Execution

**Status:** Accepted

**Context:**
When shutting down, resources must be cleaned up in reverse order of initialization.

**Decision:**
Shutdown handlers execute in LIFO (Last-In-First-Out) order.

**Rationale:**
- **Correctness**: Resource B depending on A must clean up before A
- **Predictability**: Clear, deterministic order
- **Standard**: Matches RAII, context managers, try/finally

Example:
```typescript
lifecycle.onShutdown(async () => console.log('DB connected'));    // 1st registered
lifecycle.onShutdown(async () => console.log('Server started'));  // 2nd registered

await lifecycle.shutdown();
// Output:
// Server started   (2nd registered, runs FIRST)
// DB connected     (1st registered, runs LAST)
```

**Consequences:**
- ✅ Correct cleanup order
- ✅ Predictable behavior
- ✅ Matches other languages
- ❌ May be surprising if not documented

---

## ADR-008: Fire-and-Forget Message Passing

**Status:** Accepted

**Context:**
Synchronous request/reply couples components and reduces composability.

**Decision:**
Message passing is fire-and-forget by default. Request/reply is a pattern built on top.

**Rationale:**
- **Decoupling**: Sender doesn't wait for receiver
- **Composability**: Messages can be intercepted, logged, transformed
- **Performance**: No blocking on sends
- **Flexibility**: Request/reply when needed, fire-and-forget otherwise

**Consequences:**
- ✅ Highly decoupled components
- ✅ Flexible message routing
- ✅ High performance
- ❌ Request/reply requires explicit pattern
- ❌ More complex than simple function calls

---

## ADR-009: Immutable Messages

**Status:** Accepted

**Context:**
Mutable messages can lead to race conditions and temporal coupling.

**Decision:**
All messages are immutable (readonly). Components must not mutate messages.

**Rationale:**
- **Safety**: No race conditions
- **Time-Travel**: Can replay message sequences
- **Caching**: Can cache by message identity
- **Event Sourcing**: Natural fit for event logs

**Consequences:**
- ✅ Thread-safe message passing
- ✅ Enables time-travel debugging
- ✅ Enables event sourcing
- ❌ Must create new messages for changes
- ❌ Potential memory overhead (mitigated by structural sharing)

---

## ADR-010: Reducer State Transitions

**Status:** Accepted

**Context:**
Components need to evolve their behavior over time (session types, state machines).

**Decision:**
Reducers return `{ state, reducer, effects }` allowing reducer replacement.

**Rationale:**
- **Session Types**: Type-safe protocol evolution
- **State Machines**: Different states = different reducers
- **Flexibility**: Hot-swap behavior at runtime
- **Type Safety**: Each reducer enforces its own invariants

**Consequences:**
- ✅ Type-safe session types
- ✅ Clean state machine implementation
- ✅ Runtime behavior evolution
- ❌ More complex than simple state updates
- ❌ Requires understanding of pattern

---

## ADR-011: Zero Runtime Overhead for HKTs

**Status:** Accepted

**Context:**
Type-level programming should not impact runtime performance.

**Decision:**
All HKT types erase to nothing at runtime. Zero runtime overhead.

**Rationale:**
- **Performance**: No boxing, no wrappers, no runtime checks
- **Bundle Size**: No runtime code added
- **Adoption**: Can use in performance-critical code

**Consequences:**
- ✅ Zero performance impact
- ✅ Zero bundle size impact
- ✅ Can use everywhere
- ❌ No runtime validation of HKT correctness (TypeScript handles this)

---

## ADR-012: Comprehensive Type Utilities

**Status:** Accepted

**Context:**
Need multiple ways to handle optionality and errors.

**Decision:**
Provide Option, Result, Either, Validation, These, NonEmptyArray - each for specific use cases.

**Rationale:**
- **Option**: Simple absence (no error info)
- **Result**: Operations that fail (with error info)
- **Either**: Two distinct value types
- **Validation**: Accumulate multiple errors
- **These**: Success with warnings
- **NonEmptyArray**: Type-safe non-empty arrays

**Consequences:**
- ✅ Right tool for each situation
- ✅ Composable types
- ❌ More types to learn
- ❌ Need decision guide (provided in docs)

---

## Summary

These ADRs document the key architectural decisions that shape ServiceJS:

1. **HKT Foundation**: Type-safe, composable abstractions
2. **Capability-Based Security**: No ambient authority
3. **Result Types**: Explicit error handling
4. **Immutability**: Safe concurrency
5. **Message Passing**: Decoupled components

Each decision optimizes for:
- **Type Safety**: Catch errors at compile time
- **Testability**: Easy to test in isolation
- **Composability**: Components compose naturally
- **Security**: Principle of least privilege
- **Performance**: Zero-cost abstractions

For implementation details, see:
- `.claude/docs/hkt.md` - HKT pattern guide
- `.claude/docs/capability-patterns.md` - Capability design
- `.claude/docs/type-utilities-guide.md` - Type utility decision guide
