# Package Development Guide

**Last Updated:** 2025-10-25

This guide explains how to create new packages for ServiceJS.

---

## Package Structure

All packages follow this structure:

```
packages/my-package/
├── src/
│   ├── index.ts           # Public API exports
│   ├── types.ts           # Type definitions
│   └── implementation.ts  # Implementation
├── tests/
│   └── index.test.ts      # Tests (co-located with src)
├── examples/
│   └── basic.ts           # Usage examples
├── README.md              # Documentation
├── package.json           # Package configuration
└── tsconfig.json          # TypeScript configuration
```

---

## Naming Conventions

### Package Names

- **Format**: `@servicejs/package-name`
- **Categories**:
  - `hkt-*` - Higher-kinded type utilities
  - `capability-*` - Capability interfaces
  - `runtime-*` - Platform runtime implementations
  - Core packages - `result`, `option`, `either`, etc.

### File Names

- **`index.ts`**: Main entry point, exports public API
- **`types.ts`**: Type definitions (optional)
- **`*.test.ts`**: Test files
- **`README.md`**: Package documentation

### Export Conventions

```typescript
// index.ts - Export everything needed by users
export type { MyType, MyOptions } from './types';
export { myFunction, myClass } from './implementation';

// Don't export internal utilities
```

---

## TypeScript Configuration

### tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*"],
  "exclude": ["tests/**/*", "dist/**/*", "node_modules/**/*"]
}
```

### Strict Mode Required

All packages must use TypeScript strict mode:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

---

## Package Configuration

### package.json

```json
{
  "name": "@servicejs/my-package",
  "version": "0.1.0",
  "description": "Brief description of package",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsup",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "typecheck": "tsc --noEmit"
  },
  "keywords": ["servicejs", "relevant", "keywords"],
  "author": "ServiceJS Contributors",
  "license": "MIT",
  "dependencies": {
    // Only required dependencies
  },
  "devDependencies": {
    "@types/bun": "latest",
    "tsup": "latest",
    "typescript": "latest"
  }
}
```

### Build Configuration (tsup.config.ts)

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2022',
});
```

---

## Code Quality Requirements

### 1. Type Safety

- ✅ No `any` types (use `unknown` if truly dynamic)
- ✅ All public APIs fully typed
- ✅ Strict mode enabled
- ✅ No TypeScript errors

```typescript
// ❌ Bad
function process(data: any) {
  return data.value;
}

// ✅ Good
function process<T>(data: { value: T }): T {
  return data.value;
}
```

### 2. Error Handling

- ✅ Use `Result<T, E>` for fallible operations
- ✅ Never throw for control flow
- ✅ Document what errors can occur

```typescript
// ❌ Bad
function readFile(path: string): string {
  if (!exists(path)) {
    throw new Error('File not found');
  }
  return doRead(path);
}

// ✅ Good
function readFile(path: string): Result<string, FileError> {
  if (!exists(path)) {
    return Err({ type: 'ENOENT', path });
  }
  return Ok(doRead(path));
}
```

### 3. Immutability

- ✅ Use `readonly` for all data structures
- ✅ Never mutate parameters
- ✅ Return new objects for changes

```typescript
// ❌ Bad
function increment(counter: { count: number }): void {
  counter.count++;
}

// ✅ Good
function increment(counter: { readonly count: number }): { readonly count: number } {
  return { count: counter.count + 1 };
}
```

### 4. Pure Functions

- ✅ No side effects in pure functions
- ✅ Same input → same output
- ✅ No I/O in business logic

```typescript
// ❌ Bad
function calculateTotal(items: Item[]): number {
  console.log('Calculating total...'); // Side effect!
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ Good
function calculateTotal(items: readonly Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

---

## Testing Requirements

### Coverage Goals

- **Unit Tests**: >90% line coverage
- **All Public APIs**: Must have tests
- **Error Paths**: Must be tested
- **Edge Cases**: Empty arrays, null, boundary values

### Test Structure

```typescript
import { describe, test, expect } from 'bun:test';

describe('MyPackage', () => {
  describe('myFunction', () => {
    test('handles normal case', () => {
      const result = myFunction(validInput);
      expect(result.ok).toBe(true);
    });

    test('handles error case', () => {
      const result = myFunction(invalidInput);
      expect(result.ok).toBe(false);
    });

    test('handles edge case - empty input', () => {
      const result = myFunction([]);
      expect(result).toEqual(expected);
    });
  });
});
```

### Running Tests

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Watch mode
bun test --watch

# Specific file
bun test src/my-package.test.ts
```

---

## Documentation Requirements

### README.md Structure

```markdown
# @servicejs/my-package

Brief one-line description.

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

\`\`\`bash
bun add @servicejs/my-package
\`\`\`

## Usage

\`\`\`typescript
import { myFunction } from '@servicejs/my-package';

const result = myFunction(input);
\`\`\`

## API

### myFunction

Description of what it does.

**Parameters:**
- `param1: Type` - Description
- `param2: Type` - Description

**Returns:** `Result<Success, Error>`

**Example:**
\`\`\`typescript
// Example usage
\`\`\`

## License

MIT
```

