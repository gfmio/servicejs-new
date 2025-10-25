# @servicejs/hkt-core

Core Higher-Kinded Types (HKT) infrastructure for ServiceJS - type-level programming foundation.

## Features

- **HKTF (Higher-Kinded Type Functions)** - Type-level functions with explicit Args/Result pattern
- **HKTO (Higher-Kinded Type Objects)** - Type-level message dispatchers built from methods
- **Method Pattern** - Message handlers as type-level functions
- **Function HKTFs** - Type-safe representations of runtime functions
- **Type Utilities** - Comprehensive type-level programming utilities
- **Protocol Verification** - Compile-time protocol checking
- **Session Types** - Type-safe communication patterns

## Installation

```bash
bun add @servicejs/hkt-core
```

## Why HKT?

Higher-Kinded Types enable **type-level programming** - writing functions that operate on types themselves, not just values. This provides:

1. **Compile-Time Verification** - Catch protocol errors before runtime
2. **Type-Safe Sessions** - Ensure message sequences are correct
3. **Generic Abstractions** - Write code that works across many types
4. **Zero Runtime Cost** - All type-level code disappears after compilation

## Core Concepts

### HKTF (Higher-Kinded Type Function)

A type-level function that takes type arguments and returns a type.

```typescript
import { HKTF } from '@servicejs/hkt-core';

// Define an HKTF
interface ToArray extends HKTF.Base {
  [HKTF.ArgsSymbol]: { value: unknown };
  [HKTF.ResultSymbol]: Array<HKTF.Args<this>['value']>;
}

// Apply the HKTF
type Result = HKTF.Apply<ToArray, { value: number }>;
// Result: number[]
```

### The Args/Result Pattern

**All HKTFs in ServiceJS use the explicit Args/Result pattern:**

```typescript
// 1. Define Args interface
interface MyFunctionArgs {
  input: string;
  options: boolean;
}

// 2. Define Result interface (parameterized by Args)
interface MyFunctionResult<T extends MyFunctionArgs> {
  output: T['input'];
  success: T['options'];
}

// 3. Define HKTF combining Args and Result
interface MyFunction extends HKTF.Base {
  [HKTF.ArgsSymbol]: MyFunctionArgs;
  [HKTF.ResultSymbol]: MyFunctionResult<HKTF.Args<this>>;
}
```

**Why This Pattern?**
- ✅ **Type Safety** - No `this` type access issues in object literals
- ✅ **Clarity** - Args and Result are explicit and understandable
- ✅ **Reusability** - Args/Result types can be referenced independently
- ✅ **Debuggability** - Clear TypeScript error messages

### Function HKTFs

**Critical Rule: All functions MUST be represented as HKTFs, not raw function types.**

```typescript
import { FunctionHKTF } from '@servicejs/hkt-core';

// ❌ WRONG: Raw function type
interface BadMessage {
  callback: (x: number) => string;
}

// ✅ CORRECT: Function HKTF
interface GoodMessage {
  callback: FunctionHKTF.Fn1<number, string>;
}
```

**Why?** Raw function types cannot be pattern-matched at the type level:

```typescript
// Extract return type
type ExtractOutput<F> = F extends FunctionHKTF.Fn1<any, infer O> ? O : never;

type Output1 = ExtractOutput<FunctionHKTF.Fn1<number, string>>; // string ✅
type Output2 = ExtractOutput<(x: number) => string>; // never ❌
```

### HKTO (Higher-Kinded Type Object)

Type-level objects that dispatch messages to methods.

```typescript
import { HKTO, Method, FunctionHKTF } from '@servicejs/hkt-core';

// Define methods
interface IncrementMethod extends Method.Base<
  { type: 'increment'; amount: number },
  CounterHKTO
> {}

interface DecrementMethod extends Method.Base<
  { type: 'decrement'; amount: number },
  CounterHKTO
> {}

interface GetValueMethod extends Method.Base<
  { type: 'getValue' },
  number
> {}

// Combine methods into HKTO
interface CounterHKTO extends HKTO.Combine<readonly [
  IncrementMethod,
  DecrementMethod,
  GetValueMethod
]> {}

// Use HKTO
type Result1 = HKTO.Send<CounterHKTO, { type: 'increment'; amount: 5 }>;
// Result1: CounterHKTO

type Result2 = HKTO.Send<CounterHKTO, { type: 'getValue' }>;
// Result2: number

type Result3 = HKTO.Send<CounterHKTO, { type: 'unknown' }>;
// Result3: MethodNotFoundError<'unknown', CounterHKTO>
```

## API Reference

### HKTF Namespace

#### Core Types

