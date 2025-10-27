# @servicejs/validation

Runtime validation and schema validation for ServiceJS with error accumulation.

## Features

### Validation Type
- **Error Accumulation**: Collect all validation errors, not just the first
- **Applicative Functor**: Combine multiple validations
- **Type-Safe**: Full TypeScript support
- **Functional API**: map, andThen, orElse, fold, and more

### Schema Validation
- **MessageSchema Interface**: Generic schema interface for runtime validation
- **Zod Integration**: First-class support for Zod schemas
- **Validated Capabilities**: Wrap capabilities with runtime validation
- **Result-Based API**: Safe validation with Result<T, E> return types

## Installation

```bash
bun add @servicejs/validation
```

For Zod integration:
```bash
bun add @servicejs/validation zod
```

---

## Validation Type

The Validation type is similar to Either/Result but accumulates ALL errors instead of short-circuiting on the first error. Perfect for form validation and other scenarios where you want to collect all failures.

### Basic Usage

```typescript
import {
  success,
  failure,
  fromPredicate,
  fromPredicates,
  all,
} from '@servicejs/validation';

// Create validations
const valid = success(42);
const invalid = failure('Error 1', 'Error 2');

// Single predicate
const age = fromPredicate(
  25,
  x => x >= 18,
  'Must be 18 or older'
);

// Multiple predicates (accumulates errors)
const username = fromPredicates('ab', [
  [s => s.length >= 3, 'Must be at least 3 characters'],
  [s => s.length <= 20, 'Must be at most 20 characters'],
  [s => /^[a-z0-9_]+$/.test(s), 'Only letters, numbers, and underscores'],
]);
// Failure(['Must be at least 3 characters'])
```

### Transformations

```typescript
import { map, mapError, andThen, orElse } from '@servicejs/validation';

// Transform success value
const doubled = map(success(21), x => x * 2);
// Success(42)

// Transform error messages
const capitalized = mapError(
  failure('error'),
  e => e.toUpperCase()
);
// Failure(['ERROR'])

// Chain operations
const result = andThen(success(5), x =>
  x > 0 ? success(x) : failure('Must be positive')
);
// Success(5)

// Recover from failures
const recovered = orElse(
  failure('error'),
  () => success(42)
);
// Success(42)
```

### Combining Validations

```typescript
import { all, traverse } from '@servicejs/validation';

// Combine multiple validations
const validateUser = (data: UserData) => {
  return all([
    validateName(data.name),
    validateEmail(data.email),
    validateAge(data.age),
  ]);
};

// Success([name, email, age]) if all valid
// Failure([...all errors]) if any invalid

// Traverse an array with validation
const validateUsers = (users: UserData[]) =>
  traverse(users, validateUser);
```

### Extracting Values

```typescript
import { fold, getOrElse, getOrElseWith } from '@servicejs/validation';

// Pattern match
const message = fold(
  validation,
  errors => `Errors: ${errors.join(', ')}`,
  value => `Value: ${value}`
);

// Get value or default
const value = getOrElse(validation, 0);

// Get value or compute default
const value = getOrElseWith(validation, errors =>
  errors.length // Return error count as fallback
);
```

---

## Schema Validation

The `MessageSchema` interface provides a unified way to validate messages at runtime with any validation library.

### MessageSchema Interface

```typescript
interface MessageSchema<T> {
  /**
   * Validate a value and return Result
   */
  validate(value: unknown): Result<T, readonly SchemaError[]>;

  /**
   * Parse a value or throw SchemaValidationError
   */
  parse(value: unknown): T;

  /**
   * Optional type name for debugging
   */
  readonly typeName?: string;
}
```

### Creating Custom Schemas

