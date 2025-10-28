# @servicejs/adapter-bun-sqlite

Real SQLite database adapter for ServiceJS using `bun:sqlite`.

## Overview

This adapter provides a production-ready SQLite database implementation using Bun's native SQLite driver. It's optimized for maximum performance and leverages Bun's fast native bindings.

## Features

- **Native Bun Performance**: Uses `bun:sqlite` for optimal speed
- **Transaction Support**: Full ACID transaction support with begin/commit/rollback
- **Parameterized Queries**: Safe SQL execution with prepared statements
- **Full Lifecycle Management**: Standard init → start → stop → destroy flow
- **Health Monitoring**: Built-in health checks with test queries
- **Type Safety**: Fully typed with TypeScript

## Installation

```bash
bun add @servicejs/adapter-sqlite
```

## Usage

### Basic Database Operations

```typescript
import { createSqliteAdapter } from '@servicejs/adapter-sqlite';

const db = createSqliteAdapter();

await db.init({ filename: ':memory:' }); // Or './mydb.sqlite'
await db.start();

// Create table
await db.query({
  text: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)',
});

// Insert data
await db.query({
  text: 'INSERT INTO users (name, email) VALUES (?, ?)',
  params: ['Alice', 'alice@example.com'],
});

// Query data
const result = await db.query<{ id: number; name: string; email: string }>({
  text: 'SELECT * FROM users',
});

if (result.isOk()) {
  console.log('Users:', result.value.rows);
}

// Clean up
await db.stop();
await db.destroy();
```

### Using Transactions

```typescript
import { createSqliteAdapter } from '@servicejs/adapter-sqlite';
import { ok, err } from '@servicejs/result';

const db = createSqliteAdapter();
await db.init({ filename: './mydb.sqlite' });
await db.start();

// Automatic transaction management
const result = await db.transaction(async (tx) => {
  // Insert user
  const userResult = await tx.query({
    text: 'INSERT INTO users (name, email) VALUES (?, ?) RETURNING id',
    params: ['Bob', 'bob@example.com'],
  });

  if (userResult.isErr()) {
    return userResult; // Automatically rolls back
  }

  const userId = userResult.value.rows[0].id;

  // Insert profile
  const profileResult = await tx.query({
    text: 'INSERT INTO profiles (user_id, bio) VALUES (?, ?)',
    params: [userId, 'Software engineer'],
  });

  if (profileResult.isErr()) {
    return profileResult; // Automatically rolls back
  }

  return ok({ userId }); // Automatically commits
});

if (result.isOk()) {
  console.log('Created user:', result.value.userId);
}
```

### Manual Transaction Control

```typescript
const txResult = await db.begin();
if (txResult.isErr()) {
  console.error('Failed to begin transaction');
  return;
}

const tx = txResult.value;

try {
  await tx.query({
    text: 'INSERT INTO users (name, email) VALUES (?, ?)',
    params: ['Charlie', 'charlie@example.com'],
  });

  await tx.query({
    text: 'UPDATE stats SET user_count = user_count + 1',
  });

  await tx.commit();
} catch (error) {
  await tx.rollback();
  console.error('Transaction failed:', error);
}
```

## API

### createSqliteAdapter()

Creates a new SQLite database adapter.

Returns: `DatabaseAdapter`

### Configuration

```typescript
interface SqliteConfig {
  filename: string;      // Database file path (use ':memory:' for in-memory)
  readonly?: boolean;    // Open database in readonly mode
  create?: boolean;      // Create database if it doesn't exist
  readwrite?: boolean;   // Open in read-write mode
}
```

### Lifecycle Methods

```typescript
await db.init(config);     // Initialize database connection
await db.start();          // Start accepting queries
await db.stop();           // Stop accepting queries
await db.destroy();        // Close connection and cleanup
const health = await db.health(); // Check database health
```

### Query Execution

```typescript
const result = await db.query<RowType>({
  text: string;            // SQL query text
  params?: unknown[];      // Query parameters (for prepared statements)
  options?: {
    timeout?: number;      // Query timeout in milliseconds
  };
});
```

**Result:**

```typescript
interface DatabaseResult<TRow> {
  rows: TRow[];           // Query results
  rowCount?: number;      // Number of rows returned
}
```

### Transactions

**Automatic (Recommended):**

```typescript
const result = await db.transaction(async (tx) => {
  // Perform operations...
  // Returns ok() to commit or err() to rollback
  return ok(value);
});
```

**Manual:**

```typescript
const txResult = await db.begin();
const tx = txResult.value;

await tx.query({ text: '...', params: [...] });
await tx.commit();   // or await tx.rollback();
```

## Examples

### Building a User Service

```typescript
import { createSqliteAdapter } from '@servicejs/adapter-sqlite';
import { ok, err } from '@servicejs/result';

const db = createSqliteAdapter();
await db.init({ filename: './users.db', create: true });
await db.start();

// Initialize schema
await db.query({
  text: `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `,
});

// Create user
async function createUser(email: string, name: string) {
  return db.transaction(async (tx) => {
    const result = await tx.query({
      text: 'INSERT INTO users (email, name, created_at) VALUES (?, ?, ?) RETURNING *',
      params: [email, name, Date.now()],
    });

    if (result.isErr()) {
      return result;
    }

    return ok(result.value.rows[0]);
  });
}

// Find user by email
async function findUserByEmail(email: string) {
  const result = await db.query<{ id: number; email: string; name: string }>({
    text: 'SELECT * FROM users WHERE email = ?',
    params: [email],
  });

  if (result.isErr()) {
    return result;
  }

  if (result.value.rows.length === 0) {
    return err(new Error('User not found'));
  }

  return ok(result.value.rows[0]);
}

// Usage
const user = await createUser('alice@example.com', 'Alice');
console.log('Created user:', user);

const found = await findUserByEmail('alice@example.com');
console.log('Found user:', found);
```

## Performance

This adapter uses Bun's native SQLite driver, which is highly optimized:

- **Native C bindings** to SQLite
- **Zero-copy** data transfer where possible
- **Prepared statement caching** for repeated queries
- **Fast JSON serialization** with SIMD

## Best Practices

1. **Use Transactions**: Wrap multiple related operations in transactions for consistency
2. **Parameterized Queries**: Always use params instead of string interpolation to prevent SQL injection
3. **Connection Pooling**: Reuse the same adapter instance across your application
4. **Error Handling**: Always check Result types (isOk/isErr) before using values
5. **Graceful Shutdown**: Call stop() and destroy() when shutting down your application

## Related Packages

- **[@servicejs/integration-database](../integration-database)**: Base database adapter interfaces
- **[@servicejs/integrations](../integrations)**: Base integration framework

## License

MIT
