# @servicejs/hkt

Higher-Kinded Types foundation for ServiceJS.

## Overview

This package provides type-level programming infrastructure that enables compile-time protocol verification and type-safe session types in ServiceJS. All code is pure type-level with **zero runtime overhead**.

## Core Concepts

### HKTF (Higher-Kinded Type Functions)

Type-level functions that take type arguments and return types.

**Pattern: Always define Args and Result separately for type safety:**

```typescript
import { HKTF } from '@servicejs/hkt';

// 1. Define Args interface
interface WrapHKTFArgs {
  value: unknown;
}

// 2. Define Result type (parameterized by Args)
interface WrapHKTFResult<T extends WrapHKTFArgs> {
  wrapped: T['value'];
}

// 3. Define HKTF using Args and Result
interface WrapHKTF extends HKTF.Base {
  [HKTF.ArgsSymbol]: WrapHKTFArgs;
  [HKTF.ResultSymbol]: WrapHKTFResult<HKTF.Args<this>>;
}

// Apply the type function
type Result = HKTF.Apply<WrapHKTF, { value: number }>;
// Result: { wrapped: number }
```

**Why this pattern?**
- ✅ Type-safe: No `this` type access issues
- ✅ Clear: Args and Result are explicitly defined
- ✅ Reusable: Can reference Args/Result independently
- ✅ Debuggable: Clear TypeScript error messages

### FunctionHKTF (All Functions as HKTs)

**Important:** All functions must be represented as HKTFs, not raw function types. This enables type-level function application.

```typescript
import { FunctionHKTF } from '@servicejs/hkt';

// ❌ Wrong: Raw function type
type BadFn = (x: number) => string;

// ✅ Correct: Function HKTF
type GoodFn = FunctionHKTF.Fn1<number, string>;

// Pattern matching on Function HKTFs
interface MapArgs {
  fn: FunctionHKTF.Fn1<number, unknown>;
}

interface MapResult<T extends MapArgs> {
  result: T['fn'] extends FunctionHKTF.Fn1<number, infer R> ? R : never;
}
```

### HKTO (Higher-Kinded Type Objects)

Type-level objects that dispatch messages to methods.

```typescript
import { HKTF, HKTO, Method, FunctionHKTF } from '@servicejs/hkt';

// Define method message
interface IncrementMsg {
  type: 'increment';
  amount: number;
}

// Define method (simple result, no transformation)
interface IncrementMethod extends Method.Base<
  IncrementMsg,
  CounterHKTO
> {}

// Define method with transformation
interface MapMethodMsg<T> {
  type: 'map';
  fn: FunctionHKTF.Fn1<T, unknown>;
}

interface MapMethodResult<T, TMsg extends MapMethodMsg<T>> {
  result: TMsg['fn'] extends FunctionHKTF.Fn1<T, infer R>
    ? SomeHKTO<R>
    : never;
}

interface MapMethod<T> extends Method.Base<
  MapMethodMsg<T>,
  unknown
> {
  [HKTF.ResultSymbol]: MapMethodResult<T, HKTF.Args<this>>;
}

// Combine into HKTO
interface CounterHKTO extends HKTO.Combine<readonly [
  IncrementMethod,
  MapMethod<number>
]> {}

// Send messages
type Result1 = HKTO.Send<CounterHKTO, { type: 'increment'; amount: 5 }>;
// Result: CounterHKTO

type Result2 = HKTO.Send<
  CounterHKTO,
  { type: 'map'; fn: FunctionHKTF.Fn1<number, string> }
>;
// Result: SomeHKTO<string>
```

### Method Pattern

Methods are type-level functions that handle specific message types.

**Pattern with state captured in type parameter:**

```typescript
import { HKTF, Method } from '@servicejs/hkt';

// Method message
interface SetMsg {
  type: 'set';
  value: number;
}

// Method result
interface SetResult<TMsg extends SetMsg> {
  counter: CounterHKTO<TMsg['value']>;
}

// Method definition
interface SetMethod<Count extends number> extends Method.Base<
  SetMsg,
  unknown
> {
  [HKTF.ResultSymbol]: SetResult<HKTF.Args<this>>;
}

// HKTO with state
interface CounterHKTO<Count extends number = 0> extends HKTO.Combine<readonly [
  SetMethod<Count>,
  GetMethod<Count>
]> {}
```

### Runtime Derivation

Convert type-level definitions to runtime types:

```typescript
import { HKTF, HKTO } from '@servicejs/hkt';

// Derive runtime function signature
type WrapFn = HKTF.ToFunction<WrapHKTF>;
// Result: <T>(args: { value: T }) => { wrapped: T }

// Derive runtime object type
type CounterObject = HKTO.ToObject<CounterHKTO>;
// Result: { increment: (msg) => CounterHKTO, map: (msg) => SomeHKTO<R> }
```

### Protocol Helpers

Convert HKTOs to ServiceJS reducers:

```typescript
import { Protocol } from '@servicejs/hkt';

type CounterReducer = Protocol.ToReducer<CounterHKTO, CounterState>;
// Result: (state, message) => ReducerResult

// Verify implementation
type Check = Protocol.Implements<CounterHKTO, typeof myReducer>;
// Result: true (or compile error)
```

## Complete Example

Here's a complete example showing the recommended pattern:

