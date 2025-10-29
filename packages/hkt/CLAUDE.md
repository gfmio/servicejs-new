# HKT Packages - Claude Collaboration Guide

**Last Updated:** 2025-01-29
**Version:** 1.0.0

---

## Project Overview

The HKT (Higher-Kinded Types) packages provide a comprehensive type-level programming system for TypeScript. These are **production-grade, standalone libraries** that can be used independently or as part of the ServiceJS ecosystem.

### Design Philosophy

1. **Type-Level Purity**: All operations work at both compile-time (types) and runtime (functions)
2. **Zero Dependencies**: Each package should have minimal dependencies (only hkt-core and specific type libraries)
3. **Production Quality**: Enterprise-grade code with exhaustive testing, documentation, and examples
4. **Developer Experience**: Clear APIs, helpful error messages, comprehensive documentation
5. **Tree-Shakeable**: Modular exports that enable optimal bundling

---

## Package Structure

```
packages/
  hkt/              # Meta-package (re-exports all)
  hkt-core/         # Foundation (HKTF, HKTO, Method, FunctionHKTF)
  hkt-arithmetic/   # Numeric operations
  hkt-boolean/      # Boolean logic
  hkt-string/       # String manipulation
  hkt-tuple/        # Tuple operations
  hkt-object/       # Object/record operations
  hkt-compose/      # Function composition
  hkt-combinator/   # HKTO transformations
```

---

## Quality Standards (Non-Negotiable)

### 1. Code Quality

#### ✅ Always Do

- **Type Safety**: Use strict TypeScript settings, NEVER use `any` except in runtime type conversions where unavoidable
- **Naming Conventions**:
  - HKTF interfaces: `PascalCase` (e.g., `Capitalize`, `MapValues`)
  - Args interfaces: `{Name}Args` (e.g., `CapitalizeArgs`)
  - Result types: `{Name}Result<T extends {Name}Args>` (e.g., `CapitalizeResult`)
  - Runtime functions: `camelCase` matching the HKTF name (e.g., `capitalize`)
- **Modularity**: Each HKTF in its own file
- **Const Generics**: Use `const` type parameters for precise inference
- **Readonly**: All arrays/tuples should be `readonly`
- **Pure Functions**: Runtime implementations must be pure (no side effects)

#### ❌ Never Do

- Use `any` for function parameters or return types
- Mutate input parameters
- Add side effects to HKTF implementations
- Skip type-level implementations (even if complex)
- Use raw function types (always use `FunctionHKTF.Fn1`, etc.)
- Create circular dependencies between packages

### 2. Testing Requirements

#### Coverage Standards

- **Minimum**: 95% code coverage
- **Target**: 98%+ coverage
- Test BOTH type-level and runtime behavior

#### Test Organization

```typescript
// tests/TypeName.test.ts
import { describe, test, expect, expectTypeOf } from 'bun:test';
import type { HKTF } from '@servicejs/hkt-core';
import { type Capitalize, capitalize } from '../src/string/Capitalize';

describe('Capitalize HKTF', () => {
  describe('Type-level behavior', () => {
    test('capitalizes first letter', () => {
      type Result = HKTF.Apply<Capitalize, { str: 'hello' }>;
      expectTypeOf<Result>().toEqualTypeOf<'Hello'>();
    });

    test('handles empty string', () => {
      type Result = HKTF.Apply<Capitalize, { str: '' }>;
      expectTypeOf<Result>().toEqualTypeOf<''>();
    });

    test('preserves already capitalized', () => {
      type Result = HKTF.Apply<Capitalize, { str: 'Hello' }>;
      expectTypeOf<Result>().toEqualTypeOf<'Hello'>();
    });
  });

  describe('Runtime behavior', () => {
    test('capitalizes first letter - positional args', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    test('capitalizes first letter - named args', () => {
      expect(capitalize({ str: 'hello' })).toBe('Hello');
    });

    test('handles empty string', () => {
      expect(capitalize('')).toBe('');
      expect(capitalize({ str: '' })).toBe('');
    });

    test('preserves rest of string', () => {
      expect(capitalize('hELLO')).toBe('HELLO');
    });

    test('handles single character', () => {
      expect(capitalize('a')).toBe('A');
    });
  });
});
```

