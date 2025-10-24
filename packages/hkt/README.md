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

### TupleHKTF (Type-Level Tuple Operations)

Type-level operations on tuple types (readonly arrays at the type level).

```typescript
import { HKTF, TupleHKTF, FunctionHKTF } from '@servicejs/hkt';

// Map over tuple elements
type Doubled = HKTF.Apply<
  TupleHKTF.Map,
  { tuple: readonly [1, 2, 3]; fn: FunctionHKTF.Fn1<number, number> }
>;
// Result: readonly [number, number, number]

// Get tuple length
type Length = HKTF.Apply<
  TupleHKTF.Length,
  { tuple: readonly [1, 2, 3, 4, 5] }
>;
// Result: 5

// Concatenate tuples
type Combined = HKTF.Apply<
  TupleHKTF.Concat,
  { tuple1: readonly [1, 2]; tuple2: readonly [3, 4] }
>;
// Result: readonly [1, 2, 3, 4]

// Reverse a tuple
type Reversed = HKTF.Apply<
  TupleHKTF.Reverse,
  { tuple: readonly [1, 2, 3] }
>;
// Result: readonly [3, 2, 1]

// Get head and tail
type First = HKTF.Apply<TupleHKTF.Head, { tuple: readonly [1, 2, 3] }>;
// Result: 1

type Rest = HKTF.Apply<TupleHKTF.Tail, { tuple: readonly [1, 2, 3] }>;
// Result: readonly [2, 3]
```

### Arithmetic (Type-Level Number Operations)

Type-level arithmetic operations on number literal types. Supports positive and negative integers with operations: add, sub, mul, div, mod, pow.

**Implementation:** Uses string-based digit-by-digit algorithms (similar to grade-school arithmetic) to support arbitrarily large numbers without hitting TypeScript's recursion limits. Addition and multiplication work with very large numbers, while division/modulo use repeated subtraction (limited to ~1000 iterations for performance).

```typescript
import { HKTF, Arithmetic } from '@servicejs/hkt';

// Addition
type Sum = HKTF.Apply<Arithmetic.Add, { a: 5; b: 3 }>;
// Result: { result: 8 }

type SumNeg = HKTF.Apply<Arithmetic.Add, { a: -5; b: 3 }>;
// Result: { result: -2 }

// Subtraction
type Diff = HKTF.Apply<Arithmetic.Sub, { a: 10; b: 4 }>;
// Result: { result: 6 }

// Multiplication
type Product = HKTF.Apply<Arithmetic.Mul, { a: 4; b: 5 }>;
// Result: { result: 20 }

// Integer Division
type Quotient = HKTF.Apply<Arithmetic.Div, { a: 10; b: 3 }>;
// Result: { result: 3 }

// Modulo
type Remainder = HKTF.Apply<Arithmetic.Mod, { a: 10; b: 3 }>;
// Result: { result: 1 }

// Power (Exponentiation)
type Power = HKTF.Apply<Arithmetic.Pow, { base: 2; exponent: 3 }>;
// Result: { result: 8 }

// Comparison operations
type IsLess = HKTF.Apply<Arithmetic.Lt, { a: 3; b: 5 }>;
// Result: { result: true }

type IsGreater = HKTF.Apply<Arithmetic.Gt, { a: 5; b: 3 }>;
// Result: { result: true }

type Maximum = HKTF.Apply<Arithmetic.MaxHKTF, { a: 5; b: 3 }>;
// Result: { result: 5 }

type Minimum = HKTF.Apply<Arithmetic.MinHKTF, { a: 5; b: 3 }>;
// Result: { result: 3 }

// Utility operations
type Absolute = HKTF.Apply<Arithmetic.AbsHKTF, { n: -5 }>;
// Result: { result: 5 }

type Negated = HKTF.Apply<Arithmetic.NegateHKTF, { n: 5 }>;
// Result: { result: -5 }

// Complex expressions (chain operations)
// Calculate: (5 + 3) * 2 = 16
type Step1 = HKTF.Apply<Arithmetic.Add, { a: 5; b: 3 }>;
type Step2 = HKTF.Apply<Arithmetic.Mul, { a: Step1['result']; b: 2 }>;
// Step2: { result: 16 }

// Works with larger numbers too!
type LargeAdd = HKTF.Apply<Arithmetic.Add, { a: 999999; b: 1 }>;
// Result: { result: 1000000 }

type LargeMul = HKTF.Apply<Arithmetic.Mul, { a: 123; b: 456 }>;
// Result: { result: 56088 }
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

### Composition and Utilities

The package includes powerful utilities for type-level programming:

```typescript
import { HKTF, Compose, StringHKTF, TupleHKTF, ObjectHKTF, Util } from '@servicejs/hkt';

