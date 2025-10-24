# Higher-Kinded Types (HKT) Pattern Guide

This document explains the HKT pattern used throughout ServiceJS for compile-time protocol verification and type-safe session types.

## Core Principle

**All type-level programming in ServiceJS uses the explicit Args/Result pattern for maximum type safety and clarity.**

## Pattern Structure

Every HKTF (Higher-Kinded Type Function) follows this three-part structure:

```typescript
// 1. Define Args interface
interface {Name}Args {
  // All input parameters
  param1: Type1;
  param2: Type2;
}

// 2. Define Result interface (parameterized by Args)
interface {Name}Result<T extends {Name}Args> {
  // Result type, can reference T['param1'], T['param2'], etc.
  resultField: SomeType<T['param1']>;
}

// 3. Define HKTF combining Args and Result
interface {Name} extends HKTF.Base {
  [HKTF.ArgsSymbol]: {Name}Args;
  [HKTF.ResultSymbol]: {Name}Result<HKTF.Args<this>>;
}
```

## Why This Pattern?

### ✅ Type Safety
No `this` type access issues inside object type literals. The `this` type is only accessed in the interface member assignment, never inside object types.

### ✅ Clarity
Args and Result are explicit, separate interfaces that can be understood independently.

### ✅ Reusability
Args and Result types can be referenced elsewhere without needing to extract them from the HKTF.

### ✅ Debuggability
TypeScript shows clear error messages pointing to specific Args or Result interfaces.

## Function HKTFs

**Critical Rule:** All functions MUST be represented as HKTFs, not raw function types.

```typescript
// ❌ WRONG: Raw function type
interface BadMsg {
  fn: (x: number) => string;
}

// ✅ CORRECT: Function HKTF
interface GoodMsg {
  fn: FunctionHKTF.Fn1<number, string>;
}
```

### Why?

Raw function types like `(x: number) => string` cannot be pattern-matched at the type level. TypeScript cannot extract the return type `string` from the function type in a type-level computation.

FunctionHKTF types can be pattern-matched:

```typescript
type ExtractOutput<F> = F extends FunctionHKTF.Fn1<any, infer O> ? O : never;

type Output1 = ExtractOutput<FunctionHKTF.Fn1<number, string>>; // string ✅
type Output2 = ExtractOutput<(x: number) => string>; // never ❌
```

## HKTO (Higher-Kinded Type Objects)

HKTOs represent type-level objects that dispatch messages to methods.

### Method Pattern

Each method follows the same Args/Result pattern:

```typescript
// Simple method (no transformation)
interface IncrementMsg {
  type: 'increment';
  amount: number;
}

interface IncrementMethod extends Method.Base<
  IncrementMsg,
  CounterHKTO  // Simple result type
> {}

// Complex method (with transformation)
interface MapMsg<T> {
  type: 'map';
  fn: FunctionHKTF.Fn1<T, unknown>;
}

interface MapResult<T, TMsg extends MapMsg<T>> {
  result: TMsg['fn'] extends FunctionHKTF.Fn1<T, infer R>
    ? SomeHKTO<R>
    : never;
}

interface MapMethod<T> extends Method.Base<
  MapMsg<T>,
  unknown  // Placeholder
> {
  [HKTF.ResultSymbol]: MapResult<T, HKTF.Args<this>>;
}
```

### When to Use Each Pattern

**Simple result (no transformation):**
```typescript
interface SimpleMethod extends Method.Base<MessageType, ResultType> {}
```

**Complex result (needs transformation):**
```typescript
interface ComplexMethod extends Method.Base<MessageType, unknown> {
  [HKTF.ResultSymbol]: ComplexResult<HKTF.Args<this>>;
}
```

## Complete Example: Option Type

Here's a complete, production-ready example:

```typescript
import { HKTF, HKTO, Method, FunctionHKTF } from '@servicejs/hkt';

// ============================================================================
// Some Methods
// ============================================================================

// --- Map Method ---

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

// --- AndThen Method ---

interface SomeAndThenMsg<T> {
  type: 'andThen';
  fn: FunctionHKTF.Fn1<T, OptionHKTO<unknown>>;
}

interface SomeAndThenResult<T, TMsg extends SomeAndThenMsg<T>> {
  result: TMsg['fn'] extends FunctionHKTF.Fn1<T, infer R>
    ? R
    : never;
}

interface SomeAndThen<T> extends Method.Base<SomeAndThenMsg<T>, unknown> {
  [HKTF.ResultSymbol]: SomeAndThenResult<T, HKTF.Args<this>>;
}

// --- Get Method ---

interface SomeGetMsg {
  type: 'get';
}

interface SomeGet<T> extends Method.Base<SomeGetMsg, T> {}

// --- Some HKTO ---

interface SomeHKTO<T> extends HKTO.Combine<readonly [
  SomeMap<T>,
  SomeAndThen<T>,
  SomeGet<T>
]> {}

// ============================================================================
// None Methods
// ============================================================================

interface NoneMapMsg {
  type: 'map';
  fn: FunctionHKTF.Fn1<never, unknown>;
}

interface NoneMap extends Method.Base<NoneMapMsg, NoneHKTO> {}

interface NoneAndThenMsg {
  type: 'andThen';
  fn: FunctionHKTF.Fn1<never, OptionHKTO<unknown>>;
}

interface NoneAndThen extends Method.Base<NoneAndThenMsg, NoneHKTO> {}

interface NoneGetMsg {
  type: 'get';
}

interface NoneGet extends Method.Base<NoneGetMsg, never> {}

// --- None HKTO ---

interface NoneHKTO extends HKTO.Combine<readonly [
  NoneMap,
  NoneAndThen,
  NoneGet
]> {}

// ============================================================================
// Option Type Union
// ============================================================================

type OptionHKTO<T> = SomeHKTO<T> | NoneHKTO;

// ============================================================================
// Constructors
// ============================================================================

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

// ============================================================================
// Usage
// ============================================================================

// Create Some with value 42
type MySome = HKTF.Apply<Some, { value: 42 }>;
// Result: { option: SomeHKTO<42> }

// Map over the value
type DoubleFn = FunctionHKTF.Fn1<number, number>;
type Doubled = HKTO.Send<MySome['option'], { type: 'map'; fn: DoubleFn }>;
// Result: SomeHKTO<number>

// Chain operations
type ToStringFn = FunctionHKTF.Fn1<number, OptionHKTO<string>>;
type Chained = HKTO.Send<MySome['option'], { type: 'andThen'; fn: ToStringFn }>;
// Result: OptionHKTO<string>
```

## Naming Conventions

Follow these naming conventions for consistency:

### HKTFs
- Args: `{Name}Args`
- Result: `{Name}Result<T extends {Name}Args>`
- HKTF: `{Name}` (without HKTF suffix for cleaner usage)

### Methods
- Message: `{Action}Msg<StateParams>`
- Result: `{Action}Result<StateParams, TMsg extends {Action}Msg<StateParams>>`
- Method: `{Action}Method<StateParams>`

### HKTOs
- HKTO: `{Name}HKTO<StateParams>`
- Constructor Args: `{Name}Args`
- Constructor Result: `{Name}Result<T extends {Name}Args>`
- Constructor: `{Name}` (without HKTF suffix)

## Common Patterns

### Pattern 1: Stateless Method

```typescript
interface GetMsg {
  type: 'get';
}

interface Get<T> extends Method.Base<GetMsg, T> {}
```

### Pattern 2: Method with Function Argument

```typescript
interface MapMsg<T> {
  type: 'map';
  fn: FunctionHKTF.Fn1<T, unknown>;
}

interface MapResult<T, TMsg extends MapMsg<T>> {
  result: TMsg['fn'] extends FunctionHKTF.Fn1<T, infer R>
    ? SomeHKTO<R>
    : never;
}

interface Map<T> extends Method.Base<MapMsg<T>, unknown> {
  [HKTF.ResultSymbol]: MapResult<T, HKTF.Args<this>>;
}
```

### Pattern 3: Method Returning Different HKTO