#### Test Coverage Checklist

For EVERY HKTF, test:

- [ ] Type-level behavior with `expectTypeOf`
- [ ] Runtime behavior with both overloads (positional + named args)
- [ ] Edge cases (empty inputs, boundary conditions)
- [ ] Error cases (if applicable)
- [ ] Type inference quality
- [ ] Integration with other HKTFs (if applicable)

### 3. Documentation Standards

#### README.md Structure

Every package must have:

```markdown
# @servicejs/hkt-{name}

> Type-level {domain} operations for TypeScript

## Features

- 🎯 Type-safe {domain} operations at compile-time
- 🚀 Zero-overhead runtime implementations
- 📦 Tree-shakeable exports
- 🔧 Full TypeScript strict mode support
- ✅ 100% test coverage

## Installation

\`\`\`bash
npm install @servicejs/hkt-{name}
# or
bun add @servicejs/hkt-{name}
\`\`\`

## Quick Start

\`\`\`typescript
import type { HKTF } from '@servicejs/hkt-core';
import { type Example, example } from '@servicejs/hkt-{name}';

// Type-level usage
type Result = HKTF.Apply<Example, { input: 'value' }>;

// Runtime usage
const result = example('value');
// or
const result = example({ input: 'value' });
\`\`\`

## API Reference

### TypeName

Description of what it does.

**Type Signature:**
\`\`\`typescript
interface TypeNameArgs {
  param: Type;
}

type TypeNameResult<T extends TypeNameArgs> = ...;

interface TypeName extends HKTF.Base {
  [HKTF.ArgsSymbol]: TypeNameArgs;
  [HKTF.ResultSymbol]: TypeNameResult<HKTF.Args<this>>;
}
\`\`\`

**Runtime Signature:**
\`\`\`typescript
function typeName<const T>(param: T): HKTF.Apply<TypeName, {param: T}>;
function typeName<const T extends TypeNameArgs>(args: T): HKTF.Apply<TypeName, T>;
\`\`\`

**Examples:**
\`\`\`typescript
// Type-level
type Result = HKTF.Apply<TypeName, { param: 'value' }>;

// Runtime - positional
const result1 = typeName('value');

// Runtime - named
const result2 = typeName({ param: 'value' });
\`\`\`

## Complete API

- [Type1](#type1) - Description
- [Type2](#type2) - Description
...

## License

MIT
```

#### JSDoc Standards

Every exported type and function must have JSDoc:

```typescript
/**
 * Capitalize HKTF - capitalizes the first letter of a string
 *
 * This operation works at both type-level and runtime, providing
 * compile-time type transformations and runtime string manipulation.
 *
 * @example
 * Type-level usage:
 * ```typescript
 * type Result = HKTF.Apply<Capitalize, { str: 'hello' }>;
 * // Result: 'Hello'
 * ```
 *
 * @example
 * Runtime usage:
 * ```typescript
 * const result = capitalize('hello');
 * // result: 'Hello'
 * ```
 *
 * @see {@link https://github.com/servicejs/hkt/tree/main/packages/hkt-string#capitalize}
 */
export interface Capitalize extends HKTF.Base {
  [HKTF.ArgsSymbol]: CapitalizeArgs;
  [HKTF.ResultSymbol]: CapitalizeResult<HKTF.Args<this>>;
}

/**
 * Capitalizes the first letter of a string
 *
 * Supports both positional and named argument styles for flexibility.
 *
 * @param str - The string to capitalize (positional style)
 * @returns The string with its first letter capitalized
 *
 * @example
 * ```typescript
 * capitalize('hello') // 'Hello'
 * capitalize({ str: 'world' }) // 'World'
 * capitalize('') // ''
 * ```
 */
export function capitalize<const S extends string>(
  str: S
): HKTF.Apply<Capitalize, {str: S}>;
```