// Compose HKTFs
type Result = HKTF.Apply<
  Compose.Compose,
  { f: ToUpperHKTF; g: ReverseHKTF; input: 'hello' }
>;
// Result: 'OLLEH'

// Pipe through multiple operations
type PipedResult = HKTF.Apply<
  Compose.Pipe,
  { functions: readonly [AddOne, Double, AddOne]; input: 5 }
>;
// Result: 13 (conceptually: ((5 + 1) * 2) + 1)

// String operations
type Joined = HKTF.Apply<
  StringHKTF.Join,
  { strings: readonly ['hello', 'world']; delimiter: ' ' }
>;
// Result: 'hello world'

// Object operations
type Picked = HKTF.Apply<
  ObjectHKTF.PickHKTF,
  { obj: { a: 1; b: 2; c: 3 }; keys: readonly ['a', 'c'] }
>;
// Result: { a: 1; c: 3 }

// Tuple operations
type Zipped = HKTF.Apply<
  TupleHKTF.Zip,
  { tuple1: readonly [1, 2, 3]; tuple2: readonly ['a', 'b', 'c'] }
>;
// Result: readonly [[1, 'a'], [2, 'b'], [3, 'c']]

// Type predicates
type IsEqual = HKTF.Apply<Util.Equals, { type1: number; type2: number }>;
// Result: true

type IsTuple = HKTF.Apply<Util.IsTuple, { type: readonly [1, 2, 3] }>;
// Result: true
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

### TupleHKTF

- `TupleHKTF.Map` - Map a function over tuple elements
- `TupleHKTF.Filter` - Filter tuple elements by predicate
- `TupleHKTF.Reduce` - Reduce tuple to single value
- `TupleHKTF.Length` - Get tuple length as literal number
- `TupleHKTF.Head` - Get first element of tuple
- `TupleHKTF.Tail` - Get all elements except first
- `TupleHKTF.Concat` - Concatenate two tuples
- `TupleHKTF.Reverse` - Reverse tuple order
- `TupleHKTF.Zip` - Combine two tuples element-wise into pairs
- `TupleHKTF.Flatten` - Flatten nested tuples one level
- `TupleHKTF.Partition` - Split tuple by predicate into [matching, non-matching]
- `TupleHKTF.Take` - Take first N elements
- `TupleHKTF.Drop` - Drop first N elements
- `TupleHKTF.Find` - Find first element matching predicate
- `TupleHKTF.Contains` - Check if tuple contains element

### ObjectHKTF

- `ObjectHKTF.MapValues` - Map function over object values
- `ObjectHKTF.MapKeys` - Transform object keys
- `ObjectHKTF.PickHKTF` - Pick subset of keys from object
- `ObjectHKTF.OmitHKTF` - Omit subset of keys from object
- `ObjectHKTF.Merge` - Merge two objects (right overrides left)
- `ObjectHKTF.Get` - Get value at path in object
- `ObjectHKTF.Set` - Set value at path in object
- `ObjectHKTF.Keys` - Get object keys as tuple
- `ObjectHKTF.Values` - Get object values as tuple
- `ObjectHKTF.Entries` - Get object entries as tuple of [key, value] pairs

### StringHKTF

