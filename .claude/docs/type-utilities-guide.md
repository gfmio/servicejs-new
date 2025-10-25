# Type Utilities Decision Guide

**Last Updated:** 2025-10-25

---

## Quick Decision Tree

```
┌─────────────────────────────────────────────────────────┐
│ Is the value potentially absent (null/undefined)?        │
│ ├─ Yes → Use Option<T>                                  │
│ └─ No → Continue                                         │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Can the operation fail?                                  │
│ ├─ Yes → Continue                                        │
│ └─ No → Use plain T                                      │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Do you need detailed error information?                  │
│ ├─ Yes → Use Result<T, E>                               │
│ └─ No → Use Option<T>                                    │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Do you have two distinct value types?                    │
│ ├─ Yes → Use Either<L, R>                               │
│ └─ No → Use Result<T, E>                                 │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Need to accumulate multiple errors?                      │
│ ├─ Yes → Use Validation<E[], T>                         │
│ └─ No → Use Result<T, E>                                 │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Need both success and warning/info?                      │
│ ├─ Yes → Use These<L, R>                                │
│ └─ No → Use Result<T, E>                                 │
└─────────────────────────────────────────────────────────┘
```

---

## Type Comparison Table

| Type | Use When | Returns | Example |
|------|----------|---------|---------|
| **Option<T>** | Value may be absent | Some(T) or None | `getUserById(id)` |
| **Result<T, E>** | Operation may fail | Ok(T) or Err(E) | `readFile(path)` |
| **Either<L, R>** | Two distinct value types | Left(L) or Right(R) | `parseJSON(str)` |
| **Validation<E[], T>** | Multiple errors to collect | Success(T) or Failure(E[]) | `validateForm(data)` |
| **These<L, R>** | Success with warnings | This(L), That(R), or Both(L,R) | `compile(code)` |
| **NonEmptyArray<T>** | Array guaranteed non-empty | [T, ...T[]] | `getActiveUsers()` |

---

## Option<T>

### When to Use

- Value may not exist (database lookup, map.get, array.find)
- Replacing `T | null | undefined`
- No error information needed

### Example

```typescript
function findUser(id: number): Option<User> {
  const user = users.find(u => u.id === id);
  return user ? Some(user) : None();
}

// Usage
const userOpt = findUser(123);
if (userOpt.ok) {
  console.log(userOpt.value.name);
} else {
  console.log('User not found');
}

// Or with getOrElse
const user = findUser(123).unwrapOr(defaultUser);
```

---

## Result<T, E>

### When to Use

- Operation may fail with detailed error
- I/O operations (file, network)
- Replacing `try/catch`
- Need to propagate errors

### Example

```typescript
function readConfig(path: string): Result<Config, FileError> {
  const result = fs.readFile(path);
  if (!result.ok) return result;

  const parseResult = JSON.parse(result.value);
  if (!parseResult.ok) return Err({ type: 'PARSE_ERROR' });

  return Ok(parseResult.value);
}

// Usage
const configResult = readConfig('./config.json');
if (configResult.ok) {
  startServer(configResult.value);
} else {
  console.error('Failed to load config:', configResult.error);
}
```

---

## Either<L, R>

### When to Use

- Two distinct, equally valid value types
- Success/failure but both carry data
- Parsing with different outputs

### Example

```typescript
function parseJSON(str: string): Either<ParseError, JSONValue> {
  try {
    const value = JSON.parse(str);
    return Right(value);
  } catch (error) {
    return Left({ message: error.message, position: 0 });
  }
}

// Usage
const result = parseJSON(input);
if (result.type === 'Right') {
  processJSON(result.value);
} else {
  showError(result.value.message);
}
```

---

## Validation<E[], T>

### When to Use

- Form validation (collect all errors)
- Schema validation
- Multiple independent checks
- Need to show all errors at once

### Example

```typescript
function validateUser(data: unknown): Validation<string[], User> {
  const nameVal = validateName(data.name);
  const emailVal = validateEmail(data.email);
  const ageVal = validateAge(data.age);

  // Combines all validations - accumulates errors
  return liftA3(createUser, nameVal, emailVal, ageVal);
}

// Returns Success(user) if all valid
// Returns Failure([...all errors]) if any invalid
const result = validateUser(formData);
if (result.ok) {
  saveUser(result.value);
} else {
  showErrors(result.error); // All errors at once
}
```

---

## These<L, R>

### When to Use

- Success with warnings
- Partial failures
- Compilation with warnings
- Need both error and success information

### Example

```typescript
function compile(code: string): These<Warning[], CompiledCode> {
  const warnings: Warning[] = [];
  const result = performCompilation(code, warnings);

  if (!result) {
    return This(warnings); // Only warnings, no output
  }

  if (warnings.length > 0) {
    return Both(warnings, result); // Output with warnings
  }

  return That(result); // Clean output, no warnings
}

// Usage
const result = compile(sourceCode);
switch (result._tag) {
  case 'This':
    console.error('Compilation failed:', result.left);
    break;
  case 'That':
    console.log('Clean compilation');
    execute(result.right);
    break;
  case 'Both':
    console.warn('Warnings:', result.left);
    execute(result.right);
    break;
}
```