```typescript
import { createSchema, createPredicateSchema } from '@servicejs/validation';
import { ok, err } from '@servicejs/result';

// From a type guard predicate
const NumberSchema = createPredicateSchema(
  (value: unknown): value is number => typeof value === 'number',
  'Value must be a number'
);

// From a validation function
const PositiveNumberSchema = createSchema((value: unknown) => {
  if (typeof value !== 'number') {
    return err([{ message: 'Must be a number' }]);
  }
  if (value <= 0) {
    return err([{ message: 'Must be positive' }]);
  }
  return ok(value);
}, 'PositiveNumber');

// Use the schema
const result = PositiveNumberSchema.validate(42);
if (result.success) {
  console.log('Valid:', result.value);
} else {
  console.error('Errors:', result.error);
}
```

---

## Zod Integration

First-class integration with Zod for powerful schema validation.

### Basic Zod Schemas

```typescript
import { z } from 'zod';
import { createZodSchema } from '@servicejs/validation';

// Create a schema
const UserSchema = createZodSchema(
  z.object({
    name: z.string().min(1),
    email: z.string().email(),
    age: z.number().int().min(0).max(120),
  }),
  'User'
);

// Validate
const result = UserSchema.validate({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
});

if (result.success) {
  const user = result.value; // Fully typed!
  console.log(user);
} else {
  // result.error contains all validation errors with paths
  result.error.forEach(err => {
    console.error(`${err.path?.join('.')}: ${err.message}`);
  });
}

// Parse (throws on error)
const user = UserSchema.parse({ name: 'John', email: 'john@example.com', age: 30 });
```

### Message Type Schemas

```typescript
import { z } from 'zod';
import { createZodSchema } from '@servicejs/validation';

// Discriminated union for message types
const MessageSchema = createZodSchema(
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('increment'),
      amount: z.number().int().positive(),
    }),
    z.object({
      type: z.literal('decrement'),
      amount: z.number().int().positive(),
    }),
    z.object({
      type: z.literal('reset'),
    }),
  ]),
  'CounterMessage'
);

// Type-safe message validation
const result = MessageSchema.validate({ type: 'increment', amount: 5 });
```

### Transforms and Refinements

```typescript
import { z } from 'zod';
import { createZodSchema } from '@servicejs/validation';

// Schema with transforms
const NormalizedUserSchema = createZodSchema(
  z.object({
    username: z.string()
      .trim()
      .toLowerCase()
      .transform(s => s.replace(/[^a-z0-9_]/g, '')),
    email: z.string()
      .transform(s => s.toLowerCase().trim())
      .pipe(z.string().email()),
  })
);

// Validates AND transforms
const result = NormalizedUserSchema.validate({
  username: '  John_Doe123!@#  ',
  email: '  USER@EXAMPLE.COM  ',
});

if (result.success) {
  console.log(result.value);
  // { username: 'john_doe123', email: 'user@example.com' }
}

// Schema with refinements
const PasswordSchema = createZodSchema(
  z.string()
    .min(8)
    .refine(s => /[A-Z]/.test(s), 'Must contain uppercase')
    .refine(s => /[a-z]/.test(s), 'Must contain lowercase')
    .refine(s => /[0-9]/.test(s), 'Must contain number')
);
```

### Type Guards

```typescript
import { z } from 'zod';
import { isZodType } from '@servicejs/validation';

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
});

// Type guard
if (isZodType(UserSchema, data)) {
  // data is now typed as { name: string; age: number }
  console.log(data.name);
}
```

---

## Validated Capabilities

Wrap capabilities with runtime schema validation to ensure only valid messages are sent.

### Basic Validation

```typescript
import { z } from 'zod';
import { createCapability } from '@servicejs/core';
import { createZodSchema, withValidation } from '@servicejs/validation';

// Define schema
const CommandSchema = createZodSchema(
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('increment'), amount: z.number().positive() }),
    z.object({ type: z.literal('reset') }),
  ])
);

// Create capability
const counterCap = createCapability((msg) => {
  console.log('Received:', msg);
});

// Wrap with validation
const validated = withValidation(counterCap, CommandSchema);

// Valid message - works
validated.send({ type: 'increment', amount: 5 });
// Logs: "Received: { type: 'increment', amount: 5 }"

// Invalid message - throws SchemaValidationError
validated.send({ type: 'increment', amount: -5 });
// Throws: SchemaValidationError with details
```