```typescript
// Base interface for all HKTFs
interface HKTF.Base {
  [ArgsSymbol]: unknown;
  [DefaultsSymbol]?: unknown;
  [ResultSymbol]: unknown;
}

// Extract arguments (with defaults merged)
type HKTF.Args<F extends HKTF.Base>

// Extract result type
type HKTF.Result<F extends HKTF.Base>

// Apply HKTF with arguments
type HKTF.Apply<F extends HKTF.Base, Input>

// Partial application (set defaults)
type HKTF.PartialApply<F extends HKTF.Base, NewDefaults>

// Convert HKTF to runtime function type
type HKTF.ToFunction<F extends HKTF.Base>
```

### HKTO Namespace

```typescript
// Base interface for HKTOs
interface HKTO.Base extends HKTF.Base

// Send message to HKTO (dispatch to method)
type HKTO.Send<O extends HKTO.Base, Message>

// Combine methods into HKTO
interface HKTO.Combine<Methods extends readonly Method.Base[]>

// Extract all message types from methods
type HKTO.ExtractMessages<Methods>
```

### Method Namespace

```typescript
// Base interface for methods
interface Method.Base<Message = unknown, Result = unknown> extends HKTF.Base

// Extract message type from method
type Method.MessageOf<M extends Method.Base>

// Extract result type from method
type Method.ResultOf<M extends Method.Base>
```

### FunctionHKTF Namespace

```typescript
// Unary function
interface FunctionHKTF.Fn1<Input, Output> extends HKTF.Base

// Binary function
interface FunctionHKTF.Fn2<Input1, Input2, Output> extends HKTF.Base

// Predicate (function returning boolean)
interface FunctionHKTF.Predicate<T> extends Fn1<T, boolean>

// Reducer (accumulator function)
interface FunctionHKTF.Reducer<Acc, Val> extends HKTF.Base
```

## Examples

### Example 1: Type-Safe Option

```typescript
import { HKTO, Method, FunctionHKTF, HKTF } from '@servicejs/hkt-core';

// Map method for Some
interface SomeMapMsg<T> {
  type: 'map';
  fn: FunctionHKTF.Fn1<T, unknown>;
}

interface SomeMapResult<T, TMsg extends SomeMapMsg<T>> {
  result: TMsg['fn'] extends FunctionHKTF.Fn1<T, infer R>
    ? OptionHKTO<R>
    : never;
}

interface SomeMapMethod<T> extends Method.Base<
  SomeMapMsg<T>,
  unknown
> {
  [HKTF.ResultSymbol]: SomeMapResult<T, HKTF.Args<this>>;
}

// Unwrap method
interface SomeUnwrapMethod<T> extends Method.Base<
  { type: 'unwrap' },
  T
> {}

// None methods (always return None)
interface NoneMapMethod<T> extends Method.Base<
  { type: 'map'; fn: FunctionHKTF.Fn1<T, any> },
  OptionHKTO<never>
> {}

interface NoneUnwrapMethod extends Method.Base<
  { type: 'unwrap' },
  never
> {}

// Combine into Some and None HKTOs
interface SomeHKTO<T> extends HKTO.Combine<readonly [
  SomeMapMethod<T>,
  SomeUnwrapMethod<T>
]> {}

interface NoneHKTO extends HKTO.Combine<readonly [
  NoneMapMethod<never>,
  NoneUnwrapMethod
]> {}

// Union type
type OptionHKTO<T> = SomeHKTO<T> | NoneHKTO;

// Usage
type Example1 = HKTO.Send<SomeHKTO<number>, {
  type: 'map';
  fn: FunctionHKTF.Fn1<number, string>;
}>;
// Result: OptionHKTO<string>

type Example2 = HKTO.Send<SomeHKTO<number>, { type: 'unwrap' }>;
// Result: number

type Example3 = HKTO.Send<NoneHKTO, { type: 'unwrap' }>;
// Result: never
```

### Example 2: Counter with State

```typescript
// Counter messages
interface IncrementMsg { type: 'increment'; amount: number; }
interface DecrementMsg { type: 'decrement'; amount: number; }
interface GetMsg { type: 'get'; }
interface ResetMsg { type: 'reset'; }

// Counter HKTO with current count in type parameter
interface CounterHKTO<Count extends number> extends HKTO.Combine<readonly [
  Method.Base<IncrementMsg, CounterHKTO</* Count + amount */>>,
  Method.Base<DecrementMsg, CounterHKTO</* Count - amount */>>,
  Method.Base<GetMsg, Count>,
  Method.Base<ResetMsg, CounterHKTO<0>>
]> {}

// Type-level protocol verification
type Step1 = HKTO.Send<CounterHKTO<0>, { type: 'increment'; amount: 5 }>;
// CounterHKTO<5>

type Step2 = HKTO.Send<Step1, { type: 'get' }>;
// 5

type Step3 = HKTO.Send<CounterHKTO<0>, { type: 'unknown' }>;
// MethodNotFoundError<'unknown', CounterHKTO<0>>
```

### Example 3: Session Types