- `StringHKTF.Concat` - Concatenate two strings
- `StringHKTF.Split` - Split string by delimiter into tuple
- `StringHKTF.Join` - Join tuple of strings with delimiter
- `StringHKTF.ToUpper` - Convert string to uppercase
- `StringHKTF.ToLower` - Convert string to lowercase
- `StringHKTF.CapitalizeHKTF` - Capitalize first letter
- `StringHKTF.UncapitalizeHKTF` - Uncapitalize first letter
- `StringHKTF.StartsWith` - Check if string starts with prefix
- `StringHKTF.EndsWith` - Check if string ends with suffix
- `StringHKTF.Replace` - Replace first occurrence of substring
- `StringHKTF.ReplaceAll` - Replace all occurrences of substring
- `StringHKTF.Trim` - Trim whitespace from both ends
- `StringHKTF.Length` - Get string length as number

### Compose

- `Compose.Identity` - Returns input unchanged
- `Compose.Constant` - Always returns the same value
- `Compose.Compose` - Compose two HKTFs (apply f then g)
- `Compose.Pipe` - Pipe input through multiple HKTFs in sequence

### Util

**Type Predicates:**
- `Util.IsNever` - Check if type is never
- `Util.IsAny` - Check if type is any
- `Util.IsUnknown` - Check if type is unknown
- `Util.Equals` - Check if two types are equal
- `Util.IsExtends` - Check if type1 extends type2
- `Util.IsUnion` - Check if type is a union
- `Util.IsTuple` - Check if type is a tuple (fixed-length array)
- `Util.IsArray` - Check if type is an array
- `Util.IsObject` - Check if type is an object (not array/function)
- `Util.IsFunction` - Check if type is a function

**Boolean Logic:**
- `Util.Not` - Logical NOT
- `Util.And` - Logical AND
- `Util.Or` - Logical OR

### Combinator

- `Combinator.Extend` - Extend HKTO with additional methods
- `Combinator.MapMethods` - Transform all method results through a function
- `Combinator.FilterMethods` - Filter methods by predicate on message type
- `Combinator.MergeTwoHKTOs` - Merge two HKTOs into one
- `Combinator.ComposeHKTOs` - Compose two HKTOs

### Errors

- `Errors.ErrorMessage<TError, TDetails>` - Generic error message type
- `Errors.InvalidMessageError<T>` - Message must have 'type' field
- `Errors.MethodNotFoundError<TType, THKTO>` - HKTO doesn't handle message type
- `Errors.InvalidFunctionError<T>` - Must use FunctionHKTF, not raw functions
- `Errors.InvalidHKTFError<T>` - Must extend HKTF.Base
- `Errors.TypeMismatchError<TExp, TRec>` - Type doesn't match expected
- `Errors.EmptyTupleError<TOp>` - Operation requires non-empty tuple
- `Errors.IndexOutOfBoundsError<TIdx, TLen>` - Index outside tuple bounds
- `Errors.InvalidPathError<TPath, TObj>` - Path doesn't exist in object
- `Errors.RecursionDepthError<TOp>` - TypeScript recursion limit exceeded

### Arithmetic

**Basic Operations:**
- `Arithmetic.Add` - Addition (a + b)
- `Arithmetic.Sub` - Subtraction (a - b)
- `Arithmetic.Mul` - Multiplication (a × b)
- `Arithmetic.Div` - Integer division (a ÷ b, quotient only)
- `Arithmetic.Mod` - Modulo (a % b, remainder)
- `Arithmetic.Pow` - Exponentiation (base^exponent)

**Comparison Operations:**
- `Arithmetic.Lt` - Less than (a < b)
- `Arithmetic.Gt` - Greater than (a > b)
- `Arithmetic.MaxHKTF` - Maximum of two numbers
- `Arithmetic.MinHKTF` - Minimum of two numbers

**Utility Operations:**
- `Arithmetic.AbsHKTF` - Absolute value |n|
- `Arithmetic.NegateHKTF` - Negation (-n)

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
