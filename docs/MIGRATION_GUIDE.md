# Migration Guide from Standard TypeScript

This guide helps you migrate from standard TypeScript patterns to ServiceJS type utilities (Result, Option, Either).

## Table of Contents

- [Why Migrate?](#why-migrate)
- [Converting `null | T` to `Option<T>`](#converting-null--t-to-optiont)
- [Converting `try/catch` to `Result<T, E>`](#converting-trycatch-to-resultt-e)
- [Converting Validation to `Either<Error, T>`](#converting-validation-to-eithererror-t)
- [Migration Strategy](#migration-strategy)
- [Common Patterns](#common-patterns)

---

## Why Migrate?

ServiceJS type utilities provide several advantages over standard TypeScript error handling:

### **Explicit Error Handling**
- Errors are part of the type signature
- Compiler enforces error checking
- No forgotten error cases

### **Type Safety**
- Full type inference through transformation chains
- No `any` types or type assertions
- Precise error types

### **Composability**
- Functional combinators (map, flatMap, andThen)
- Chain operations without nested try/catch
- Reusable error handling logic

### **Consistency**
- Uniform API across all error-prone operations
- No mixing of exceptions, null, and undefined
- Clear intent in code

---

## Converting `null | T` to `Option<T>`

### Before: Nullable Types

```typescript
// ❌ Standard TypeScript with null checking
function findUser(id: number): User | null {
  const user = database.users.find((u) => u.id === id);
  return user ?? null;
}

// Usage requires null checks everywhere
const user = findUser(123);
if (user !== null) {
  console.log(user.name);
} else {
  console.log('User not found');
}

// Easy to forget null checks (runtime error!)
const userName = findUser(123).name; // TypeError if user is null
```

### After: Option Type

```typescript
// ✅ ServiceJS with Option
import { Some, None, isSome, type Option } from '@servicejs/option';

function findUser(id: number): Option<User> {
  const user = database.users.find((u) => u.id === id);
  return user ? Some(user) : None();
}

// Usage with type-safe combinators
const user = findUser(123);

if (isSome(user)) {
  console.log(user.value.name); // Type-safe access
} else {
  console.log('User not found');
}

// Or use functional style
const userName = findUser(123)
  .map((u) => u.name)
  .getOrElse('Unknown');

console.log(userName); // Always safe, never throws
```

### Migration Steps

1. **Replace return types:**
   ```typescript
   // Before
   function getValue(): string | null

   // After
   function getValue(): Option<string>
   ```

2. **Replace null returns with None():**
   ```typescript
   // Before
   return null;

   // After
   return None();
   ```

3. **Replace value returns with Some():**
   ```typescript
   // Before
   return value;

   // After
   return Some(value);
   ```

4. **Replace null checks:**
   ```typescript
   // Before
   if (value !== null) { ... }

   // After
   if (isSome(value)) { ... }
   ```

### Common Patterns

**Optional Configuration:**
```typescript
// Before
interface Config {
  timeout?: number;
  retries?: number;
}

function getTimeout(config: Config): number {
  return config.timeout ?? 5000;
}

// After
import { type Option, Some, None } from '@servicejs/option';

interface Config {
  timeout: Option<number>;
  retries: Option<number>;
}

function getTimeout(config: Config): number {
  return config.timeout.getOrElse(5000);
}
```

**Optional Chaining:**
```typescript
// Before
const street = user?.address?.street ?? 'Unknown';

// After
const street = Some(user)
  .flatMap((u) => u.address)
  .flatMap((a) => a.street)
  .getOrElse('Unknown');
```

**Array Operations:**
```typescript
// Before
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

// After
import { type Option, Some, None } from '@servicejs/option';

function first<T>(arr: T[]): Option<T> {
  return arr.length > 0 ? Some(arr[0]) : None();
}
```

---

## Converting `try/catch` to `Result<T, E>`

### Before: Exception-Based Error Handling

```typescript
// ❌ Standard TypeScript with exceptions
function parseJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('Parse error:', error);
    throw error; // Propagates exception
  }
}

// Usage requires try/catch at every call site
try {
  const data = parseJSON(input);
  console.log(data.value);
} catch (error) {
  console.error('Failed to parse');
}

// Or worse - forgotten error handling (crashes app!)
const data = parseJSON(input); // Throws if invalid
```

### After: Result Type

```typescript
// ✅ ServiceJS with Result
import { Ok, Err, isOk, type Result } from '@servicejs/result';

function parseJSON<T>(text: string): Result<T, Error> {
  try {
    const value = JSON.parse(text);
    return Ok(value);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
}

// Usage with type-safe error handling
const result = parseJSON<User>(input);

if (isOk(result)) {
  console.log(result.value.name); // Type-safe access
} else {
  console.error('Failed to parse:', result.error.message);
}

// Or use functional style
const name = parseJSON<User>(input)
  .map((user) => user.name)
  .unwrapOr('Unknown');

console.log(name); // Always safe, never throws
```

### Migration Steps

1. **Replace function return types:**
   ```typescript
   // Before
   function operation(): T // throws

   // After
   function operation(): Result<T, Error>
   ```

2. **Replace try/catch with Ok/Err:**
   ```typescript
   // Before
   try {
     const result = riskyOperation();
     return result;
   } catch (error) {
     throw error;
   }

   // After
   try {
     const result = riskyOperation();
     return Ok(result);
   } catch (error) {
     return Err(error instanceof Error ? error : new Error(String(error)));
   }
   ```

3. **Replace throw statements:**
   ```typescript
   // Before
   if (invalid) {
     throw new Error('Invalid input');
   }
   return value;

   // After
   if (invalid) {
     return Err(new Error('Invalid input'));
   }
   return Ok(value);
   ```

4. **Chain operations:**
   ```typescript
   // Before
   try {
     const data = await fetchData();
     const parsed = parseData(data);
     const validated = validateData(parsed);
     return validated;
   } catch (error) {
     console.error(error);
     throw error;
   }

   // After
   const result = await fetchData()
     .andThen(parseData)
     .andThen(validateData);

   if (isOk(result)) {
     return result.value;
   } else {
     console.error(result.error);
     return result;
   }
   ```

### Common Patterns

**File Operations:**
```typescript
// Before
import { readFileSync } from 'fs';

function readConfig(): Config {
  try {
    const text = readFileSync('config.json', 'utf-8');
    const data = JSON.parse(text);
    return data;
  } catch (error) {
    throw new Error(`Failed to read config: ${error}`);
  }
}

// After
import { readFileSync } from 'fs';
import { Ok, Err, type Result } from '@servicejs/result';

function readConfig(): Result<Config, Error> {
  try {
    const text = readFileSync('config.json', 'utf-8');
    const data = JSON.parse(text);
    return Ok(data);
  } catch (error) {
    return Err(new Error(`Failed to read config: ${error}`));
  }
}
```

**Async Operations:**
```typescript
// Before
async function fetchUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

// After
import { Ok, Err, type Result } from '@servicejs/result';

async function fetchUser(id: number): Promise<Result<User, Error>> {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      return Err(new Error(`HTTP ${response.status}`));
    }
    const data = await response.json();
    return Ok(data);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
}
```

**Database Operations:**
```typescript
// Before
function insertUser(user: User): number {
  const id = db.insert('users', user);
  if (!id) {
    throw new Error('Failed to insert user');
  }
  return id;
}

// After
import { Ok, Err, type Result } from '@servicejs/result';

function insertUser(user: User): Result<number, Error> {
  const id = db.insert('users', user);
  if (!id) {
    return Err(new Error('Failed to insert user'));
  }
  return Ok(id);
}
```

---

## Converting Validation to `Either<Error, T>`

### Before: Multiple Error Types

```typescript
// ❌ Standard TypeScript with mixed error handling
type ValidationError = string[];

function validateUser(data: any): User | ValidationError {
  const errors: string[] = [];

  if (!data.email) errors.push('Email is required');
  if (!data.name) errors.push('Name is required');

  if (errors.length > 0) {
    return errors; // Return errors
  }

  return { email: data.email, name: data.name }; // Return user
}

// Usage is awkward - how do we distinguish?
const result = validateUser(input);
if (Array.isArray(result)) {
  console.error('Validation failed:', result);
} else {
  console.log('User created:', result.name);
}
```

### After: Either Type

```typescript
// ✅ ServiceJS with Either
import { Left, Right, isRight, type Either } from '@servicejs/either';

type ValidationErrors = string[];

function validateUser(data: any): Either<ValidationErrors, User> {
  const errors: string[] = [];

  if (!data.email) errors.push('Email is required');
  if (!data.name) errors.push('Name is required');

  if (errors.length > 0) {
    return Left(errors);
  }

  return Right({ email: data.email, name: data.name });
}

// Usage is type-safe and clear
const result = validateUser(input);

if (isRight(result)) {
  console.log('User created:', result.value.name);
} else {
  console.error('Validation failed:', result.value.join(', '));
}
```

### Migration Steps

1. **Identify functions with multiple return types:**
   ```typescript
   // Before
   function validate(input: any): User | string[]

   // After
   function validate(input: any): Either<string[], User>
   ```

2. **Replace error returns with Left():**
   ```typescript
   // Before
   return ['Error 1', 'Error 2'];

   // After
   return Left(['Error 1', 'Error 2']);
   ```

3. **Replace success returns with Right():**
   ```typescript
   // Before
   return user;

   // After
   return Right(user);
   ```

4. **Replace type guards:**
   ```typescript
   // Before
   if (Array.isArray(result)) { /* errors */ }

   // After
   if (isLeft(result)) { /* errors */ }
   ```

### Common Patterns

**Form Validation:**
```typescript
import { Left, Right, type Either } from '@servicejs/either';

type ValidationError = { field: string; message: string };
type ValidationErrors = ValidationError[];

function validateForm(data: FormData): Either<ValidationErrors, ValidatedData> {
  const errors: ValidationErrors = [];

  if (!data.email.includes('@')) {
    errors.push({ field: 'email', message: 'Invalid email' });
  }

  if (data.password.length < 8) {
    errors.push({ field: 'password', message: 'Password too short' });
  }

  if (errors.length > 0) {
    return Left(errors);
  }

  return Right({
    email: data.email,
    password: data.password,
  });
}
```

**Multi-Step Validation:**
```typescript
import { Left, Right, type Either } from '@servicejs/either';

function validateAndTransform(input: string): Either<string, number> {
  if (input.length === 0) {
    return Left('Input is empty');
  }

  const num = parseInt(input, 10);

  if (isNaN(num)) {
    return Left('Input is not a number');
  }

  if (num < 0) {
    return Left('Number must be positive');
  }

  return Right(num);
}
```

---

## Migration Strategy

### Incremental Migration

You don't need to migrate everything at once. Here's a recommended approach:

#### **Phase 1: New Code**
- Use Result/Option/Either for all new functions
- Set team standards for new development

#### **Phase 2: Public APIs**
- Migrate public API functions first
- Update tests to use new types
- Keep internal implementations as-is initially

#### **Phase 3: Critical Paths**
- Migrate error-prone code paths
- Focus on areas with frequent bugs
- Add better error handling

#### **Phase 4: Complete Migration**
- Migrate remaining code gradually
- Refactor to use functional combinators
- Remove old error handling patterns

### Coexistence Patterns

**Wrapping Legacy Code:**
```typescript
import { Ok, Err, type Result } from '@servicejs/result';

// Legacy function that throws
function legacyOperation(): Data {
  // ... may throw
}

// Wrapper for new code
function safeOperation(): Result<Data, Error> {
  try {
    const data = legacyOperation();
    return Ok(data);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
}
```

**Unwrapping for Legacy Code:**
```typescript
import { Ok, Err, type Result } from '@servicejs/result';

// New function with Result
function newOperation(): Result<Data, Error> {
  // ... returns Result
}

// Adapter for legacy code
function legacyOperation(): Data {
  const result = newOperation();
  if (isOk(result)) {
    return result.value;
  } else {
    throw result.error;
  }
}
```

---

## Common Patterns

### Combining Multiple Results

```typescript
import { Ok, Err, isOk, type Result } from '@servicejs/result';

function combineResults<T>(
  results: Result<T, Error>[]
): Result<T[], Error> {
  const values: T[] = [];

  for (const result of results) {
    if (isOk(result)) {
      values.push(result.value);
    } else {
      return result; // Return first error
    }
  }

  return Ok(values);
}

// Usage
const results = [
  parseJSON<User>('{"name":"Alice"}'),
  parseJSON<User>('{"name":"Bob"}'),
  parseJSON<User>('invalid'),
];

const combined = combineResults(results);
// Will be Err because third parse failed
```

### Sequential Operations

```typescript
import { Ok, Err, type Result } from '@servicejs/result';

async function createUser(data: UserData): Promise<Result<User, Error>> {
  // Validate
  const validationResult = validateUser(data);
  if (!isOk(validationResult)) {
    return validationResult;
  }

  // Check duplicate
  const duplicateResult = await checkDuplicate(data.email);
  if (!isOk(duplicateResult)) {
    return duplicateResult;
  }

  // Insert
  const insertResult = await insertUser(validationResult.value);
  if (!isOk(insertResult)) {
    return insertResult;
  }

  return Ok(insertResult.value);
}

// Or using andThen:
async function createUser(data: UserData): Promise<Result<User, Error>> {
  return validateUser(data)
    .andThen((valid) => checkDuplicate(valid.email))
    .andThen((user) => insertUser(user));
}
```

### Error Recovery

```typescript
import { Ok, Err, isOk, type Result } from '@servicejs/result';

function fetchWithFallback(url: string): Result<Data, Error> {
  const result = fetchPrimary(url);

  if (isOk(result)) {
    return result;
  }

  console.warn('Primary fetch failed, trying fallback');
  return fetchSecondary(url);
}
```

---

## Conclusion

Migrating to ServiceJS type utilities provides:

- ✅ **Explicit error handling** - Errors in type signatures
- ✅ **Type safety** - Full inference and checking
- ✅ **Composability** - Functional combinators
- ✅ **Consistency** - Uniform API across codebase
- ✅ **Reliability** - No forgotten error cases

Start with new code, migrate critical paths, and gradually modernize your entire codebase for better reliability and maintainability.

---

## Resources

- [Result Package Documentation](../packages/result/README.md)
- [Option Package Documentation](../packages/option/README.md)
- [Either Package Documentation](../packages/either/README.md)
- [ServiceJS Core Concepts](./CORE_CONCEPTS.md)