```typescript
interface AndThenMsg<T> {
  type: 'andThen';
  fn: FunctionHKTF.Fn1<T, ResultHKTO<unknown, unknown>>;
}

interface AndThenResult<T, TMsg extends AndThenMsg<T>> {
  result: TMsg['fn'] extends FunctionHKTF.Fn1<T, infer R>
    ? R
    : never;
}

interface AndThen<T> extends Method.Base<AndThenMsg<T>, unknown> {
  [HKTF.ResultSymbol]: AndThenResult<T, HKTF.Args<this>>;
}
```

### Pattern 4: Stateful HKTO

```typescript
// HKTO captures state in type parameter
interface CounterHKTO<Count extends number = 0> extends HKTO.Combine<readonly [
  IncrementMethod<Count>,
  DecrementMethod<Count>,
  GetMethod<Count>
]> {}

// Methods reference the state
interface IncrementMsg {
  type: 'increment';
  amount: number;
}

interface IncrementMethod<Count extends number> extends Method.Base<
  IncrementMsg,
  CounterHKTO</* Would be Count + amount, but TS can't do arithmetic */>
> {}
```

## Checklist for Implementing HKTs

When implementing a new HKTF or HKTO, use this checklist:

### HKTF Checklist
- [ ] Define `{Name}Args` interface
- [ ] Define `{Name}Result<T extends {Name}Args>` interface
- [ ] Define `{Name}` extending `HKTF.Base`
- [ ] Set `[HKTF.ArgsSymbol]: {Name}Args`
- [ ] Set `[HKTF.ResultSymbol]: {Name}Result<HKTF.Args<this>>`
- [ ] All function types use `FunctionHKTF.Fn1`, `Fn2`, etc.
- [ ] Test with `HKTF.Apply<{Name}, { ... }>`

### Method Checklist
- [ ] Define `{Action}Msg<StateParams>` interface
- [ ] All function types use `FunctionHKTF.*`
- [ ] If simple result: `extends Method.Base<Msg, Result>`
- [ ] If complex result: Define `{Action}Result<StateParams, TMsg>`
- [ ] If complex result: `extends Method.Base<Msg, unknown>` with `[HKTF.ResultSymbol]`
- [ ] Test with `HKTO.Send<MyHKTO, { type: '...', ... }>`

### HKTO Checklist
- [ ] Define all methods following Method Checklist
- [ ] Define `{Name}HKTO<StateParams>` extending `HKTO.Combine<readonly [...]>`
- [ ] List all methods in tuple
- [ ] If constructor needed: Follow HKTF Checklist for constructor
- [ ] Test message dispatch with `HKTO.Send`

## Troubleshooting

### Error: Type instantiation is excessively deep

**Cause:** Circular type reference or deeply nested type computation.

**Solution:** Simplify the type hierarchy or add explicit type annotations to break the cycle.

### Error: 'this' implicitly has type 'any'

**Cause:** Using `this` inside an object type literal.

**Solution:** Move the type computation to a separate Result interface.

```typescript
// ❌ Wrong
interface Bad extends HKTF.Base {
  [HKTF.ResultSymbol]: { value: HKTF.Args<this>['input'] };
}

// ✅ Correct
interface GoodResult<T extends GoodArgs> {
  value: T['input'];
}

interface Good extends HKTF.Base {
  [HKTF.ResultSymbol]: GoodResult<HKTF.Args<this>>;
}
```

### Error: Cannot find name 'infer'

**Cause:** Using `infer` outside of a conditional type.

**Solution:** Wrap in a conditional type:

```typescript
// ❌ Wrong
type Bad<F> = F extends FunctionHKTF.Fn1<any, infer R>;

// ✅ Correct
type Good<F> = F extends FunctionHKTF.Fn1<any, infer R> ? R : never;
```

## Additional Resources

- See `packages/hkt/README.md` for API reference
- See `packages/option/src/types.ts` for complete Option implementation
- See `packages/result/src/types.ts` for complete Result implementation
- See `conversation/hkt.ts` for original design discussion
