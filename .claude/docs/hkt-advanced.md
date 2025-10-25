# Advanced HKT Patterns

**Last Updated:** 2025-10-25

This guide covers advanced Higher-Kinded Type patterns beyond the basics in `hkt.md`.

---

## HKT Utility Packages

ServiceJS provides 7 HKT utility packages for type-level programming:

1. **@servicejs/hkt-arithmetic** - Type-level math
2. **@servicejs/hkt-boolean** - Type-level boolean logic
3. **@servicejs/hkt-string** - Type-level string manipulation
4. **@servicejs/hkt-tuple** - Type-level tuple operations
5. **@servicejs/hkt-object** - Type-level object manipulation
6. **@servicejs/hkt-combinator** - Higher-order HKTO functions
7. **@servicejs/hkt-compose** - Function composition utilities

---

## Type-Level Arithmetic

```typescript
import { HKTF } from '@servicejs/hkt-core';
import * as Arith from '@servicejs/hkt-arithmetic';

// Add two numbers at type level
type Sum = HKTF.Apply<Arith.Add, { a: 2; b: 3 }>; // 5

// Multiply
type Product = HKTF.Apply<Arith.Multiply, { a: 4; b: 5 }>; // 20

// Power
type Squared = HKTF.Apply<Arith.Pow, { base: 3; exp: 2 }>; // 9

// Comparison
type IsGreater = HKTF.Apply<Arith.GreaterThan, { a: 5; b: 3 }>; // true

// Use in generic constraints
type ArrayOfSize<N extends number, T> = {
  length: N;
} & T[];

type Five = HKTF.Apply<Arith.Add, { a: 2; b: 3 }>;
type FiveStrings = ArrayOfSize<Five, string>; // Array of exactly 5 strings
```

---

## Type-Level Boolean Logic

```typescript
import * as Bool from '@servicejs/hkt-boolean';

// AND operation
type Both = HKTF.Apply<Bool.And, { a: true; b: true }>; // true

// OR operation
type Either = HKTF.Apply<Bool.Or, { a: true; b: false }>; // true

// NOT operation
type Negated = HKTF.Apply<Bool.Not, { value: true }>; // false

// Conditional types
type Result = HKTF.Apply<Bool.If, {
  condition: true;
  then: 'Yes';
  else: 'No';
}>; // 'Yes'

// Check if all are true
type AllTrue = HKTF.Apply<Bool.All, { values: [true, true, true] }>; // true
type HasFalse = HKTF.Apply<Bool.All, { values: [true, false, true] }>; // false
```

---

## Type-Level String Manipulation

```typescript
import * as Str from '@servicejs/hkt-string';

// Uppercase
type Upper = HKTF.Apply<Str.Uppercase, { value: 'hello' }>; // 'HELLO'

// Capitalize
type Cap = HKTF.Apply<Str.Capitalize, { value: 'hello' }>; // 'Hello'

// Concatenate
type Joined = HKTF.Apply<Str.Concat, { a: 'Hello'; b: ' World' }>; // 'Hello World'

// String length
type Len = HKTF.Apply<Str.Length, { value: 'hello' }>; // 5

// Starts with
type StartsWithH = HKTF.Apply<Str.StartsWith, {
  value: 'hello';
  prefix: 'he';
}>; // true
```

---

## Type-Level Tuple Operations

```typescript
import * as Tuple from '@servicejs/hkt-tuple';

// Get first element
type First = HKTF.Apply<Tuple.Head, { tuple: [1, 2, 3] }>; // 1

// Get all but first
type Rest = HKTF.Apply<Tuple.Tail, { tuple: [1, 2, 3] }>; // [2, 3]

// Get length
type Length = HKTF.Apply<Tuple.Length, { tuple: [1, 2, 3] }>; // 3

// Concatenate tuples
type Combined = HKTF.Apply<Tuple.Concat, {
  a: [1, 2];
  b: [3, 4];
}>; // [1, 2, 3, 4]

// Reverse
type Reversed = HKTF.Apply<Tuple.Reverse, { tuple: [1, 2, 3] }>; // [3, 2, 1]

// Map over tuple
type Doubled = HKTF.Apply<Tuple.Map, {
  tuple: [1, 2, 3];
  fn: MultiplyBy2;
}>; // [2, 4, 6]
```

---

## Type-Level Object Manipulation

```typescript
import * as Obj from '@servicejs/hkt-object';

type User = { id: number; name: string; email: string };

// Get object keys
type Keys = HKTF.Apply<Obj.Keys, { obj: User }>; // 'id' | 'name' | 'email'

// Get object values
type Values = HKTF.Apply<Obj.Values, { obj: User }>; // number | string

// Pick specific keys
type OnlyId = HKTF.Apply<Obj.Pick, {
  obj: User;
  keys: 'id' | 'name';
}>; // { id: number; name: string }

// Omit keys
type WithoutEmail = HKTF.Apply<Obj.Omit, {
  obj: User;
  keys: 'email';
}>; // { id: number; name: string }

// Merge objects
type Extended = HKTF.Apply<Obj.Merge, {
  a: { id: number };
  b: { name: string };
}>; // { id: number; name: string }

// Make all properties optional
type Optional = HKTF.Apply<Obj.Partial, { obj: User }>; // Partial<User>

// Make all properties required
type Required = HKTF.Apply<Obj.Required, { obj: Optional }>; // User
```

---

## HKTO Combinators