### 4. Implementation Patterns

#### HKTF Implementation Template

```typescript
// packages/hkt-{domain}/src/{domain}/OperationName.ts

import type { HKTF } from '@servicejs/hkt-core';
// Import other dependencies as needed

/**
 * Args interface - defines input parameters
 */
export interface OperationNameArgs {
  input: InputType;
  // ... other parameters
}

/**
 * Result type - computes the output type
 */
export type OperationNameResult<T extends OperationNameArgs> =
  /* Type-level computation */;

/**
 * OperationName HKTF - brief description
 *
 * Detailed description of what this does, when to use it,
 * and any important edge cases.
 *
 * @example
 * ```typescript
 * type Result = HKTF.Apply<OperationName, { input: value }>;
 * // Result: ...
 * ```
 */
export interface OperationName extends HKTF.Base {
  [HKTF.ArgsSymbol]: OperationNameArgs;
  [HKTF.ResultSymbol]: OperationNameResult<HKTF.Args<this>>;
}

/**
 * Runtime implementation
 *
 * @example
 * ```typescript
 * operationName(value) // positional
 * operationName({ input: value }) // named
 * ```
 */
export function operationName<const I extends InputType>(
  input: I
): HKTF.Apply<OperationName, {input: I}>;
export function operationName<const T extends OperationNameArgs>(
  args: T
): HKTF.Apply<OperationName, T>;
export function operationName<const T extends OperationNameArgs>(
  ...args: [T] | [T["input"], /* ...other params */]
): HKTF.Apply<OperationName, T> {
  // Handle named args
  if (typeof args[0] === 'object' && 'input' in args[0]) {
    return /* computation */ as HKTF.Apply<OperationName, T>;
  }
  // Handle positional args
  return /* computation */ as HKTF.Apply<OperationName, T>;
}
```

#### FunctionHKTF Usage

When an HKTF accepts a function parameter:

```typescript
// ❌ WRONG - raw function type
export interface MapArgs {
  tuple: readonly unknown[];
  fn: (x: unknown) => unknown; // BAD!
}

// ✅ CORRECT - FunctionHKTF
export interface MapArgs {
  tuple: readonly unknown[];
  fn: FunctionHKTF.Fn1<unknown, unknown>; // GOOD!
}
```

#### Complex Type-Level Computation

When type-level computation is complex:

```typescript
// DO: Provide the full type-level implementation
export type ComplexResult<T extends ComplexArgs> =
  T['input'] extends SomePattern
    ? /* handle case 1 */
    : T['input'] extends AnotherPattern
    ? /* handle case 2 */
    : /* default case */;

// DON'T: Use simplified placeholder
export type ComplexResult<T extends ComplexArgs> = any; // BAD!

// IF complexity is extreme, document the limitation:
/**
 * Note: Type-level computation is simplified due to TypeScript's
 * recursion depth limits. Runtime implementation is fully accurate.
 */
export type ComplexResult<_T extends ComplexArgs> = SomeReasonableApproximation;
```

### 5. Package Configuration

#### package.json Template

```json
{
  "name": "@servicejs/hkt-{name}",
  "version": "0.1.0",
  "description": "Type-level {domain} operations for TypeScript",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./*": {
      "types": "./dist/*.d.ts",
      "import": "./dist/*.js"
    }
  },
  "files": [
    "dist",
    "src",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "test": "bun test",
    "test:coverage": "bun test --coverage",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "keywords": [
    "typescript",
    "types",
    "hkt",
    "higher-kinded-types",
    "{domain}"
  ],
  "dependencies": {
    "@servicejs/hkt-core": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

#### tsconfig.json Standards

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../hkt-core" }
  ]
}
```

---

## Workflow Processes

### Adding a New HKTF