### JSDoc Comments

All public APIs must have JSDoc:

```typescript
/**
 * Processes input and returns transformed result.
 *
 * This function validates input, transforms it, and returns
 * a Result indicating success or failure.
 *
 * @param input - The data to process
 * @param options - Configuration options
 * @returns Ok with result, or Err with error details
 *
 * @example
 * ```typescript
 * const result = process({ value: 42 }, { strict: true });
 * if (result.ok) {
 *   console.log(result.value);
 * }
 * ```
 */
export function process(
  input: Input,
  options?: Options
): Result<Output, ProcessError> {
  // Implementation
}
```

---

## Development Workflow

### 1. Create Package

```bash
cd packages
mkdir my-package
cd my-package

# Create structure
mkdir -p src tests examples
touch src/index.ts tests/index.test.ts README.md package.json tsconfig.json
```

### 2. Implement

```typescript
// src/index.ts
export function myFunction() {
  // Implementation
}
```

### 3. Write Tests

```typescript
// tests/index.test.ts
import { test, expect } from 'bun:test';
import { myFunction } from '../src';

test('myFunction works', () => {
  expect(myFunction()).toBe(expected);
});
```

### 4. Build and Test

```bash
bun run build
bun test
bun run typecheck
```

### 5. Document

Write README.md with usage examples and API documentation.

### 6. Review Checklist

- [ ] TypeScript strict mode enabled
- [ ] All exports properly typed
- [ ] Tests written (>90% coverage)
- [ ] All tests passing
- [ ] README.md complete
- [ ] JSDoc comments on public APIs
- [ ] Examples provided
- [ ] No `any` types
- [ ] Result types for errors
- [ ] Immutable data structures
- [ ] Build succeeds

---

## Publishing Workflow

### Version Bump

```bash
# Update version in package.json
npm version patch  # or minor, or major

# Build
bun run build

# Test
bun test

# Publish
npm publish --access public
```

### Changelog

Update CHANGELOG.md with:
- New features
- Bug fixes
- Breaking changes

---

## Common Patterns

### Capability Package

```typescript
// src/index.ts
export interface MyCapability {
  operation(): Promise<Result<Output, Error>>;
}

export function createInMemoryImplementation(): MyCapability {
  return {
    operation: async () => Ok(result)
  };
}

export function createNoOpImplementation(): MyCapability {
  return {
    operation: async () => Err({ type: 'NO_OP' })
  };
}
```

### HKT Package

```typescript
// src/index.ts
import { HKTF } from '@servicejs/hkt-core';

export interface MyHKTFArgs {
  input: number;
}

export interface MyHKTFResult<T extends MyHKTFArgs> {
  output: string;
}

export interface MyHKTF extends HKTF.Base {
  [HKTF.ArgsSymbol]: MyHKTFArgs;
  [HKTF.ResultSymbol]: MyHKTFResult<HKTF.Args<this>>;
}

// Runtime implementation
export function myFunction(args: MyHKTFArgs): MyHKTFResult<MyHKTFArgs> {
  return { output: String(args.input) };
}
```

### Type Utility Package

```typescript
// src/index.ts
export type MyType<T> = /* ... */;

export function create<T>(value: T): MyType<T> {
  // Implementation
}

export function map<T, U>(
  type: MyType<T>,
  fn: (value: T) => U
): MyType<U> {
  // Implementation
}
```

---

## Quality Checklist

Before submitting a new package:

### Code Quality
- [ ] No `any` types
- [ ] Strict mode enabled
- [ ] No TypeScript errors
- [ ] No console.log in production code
- [ ] Immutable data structures
- [ ] Pure functions where possible
- [ ] Result types for errors

### Testing
- [ ] >90% test coverage
- [ ] All public APIs tested
- [ ] Error paths tested
- [ ] Edge cases covered
- [ ] All tests passing

### Documentation
- [ ] README.md complete
- [ ] Usage examples provided
- [ ] JSDoc on public APIs
- [ ] API reference complete

### Configuration
- [ ] package.json correct
- [ ] tsconfig.json extends root
- [ ] Build configuration correct
- [ ] Exports properly configured

### Package
- [ ] Follows naming conventions
- [ ] Proper directory structure
- [ ] No unnecessary dependencies
- [ ] Files array in package.json

---

## Summary

**Key Principles:**

1. **Type Safety**: Strict mode, no `any`, proper types
2. **Quality**: >90% coverage, comprehensive tests
3. **Documentation**: README, JSDoc, examples
4. **Consistency**: Follow conventions, use patterns
5. **Simplicity**: Keep it focused, minimal dependencies

**Resources:**

- Example packages in `packages/*/`
- `.claude/docs/hkt.md` - HKT patterns
- `.claude/docs/capability-patterns.md` - Capability design
- `.claude/docs/testing-guide.md` - Testing strategies

For questions, open an issue or discussion on GitHub.