```typescript
import { HKTF, HKTO, Method, FunctionHKTF } from '@servicejs/hkt';

// Option HKTO implementation

// --- Some Methods ---

interface SomeMapMsg<T> {
  type: 'map';
  fn: FunctionHKTF.Fn1<T, unknown>;
}

interface SomeMapResult<T, TMsg extends SomeMapMsg<T>> {
  result: TMsg['fn'] extends FunctionHKTF.Fn1<T, infer R>
    ? SomeHKTO<R>
    : never;
}

interface SomeMap<T> extends Method.Base<SomeMapMsg<T>, unknown> {
  [HKTF.ResultSymbol]: SomeMapResult<T, HKTF.Args<this>>;
}

interface SomeGetMsg {
  type: 'get';
}

interface SomeGet<T> extends Method.Base<SomeGetMsg, T> {}

// --- Some HKTO ---

interface SomeHKTO<T> extends HKTO.Combine<readonly [
  SomeMap<T>,
  SomeGet<T>
]> {}

// --- None Methods ---

interface NoneMapMsg {
  type: 'map';
  fn: FunctionHKTF.Fn1<never, unknown>;
}

interface NoneMap extends Method.Base<NoneMapMsg, NoneHKTO> {}

interface NoneGetMsg {
  type: 'get';
}

interface NoneGet extends Method.Base<NoneGetMsg, never> {}

// --- None HKTO ---

interface NoneHKTO extends HKTO.Combine<readonly [
  NoneMap,
  NoneGet
]> {}

// --- Constructors ---

interface SomeArgs {
  value: unknown;
}

interface SomeResult<T extends SomeArgs> {
  option: SomeHKTO<T['value']>;
}

interface Some extends HKTF.Base {
  [HKTF.ArgsSymbol]: SomeArgs;
  [HKTF.ResultSymbol]: SomeResult<HKTF.Args<this>>;
}

interface NoneArgs {}

interface NoneResult {
  option: NoneHKTO;
}

interface None extends HKTF.Base {
  [HKTF.ArgsSymbol]: NoneArgs;
  [HKTF.ResultSymbol]: NoneResult;
}

// --- Usage ---

type MySome = HKTF.Apply<Some, { value: 42 }>;
// Result: { option: SomeHKTO<42> }

type Mapped = HKTO.Send<
  MySome['option'],
  { type: 'map'; fn: FunctionHKTF.Fn1<number, string> }
>;
// Result: SomeHKTO<string>
```

## API Reference

### HKTF

- `HKTF.Base` - Base interface for type-level functions
- `HKTF.Args<F>` - Extract merged args with defaults
- `HKTF.Result<F>` - Extract result type
- `HKTF.Apply<F, Input>` - Apply type function
- `HKTF.PartialApply<F, NewDefaults>` - Partial application
- `HKTF.ToFunction<F>` - Derive runtime function signature

### FunctionHKTF

- `FunctionHKTF.Fn1<I, O>` - Unary function HKTF
- `FunctionHKTF.Fn2<I1, I2, O>` - Binary function HKTF
- `FunctionHKTF.Predicate<T>` - Predicate HKTF (returns boolean)
- `FunctionHKTF.Reducer<Acc, Val>` - Reducer HKTF (accumulator function)

### HKTO

- `HKTO.Base` - Base interface for type-level objects
- `HKTO.Combine<Methods>` - Combine methods into HKTO
- `HKTO.Send<O, Message>` - Send message to HKTO
- `HKTO.ExtractMessages<Methods>` - Extract all message types
- `HKTO.ToObject<O>` - Derive runtime object type

### Method

- `Method.Base<Message, Result>` - Base interface for methods
- `Method.MessageOf<M>` - Extract message type
- `Method.ResultOf<M>` - Extract result type

### Protocol

- `Protocol.ToReducer<O, State>` - Convert HKTO to reducer signature
- `Protocol.Implements<Protocol, Impl>` - Verify implementation
- `Protocol.StateOf<R>` - Extract state type from reducer
- `Protocol.MessageOf<R>` - Extract message type from reducer

## Best Practices

### 1. Always Define Args and Result Separately

```typescript
// ❌ Avoid: Inline types
interface BadHKTF extends HKTF.Base {
  [HKTF.ArgsSymbol]: { value: unknown };
  [HKTF.ResultSymbol]: { wrapped: HKTF.Args<this>['value'] }; // Can cause type errors
}

// ✅ Prefer: Separate interfaces
interface GoodHKTFArgs {
  value: unknown;
}

interface GoodHKTFResult<T extends GoodHKTFArgs> {
  wrapped: T['value'];
}

interface GoodHKTF extends HKTF.Base {
  [HKTF.ArgsSymbol]: GoodHKTFArgs;
  [HKTF.ResultSymbol]: GoodHKTFResult<HKTF.Args<this>>;
}
```

### 2. Use FunctionHKTF for All Functions

```typescript
// ❌ Wrong: Raw function types
interface BadMethod extends Method.Base<
  { type: 'map'; fn: (x: number) => string },
  string
> {}

// ✅ Correct: FunctionHKTF
interface GoodMethod extends Method.Base<
  { type: 'map'; fn: FunctionHKTF.Fn1<number, string> },
  string
> {}
```

### 3. Name Conventions

- Args interfaces: `{Name}Args`
- Result interfaces: `{Name}Result<T extends {Name}Args>`
- Methods: `{Action}Method<StateParams>`
- HKTOs: `{Name}HKTO<StateParams>`

## Examples

See the [tests](./tests) directory for complete examples.

## License

MIT