When adding a new HKTF to a package:

1. **Design Phase**
   - [ ] Define clear input/output types
   - [ ] Research type-level implementation approach
   - [ ] Consider edge cases and limitations
   - [ ] Plan test cases

2. **Implementation Phase**
   - [ ] Create `src/{domain}/TypeName.ts`
   - [ ] Implement Args interface
   - [ ] Implement Result type (full type-level computation)
   - [ ] Implement HKTF interface
   - [ ] Implement runtime function with both overloads
   - [ ] Add JSDoc documentation
   - [ ] Export from `src/{domain}/index.ts`

3. **Testing Phase**
   - [ ] Create `tests/TypeName.test.ts`
   - [ ] Write type-level tests with `expectTypeOf`
   - [ ] Write runtime tests for both overloads
   - [ ] Test edge cases thoroughly
   - [ ] Verify 95%+ coverage

4. **Documentation Phase**
   - [ ] Add API section to README.md
   - [ ] Include usage examples
   - [ ] Document edge cases and limitations
   - [ ] Add to package index if needed

5. **Review Phase**
   - [ ] Run `bun test`
   - [ ] Run `bun test:coverage`
   - [ ] Run `bun run type-check`
   - [ ] Run `bun run build`
   - [ ] Self-review against quality checklist

### Creating a New Package

When creating a new HKT package:

1. **Setup**
   - [ ] Create directory structure
   - [ ] Copy package.json template
   - [ ] Copy tsconfig.json template
   - [ ] Create README.md from template
   - [ ] Add to workspace dependencies

2. **Core Implementation**
   - [ ] Implement index.ts with exports
   - [ ] Create domain-specific subdirectory
   - [ ] Implement initial HKTFs
   - [ ] Set up tests directory

3. **Integration**
   - [ ] Add to meta-package (packages/hkt)
   - [ ] Update root README if needed
   - [ ] Ensure builds correctly
   - [ ] Verify tree-shaking works

### Making Changes to Existing HKTFs

When modifying existing code:

1. **Before Changes**
   - [ ] Read existing tests thoroughly
   - [ ] Understand current behavior
   - [ ] Document intended changes
   - [ ] Consider backward compatibility

2. **During Changes**
   - [ ] Maintain existing API surface
   - [ ] Update tests to match new behavior
   - [ ] Update documentation
   - [ ] Ensure type-level matches runtime

3. **After Changes**
   - [ ] All tests pass
   - [ ] Coverage remains ≥95%
   - [ ] No type errors
   - [ ] Documentation is accurate

---

## Common Patterns & Anti-Patterns

### ✅ Good Patterns

#### 1. Type-Level Recursion with Base Case

```typescript
export type MapResult<T extends MapArgs> =
  T['tuple'] extends readonly []
    ? readonly []  // Base case
    : T['tuple'] extends readonly [infer Head, ...infer Tail]
      ? readonly [
          HKTF.Apply<T['fn'], { input: Head }>,
          ...MapResult<{ tuple: Tail; fn: T['fn'] }>
        ]
      : readonly [];
```

#### 2. Dual Overload Pattern

```typescript
// Positional overload
export function map<const A extends readonly unknown[], const F extends FunctionHKTF.Fn1<unknown, unknown>>(
  tuple: A,
  fn: F
): HKTF.Apply<Map, {tuple: A, fn: F}>;

// Named overload
export function map<const T extends MapArgs>(
  args: T
): HKTF.Apply<Map, T>;

// Implementation
export function map<const T extends MapArgs>(
  ...args: [T] | [T["tuple"], T["fn"]]
): HKTF.Apply<Map, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    // Named args path
  }
  // Positional args path
}
```

#### 3. Helper Types for Complex Logic

```typescript
// Extract helper types
type IsInTuple<E, T extends readonly unknown[]> = /* ... */;

// Use in main type
export type FilterResult<T extends FilterArgs> =
  FilterHelper<T['tuple'], T['predicate']>;

type FilterHelper<
  Tuple extends readonly unknown[],
  Pred extends FunctionHKTF.Predicate<unknown>
> = /* uses IsInTuple helper */;
```