### Filter Invalid Messages

Silently drop invalid messages instead of throwing:

```typescript
import { withValidationFilter } from '@servicejs/validation';

const filtered = withValidationFilter(
  counterCap,
  CommandSchema,
  (errors) => {
    // Optional: log validation errors
    console.error('Invalid message:', errors);
  }
);

// Valid message - forwarded
filtered.send({ type: 'reset' });

// Invalid message - dropped silently (error logged)
filtered.send({ type: 'invalid' });
```

### Transform Messages

Validate and transform messages before forwarding:

```typescript
import { withValidationTransform } from '@servicejs/validation';

const NormalizationSchema = createZodSchema(
  z.object({
    type: z.literal('user-register'),
    email: z.string()
      .transform(s => s.toLowerCase().trim())
      .pipe(z.string().email()),
  })
);

const normalized = withValidationTransform(
  processCap,
  NormalizationSchema
);

// Sends normalized message
normalized.send({
  type: 'user-register',
  email: '  USER@EXAMPLE.COM  ',
});
// Forwards: { type: 'user-register', email: 'user@example.com' }
```

### Real-World Example

```typescript
import { z } from 'zod';
import { createCapability } from '@servicejs/core';
import { createZodSchema, withValidation } from '@servicejs/validation';

// API request schema
const ApiRequestSchema = createZodSchema(
  z.discriminatedUnion('method', [
    z.object({
      method: z.literal('GET'),
      path: z.string(),
      headers: z.record(z.string()).optional(),
    }),
    z.object({
      method: z.literal('POST'),
      path: z.string(),
      body: z.unknown(),
      headers: z.record(z.string()).optional(),
    }),
  ])
);

// API handler
const apiCap = createCapability((req) => {
  fetch(req.path, {
    method: req.method,
    headers: req.headers,
    body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
  });
});

// Validated API capability
const validatedApi = withValidation(apiCap, ApiRequestSchema);

// Only valid, well-formed requests get through
validatedApi.send({
  method: 'POST',
  path: '/users',
  body: { name: 'John' },
});
```

---

## Error Handling

### SchemaValidationError

```typescript
import { SchemaValidationError } from '@servicejs/validation';

try {
  const value = schema.parse(invalidData);
} catch (error) {
  if (error instanceof SchemaValidationError) {
    console.error(`Validation failed with ${error.errors.length} error(s):`);
    error.errors.forEach(err => {
      const path = err.path?.join('.') || 'root';
      console.error(`  ${path}: ${err.message}`);
    });
  }
}
```

### Error Structure

```typescript
interface SchemaError {
  /** Error message */
  readonly message: string;

  /** Path to the field with error (e.g., ['user', 'email']) */
  readonly path?: readonly (string | number)[];

  /** Error code (library-specific) */
  readonly code?: string;

  /** Additional context (library-specific) */
  readonly context?: unknown;
}
```

---

## API Reference

### Validation Type

#### Constructors
- `success<T>(value: T): Validation<T, never>` - Create a successful validation
- `failure<E>(...errors: E[]): Validation<never, E>` - Create a failed validation
- `failures<E>(errors: readonly E[]): Validation<never, E>` - Create failure from array

#### Type Guards
- `isSuccess<T, E>(v: Validation<T, E>): v is Success<T>` - Check if successful
- `isFailure<T, E>(v: Validation<T, E>): v is Failure<E>` - Check if failed

#### Transformations
- `map<T, U, E>(v: Validation<T, E>, fn: (value: T) => U): Validation<U, E>`
- `mapError<T, E, F>(v: Validation<T, E>, fn: (error: E) => F): Validation<T, F>`
- `andThen<T, U, E>(v: Validation<T, E>, fn: (value: T) => Validation<U, E>): Validation<U, E>`
- `orElse<T, E, F>(v: Validation<T, E>, fn: (errors: readonly E[]) => Validation<T, F>): Validation<T, F>`