```typescript
// Login session protocol
interface LoginRequiredMsg { type: 'loginRequired'; }
interface LoginMsg { type: 'login'; username: string; password: string; }
interface LogoutMsg { type: 'logout'; }
interface GetUserMsg { type: 'getUser'; }

// States
interface UnauthenticatedSession extends HKTO.Combine<readonly [
  Method.Base<LoginRequiredMsg, UnauthenticatedSession>,
  Method.Base<LoginMsg, AuthenticatedSession<string>>
]> {}

interface AuthenticatedSession<User> extends HKTO.Combine<readonly [
  Method.Base<LogoutMsg, UnauthenticatedSession>,
  Method.Base<GetUserMsg, User>
]> {}

// Valid sequence
type S1 = HKTO.Send<UnauthenticatedSession, {
  type: 'login';
  username: 'alice';
  password: 'secret';
}>;
// AuthenticatedSession<string>

type S2 = HKTO.Send<S1, { type: 'getUser' }>;
// string

type S3 = HKTO.Send<S1, { type: 'logout' }>;
// UnauthenticatedSession

// Invalid sequence (caught at compile-time!)
type Invalid = HKTO.Send<UnauthenticatedSession, { type: 'getUser' }>;
// MethodNotFoundError<'getUser', UnauthenticatedSession>
```

## Type Utilities

The `Util` namespace provides type-level programming utilities:

```typescript
import { Util } from '@servicejs/hkt-core';

// Type checks
type Check1 = Util.IsAny<any>; // true
type Check2 = Util.IsUnknown<unknown>; // true
type Check3 = Util.IsNever<never>; // true
type Check4 = Util.IsArray<number[]>; // true
type Check5 = Util.IsTuple<[1, 2, 3]>; // true
type Check6 = Util.IsObject<{ a: number }>; // true
type Check7 = Util.IsFunction<() => void>; // true
type Check8 = Util.IsUnion<string | number>; // true

// Type equality
type Eq1 = Util.Equals<number, number>; // true
type Eq2 = Util.Equals<number, string>; // false

// Type extension
type Ext1 = Util.Extends<number, number | string>; // true
type Ext2 = Util.Extends<string, number>; // false

// Union to intersection
type U2I = Util.UnionToIntersection<{ a: number } | { b: string }>;
// { a: number } & { b: string }
```

## Error Types

```typescript
// Method not found
interface MethodNotFoundError<Type extends string, HKTO> {
  error: 'METHOD_NOT_FOUND';
  type: Type;
  hkto: HKTO;
}

// Invalid message (missing 'type' field)
interface InvalidMessageError<Message> {
  error: 'INVALID_MESSAGE';
  message: Message;
}
```

## Best Practices

### 1. Always Use Args/Result Pattern

```typescript
// ✅ Good
interface MyHKTFArgs {
  input: string;
}

interface MyHKTFResult<T extends MyHKTFArgs> {
  output: T['input'];
}

interface MyHKTF extends HKTF.Base {
  [HKTF.ArgsSymbol]: MyHKTFArgs;
  [HKTF.ResultSymbol]: MyHKTFResult<HKTF.Args<this>>;
}

// ❌ Bad
interface MyHKTF extends HKTF.Base {
  [HKTF.ArgsSymbol]: { input: string };
  [HKTF.ResultSymbol]: { output: this[typeof HKTF.ArgsSymbol]['input'] };
  // ❌ 'this' in object literal causes type errors
}
```

### 2. Use FunctionHKTF for All Functions

```typescript
// ✅ Good
interface Message {
  transform: FunctionHKTF.Fn1<number, string>;
}

// ❌ Bad
interface Message {
  transform: (x: number) => string;
}
```

### 3. Keep Method Results Simple When Possible

```typescript
// ✅ Simple - use Method.Base directly
interface SimpleMethod extends Method.Base<MessageType, ResultType> {}

// ✅ Complex - use custom result when transformation needed
interface ComplexMethod extends Method.Base<MessageType, unknown> {
  [HKTF.ResultSymbol]: ComplexResult<HKTF.Args<this>>;
}
```

### 4. Document State Transitions

```typescript
/**
 * LoginSession manages authentication state
 *
 * State transitions:
 * - Unauthenticated --[login]--> Authenticated
 * - Authenticated --[logout]--> Unauthenticated
 */
interface LoginSession extends HKTO.Combine<[
  LoginMethod,
  LogoutMethod
]> {}
```

## Design Philosophy

HKT in ServiceJS enables:

1. **Compile-Time Safety** - Catch errors before runtime
2. **Type-Level Protocols** - Verify message sequences at compile time
3. **Zero Runtime Cost** - All HKT code compiles away
4. **Functional Purity** - Pure type-level functions
5. **Composability** - Build complex types from simple ones

## Further Reading

- See `.claude/docs/hkt.md` for comprehensive pattern guide
- See `@servicejs/option`, `@servicejs/result`, `@servicejs/either` for practical HKT examples
- See `@servicejs/hkt-combinator` for HKTO combinator functions

## License

MIT