```typescript
import * as Comb from '@servicejs/hkt-combinator';

// Map over HKTO
type Mapped = HKTO.Send<MyHKTO, {
  type: 'map';
  fn: TransformFn;
}>;

// FlatMap (andThen)
type FlatMapped = HKTO.Send<MyHKTO, {
  type: 'andThen';
  fn: FlatTransformFn;
}>;

// Fold
type Folded = HKTO.Send<OptionHKTO<number>, {
  type: 'fold';
  ifSome: (n: number) => string;
  ifNone: 'default';
}>;

// Traverse (sequence effects)
type Traversed = HKTO.Send<ArrayHKTO<OptionHKTO<number>>, {
  type: 'traverse';
  fn: SomeFn;
}>;

// Applicative (combine multiple)
type Combined = HKTO.Send<OptionHKTO<number>, {
  type: 'ap';
  fn: OptionHKTO<(n: number) => string>;
}>;
```

---

## Function Composition

```typescript
import * as Comp from '@servicejs/hkt-compose';

// Compose (right to left)
type Composed = HKTF.Apply<Comp.Compose, {
  f: NumberToString;
  g: StringToBoolean;
}>; // (number) => boolean

// Pipe (left to right)
type Piped = HKTF.Apply<Comp.Pipe, {
  fns: [
    ParseInt,
    MultiplyBy2,
    ToString
  ];
}>; // (string) => string

// Curry
type Curried = HKTF.Apply<Comp.Curry, {
  fn: (a: number, b: string) => boolean;
}>; // (a: number) => (b: string) => boolean

// Partial application
type Partial = HKTF.Apply<Comp.Partial, {
  fn: (a: number, b: string, c: boolean) => number;
  args: [number, string];
}>; // (c: boolean) => number
```

---

## Building Custom HKTFs

### Example: Optional Field HKTF

```typescript
// Make a field optional in an object
interface MakeOptionalArgs {
  obj: Record<string, any>;
  key: string;
}

interface MakeOptionalResult<T extends MakeOptionalArgs> {
  result: Omit<T['obj'], T['key']> & Partial<Pick<T['obj'], T['key']>>;
}

interface MakeOptional extends HKTF.Base {
  [HKTF.ArgsSymbol]: MakeOptionalArgs;
  [HKTF.ResultSymbol]: MakeOptionalResult<HKTF.Args<this>>;
}

// Usage
type User = { id: number; name: string; email: string };
type UserWithOptionalEmail = HKTF.Apply<MakeOptional, {
  obj: User;
  key: 'email';
}>; // { id: number; name: string; email?: string }
```

### Example: Array Filter HKTF

```typescript
interface FilterArgs<T> {
  array: T[];
  predicate: (item: T) => boolean;
}

interface FilterResult<T extends FilterArgs<any>> {
  result: T['predicate'] extends (item: infer U) => true ? U[] : never;
}

interface Filter extends HKTF.Base {
  [HKTF.ArgsSymbol]: FilterArgs<any>;
  [HKTF.ResultSymbol]: FilterResult<HKTF.Args<this>>;
}

// This is simplified - real implementation more complex
```

---

## Protocol Composition

```typescript
// Combine multiple protocols
interface ReadProtocol extends HKTO.Base {
  [HKTO.MethodsSymbol]: [
    GetMethod,
    ListMethod
  ];
}

interface WriteProtocol extends HKTO.Base {
  [HKTO.MethodsSymbol]: [
    SetMethod,
    DeleteMethod
  ];
}

// Compose into combined protocol
type ReadWriteProtocol = HKTO.Combine<[
  ...ReadProtocol[typeof HKTO.MethodsSymbol],
  ...WriteProtocol[typeof HKTO.MethodsSymbol]
]>;

// Runtime object type
type ReadWrite = HKTO.ToObject<ReadWriteProtocol>;
// { get(...), list(...), set(...), delete(...) }
```

---

## Performance Implications

### Compile-Time Cost

Complex type-level operations can slow TypeScript compilation:

```typescript
// ❌ Slow: Deep recursion
type DeepNested = Add<Add<Add<Add<Add<1, 2>, 3>, 4>, 5>, 6>;

// ✅ Better: Precompute or use simpler types
type Sum = 21; // Just use the result if known
```

### Type Complexity Limits

TypeScript has recursion limits (~50 levels):

```typescript
// May hit recursion limit
type VeryDeepTuple = Repeat<string, 100>;

// Better: Use simpler types or runtime code
const arr = new Array(100).fill('string');
```

### Best Practices

1. **Use type-level operations for static, known values**
2. **Prefer runtime code for dynamic operations**
3. **Cache complex type computations**
4. **Avoid deep recursion**
5. **Use type aliases to reduce duplication**

---

## Debugging Type-Level Code

### TypeScript Compiler Hints

```typescript
// See what a type resolves to
type Debug<T> = T extends infer U ? U : never;

type Result = HKTF.Apply<MyHKTF, { a: 1; b: 2 }>;
type DebugResult = Debug<Result>; // Hover to see resolved type
```

### Type Testing

```typescript
// Use type assertions to test types
import { expectType } from 'tsd';

type Result = HKTF.Apply<Add, { a: 2; b: 3 }>;
expectType<5>(0 as Result); // Compile error if not 5
```

---

## Summary

**Key Takeaways:**

1. **HKT utility packages provide type-level programming**
2. **Use for compile-time validation and type transformations**
3. **Be mindful of compilation performance**
4. **Prefer runtime code for dynamic operations**
5. **Test complex types with type assertions**

**Available Utilities:**

- Arithmetic, Boolean, String operations
- Tuple and Object manipulation
- HKTO combinators (map, fold, traverse)
- Function composition (compose, pipe, curry)

For detailed examples, see:
- `packages/hkt-*/README.md` for each utility package
- `packages/hkt-core/README.md` for HKT foundations
- `.claude/docs/hkt.md` for basic patterns