### ❌ Anti-Patterns to Avoid

#### 1. Raw Function Types

```typescript
// ❌ BAD
fn: (x: number) => string

// ✅ GOOD
fn: FunctionHKTF.Fn1<number, string>
```

#### 2. Mutation in Runtime

```typescript
// ❌ BAD
export function push<const T extends PushArgs>(...args: any): any {
  const arr = args[0].tuple;
  arr.push(args[0].element); // MUTATION!
  return arr;
}

// ✅ GOOD
export function push<const T extends PushArgs>(...args: any): any {
  return [...args[0].tuple, args[0].element];
}
```

#### 3. Skipping Type-Level Implementation

```typescript
// ❌ BAD
export type ComplexResult<T extends ComplexArgs> = any;

// ✅ GOOD
export type ComplexResult<T extends ComplexArgs> =
  T['input'] extends Pattern1 ? Result1 :
  T['input'] extends Pattern2 ? Result2 :
  DefaultResult;
```

#### 4. Incomplete Testing

```typescript
// ❌ BAD - only tests happy path
test('adds numbers', () => {
  expect(add(1, 2)).toBe(3);
});

// ✅ GOOD - tests edge cases too
test('adds numbers', () => {
  expect(add(1, 2)).toBe(3);
  expect(add(0, 0)).toBe(0);
  expect(add(-1, 1)).toBe(0);
  expect(add({ a: 1, b: 2 })).toBe(3); // named args
});
```

---

## Self-Review Checklist

Before considering any work complete, verify:

### Code Quality

- [ ] No `any` types (except unavoidable runtime conversions)
- [ ] All arrays/tuples are `readonly`
- [ ] Const generics used throughout
- [ ] FunctionHKTF used for all function parameters
- [ ] No mutations in runtime implementations
- [ ] File organization matches conventions

### Testing

- [ ] Type-level tests with `expectTypeOf`
- [ ] Runtime tests for both overloads
- [ ] Edge cases covered
- [ ] Coverage ≥95%
- [ ] All tests pass

### Documentation

- [ ] JSDoc on all exports
- [ ] Examples in JSDoc
- [ ] README.md updated
- [ ] API reference complete
- [ ] Edge cases documented

### Build & Type Safety

- [ ] `bun run type-check` passes
- [ ] `bun run build` succeeds
- [ ] No TypeScript errors
- [ ] Exports configured correctly

---

## Communication Guidelines

### When Implementing

Be explicit about:

- What HKTF you're working on
- The type-level approach you're taking
- Any limitations or trade-offs
- Test coverage achieved

### When Stuck

Ask about:

- Type-level recursion strategies
- Edge case handling
- API design decisions
- Performance implications

### When Complete

Report:

- What was implemented
- Test coverage percentage
- Any limitations discovered
- Next steps if applicable

---

## Production Quality Mindset

Remember: These are **standalone libraries** that developers will depend on. Every HKTF must be:

1. **Bulletproof**: Handles all edge cases correctly
2. **Well-Tested**: Comprehensive test coverage
3. **Well-Documented**: Clear examples and API docs
4. **Type-Safe**: Precise type inference
5. **Performant**: Efficient implementations
6. **Maintainable**: Clean, readable code

**When in doubt, over-engineer the quality, not the complexity.**

---

## Success Criteria

You know you've succeeded when:

- ✅ All tests pass with ≥95% coverage
- ✅ TypeScript compiles with no errors
- ✅ Documentation is complete and clear
- ✅ Code follows all patterns and conventions
- ✅ Package builds successfully
- ✅ API is intuitive and well-typed
- ✅ Examples run without issues

---

**Remember**: Production quality is not optional. Every line of code should meet professional standards. We're building libraries that developers will rely on.