#### Extraction
- `fold<T, E, U>(v: Validation<T, E>, onFailure: (errors: readonly E[]) => U, onSuccess: (value: T) => U): U`
- `getOrElse<T, E>(v: Validation<T, E>, defaultValue: T): T`
- `getOrElseWith<T, E>(v: Validation<T, E>, fn: (errors: readonly E[]) => T): T`

#### Combinators
- `all<T, E>(validations: readonly Validation<T, E>[]): Validation<readonly T[], E>` - Combine all
- `traverse<T, U, E>(items: readonly T[], fn: (item: T) => Validation<U, E>): Validation<readonly U[], E>`
- `sequence<T, E>(validations: readonly Validation<T, E>[]): Validation<readonly T[], E>`

#### Utilities
- `fromPredicate<T, E>(value: T, predicate: (v: T) => boolean, error: E): Validation<T, E>`
- `fromPredicates<T, E>(value: T, predicates: readonly [(v: T) => boolean, E][]): Validation<T, E>`
- `tryCatch<T, E>(fn: () => T, onError: (error: unknown) => E): Validation<T, E>`
- `partition<T, E>(validations: readonly Validation<T, E>[]): [readonly E[][], readonly T[]]`

### Schema Validation

#### Schemas
- `createSchema<T>(validate: (value: unknown) => Result<T, readonly SchemaError[]>, typeName?: string): MessageSchema<T>`
- `createPredicateSchema<T>(predicate: (value: unknown) => value is T, errorMessage?: string): MessageSchema<T>`
- `createZodSchema<T extends z.ZodType>(zodSchema: T, typeName?: string): MessageSchema<z.infer<T>>`

#### Type Guards
- `isZodType<T extends z.ZodType>(schema: T, value: unknown): value is z.infer<T>`

#### Capabilities
- `withValidation<TMsg>(capability: Capability<TMsg>, schema: MessageSchema<TMsg>): Capability<TMsg>`
- `withValidationFilter<TMsg>(capability: Capability<TMsg>, schema: MessageSchema<TMsg>, onError?: (errors: readonly SchemaError[]) => void): Capability<TMsg>`
- `withValidationTransform<TMsg, UMsg>(capability: Capability<UMsg>, schema: MessageSchema<UMsg>): Capability<TMsg>`

---

## TypeScript Types

```typescript
// Validation type
type Validation<T, E> = Success<T> | Failure<E>;

interface Success<T> {
  readonly _tag: 'Success';
  readonly value: T;
}

interface Failure<E> {
  readonly _tag: 'Failure';
  readonly errors: readonly E[];
}

// Schema types
interface MessageSchema<T> {
  validate(value: unknown): Result<T, readonly SchemaError[]>;
  parse(value: unknown): T;
  readonly typeName?: string;
}

interface SchemaError {
  readonly message: string;
  readonly path?: readonly (string | number)[];
  readonly code?: string;
  readonly context?: unknown;
}
```

---

## Best Practices

### 1. Use Validation for Forms
```typescript
// Collect all field errors at once
const validateForm = (data: FormData) => all([
  validateName(data.name),
  validateEmail(data.email),
  validatePassword(data.password),
]);
```

### 2. Use Schemas for Messages
```typescript
// Validate messages at runtime
const CommandSchema = createZodSchema(/* ... */);
const validated = withValidation(cap, CommandSchema);
```

### 3. Combine Both
```typescript
// Use Validation for business logic
const businessRules = fromPredicates(user.age, [
  [age => age >= 18, 'Must be adult'],
  [age => age <= 65, 'Must be under retirement age'],
]);

// Use Schema for structure
const structureCheck = UserSchema.validate(userData);
```

### 4. Transform Data Early
```typescript
// Normalize input before validation
const NormalizedSchema = createZodSchema(
  z.object({
    email: z.string().transform(s => s.toLowerCase().trim()).pipe(z.string().email()),
  })
);
```

### 5. Handle Errors Gracefully
```typescript
// Log but don't crash
const filtered = withValidationFilter(cap, schema, (errors) => {
  logger.warn('Invalid message received', { errors });
});
```

---

## License

MIT