---

## NonEmptyArray<T>

### When to Use

- Array guaranteed to have at least one element
- Operations that require non-empty arrays (head, max, min)
- Type-safe access to first element

### Example

```typescript
function getActiveUsers(): NonEmptyArray<User> {
  const users = fetchUsers().filter(u => u.active);
  if (users.length === 0) {
    throw new Error('Must have at least one active user');
  }
  return users as NonEmptyArray<User>;
}

// Usage - head is type-safe
const users = getActiveUsers();
const firstUser = users[0]; // Type: User (not User | undefined)
```

---

## Combining Types

### Result<Option<T>, E>

When operation may fail OR value may be absent:

```typescript
function lookupConfig(key: string): Result<Option<string>, DBError> {
  const dbResult = db.query(key);
  if (!dbResult.ok) return dbResult;

  const value = dbResult.value.rows[0]?.value;
  return Ok(value ? Some(value) : None());
}

// Usage
const result = lookupConfig('PORT');
if (result.ok) {
  const port = result.value.unwrapOr('3000');
} else {
  handleDBError(result.error);
}
```

### Option<Result<T, E>>

When value may be absent, but if present, operation may fail:

```typescript
function processOptionalFile(path: Option<string>): Option<Result<Data, Error>> {
  return path.map(p => readAndProcess(p));
}
```

---

## Migration Guide

### From null/undefined to Option

```typescript
// Before
function findUser(id: number): User | null {
  return users.find(u => u.id === id) ?? null;
}

const user = findUser(123);
if (user !== null) {
  console.log(user.name);
}

// After
function findUser(id: number): Option<User> {
  const user = users.find(u => u.id === id);
  return user ? Some(user) : None();
}

const userOpt = findUser(123);
if (userOpt.ok) {
  console.log(userOpt.value.name);
}
```

### From try/catch to Result

```typescript
// Before
function readFile(path: string): string {
  try {
    return fs.readFileSync(path, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
}

try {
  const content = readFile('./config.json');
  processContent(content);
} catch (error) {
  console.error(error);
}

// After
function readFile(path: string): Result<string, FileError> {
  try {
    const content = fs.readFileSync(path, 'utf-8');
    return Ok(content);
  } catch (error) {
    return Err({ type: 'READ_ERROR', path, message: error.message });
  }
}

const result = readFile('./config.json');
if (result.ok) {
  processContent(result.value);
} else {
  console.error('File error:', result.error);
}
```

### From Validation to Validation<E[], T>

```typescript
// Before: Stop at first error
function validateUser(data: any): Result<User, string> {
  if (!data.name) return Err('Name required');
  if (!data.email) return Err('Email required');
  if (!data.age || data.age < 0) return Err('Invalid age');
  return Ok({ name: data.name, email: data.email, age: data.age });
}

// After: Collect all errors
function validateUser(data: any): Validation<string[], User> {
  const errors: string[] = [];

  if (!data.name) errors.push('Name required');
  if (!data.email) errors.push('Email required');
  if (!data.age || data.age < 0) errors.push('Invalid age');

  if (errors.length > 0) {
    return Failure(errors);
  }

  return Success({ name: data.name, email: data.email, age: data.age });
}
```

---

## Performance Considerations

All type utilities are **zero-cost abstractions** at runtime:

- **No boxing**: Values are not wrapped in objects
- **No overhead**: Discriminated unions compile to simple checks
- **Tree-shakeable**: Unused utilities are removed by bundler
- **Type-erased**: TypeScript types have zero runtime cost

```typescript
// TypeScript (development)
const result: Result<number, string> = Ok(42);
if (result.ok) {
  console.log(result.value);
}

// Compiled JavaScript (production)
const result = { ok: true, value: 42 };
if (result.ok) {
  console.log(result.value);
}
```

---

## Summary

**Choose:**

| Scenario | Type |
|----------|------|
| Value may be absent | `Option<T>` |
| Operation may fail | `Result<T, E>` |
| Two value types | `Either<L, R>` |
| Collect all errors | `Validation<E[], T>` |
| Success with warnings | `These<L, R>` |
| Non-empty array | `NonEmptyArray<T>` |

**Don't Use:**

- ❌ `null` or `undefined` → Use `Option<T>`
- ❌ `throw` for control flow → Use `Result<T, E>`
- ❌ `T | Error` → Use `Result<T, Error>`
- ❌ Stop at first error → Use `Validation<E[], T>` for forms

For detailed API documentation, see individual package READMEs:
- `packages/option/README.md`
- `packages/result/README.md`
- `packages/either/README.md`
- `packages/validation/README.md`
- `packages/these/README.md`
- `packages/nonempty-array/README.md`
