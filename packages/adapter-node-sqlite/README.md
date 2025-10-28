# @servicejs/adapter-node-sqlite

SQLite database adapter for ServiceJS using better-sqlite3. Provides a fast, synchronous SQLite interface for Node.js applications.

## Features

- ✅ **Fast**: Uses better-sqlite3 for optimal performance
- ✅ **Synchronous API**: Wrapped in async for consistency
- ✅ **Transactions**: Full ACID transaction support
- ✅ **Type Safe**: Full TypeScript support with strict types
- ✅ **Result-Based**: Never throws, returns `Result<T, E>` types
- ✅ **Zero Config**: Works out of the box with in-memory or file databases

## Installation

```bash
bun add @servicejs/adapter-node-sqlite better-sqlite3
```

## Usage

### Basic Usage

```typescript
import { createSqliteAdapter } from '@servicejs/adapter-node-sqlite';
import { isOk } from '@servicejs/result';

const db = createSqliteAdapter();

// In-memory database
await db.init({ filename: ':memory:' });
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

if (isOk(result)) {
  console.log(result.value.rows);
}

await db.stop();
await db.destroy();
```

### File-Based Database

```typescript
await db.init({
  filename: './data/app.db',
});
await db.start();
```

### Transactions

```typescript
import { ok, err } from '@servicejs/result';

const result = await db.transaction(async (tx) => {
  // Insert multiple records
  await tx.query({
    text: 'INSERT INTO users (name, email) VALUES (?, ?)',
    params: ['Bob', 'bob@example.com'],
  });

  await tx.query({
    text: 'INSERT INTO users (name, email) VALUES (?, ?)',
    params: ['Charlie', 'charlie@example.com'],
  });

  // Return ok to commit, err to rollback
  return ok(undefined);
});
```

### Manual Transactions

```typescript
const txResult = await db.begin();

if (isOk(txResult)) {
  const tx = txResult.value;

  await tx.query({
    text: 'INSERT INTO users (name, email) VALUES (?, ?)',
    params: ['Dave', 'dave@example.com'],
  });

  // Commit or rollback
  await tx.commit();
  // or
  // await tx.rollback();
}
```

## API

### `createSqliteAdapter()`

Creates a new SQLite adapter instance.

### Configuration

```typescript
interface SqliteConfig {
  // Database filename (':memory:' for in-memory)
  filename: string;

  // Open database in read-only mode
  readonly?: boolean;

  // Require database file to exist
  fileMustExist?: boolean;

  // Connection timeout in milliseconds
  timeout?: number;

  // Verbose logging function
  verbose?: (message?: unknown, ...additionalArgs: unknown[]) => void;
}
```

### Lifecycle Methods

#### `init(config: SqliteConfig): Promise<Result<void, Error>>`

Initialize the adapter with configuration.

#### `start(): Promise<Result<void, Error>>`

Start the database (no-op for SQLite).

#### `stop(): Promise<Result<void, Error>>`

Stop the database (no-op for SQLite).

#### `destroy(): Promise<Result<void, Error>>`

Close the database and release resources.

### Query Methods

#### `query<TRow>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>>`

Execute a SQL query.

```typescript
interface DatabaseQuery {
  text: string;
  params?: unknown[];
}

interface DatabaseResult<TRow> {
  rows: TRow[];
  rowCount: number;
}
```

#### `begin(): Promise<Result<DatabaseTransaction, Error>>`

Begin a new transaction.

#### `transaction<T>(fn): Promise<Result<T, Error>>`

Execute a function within a transaction. Automatically commits on success, rolls back on error.

### Health Check

#### `health(): Promise<Result<HealthStatus, Error>>`

Check database health.

```typescript
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  error?: Error;
}
```

## Best Practices

### 1. Always Use Parameterized Queries

```typescript
// ✅ Good - prevents SQL injection
await db.query({
  text: 'SELECT * FROM users WHERE email = ?',
  params: [userEmail],
});

// ❌ Bad - vulnerable to SQL injection
await db.query({
  text: `SELECT * FROM users WHERE email = '${userEmail}'`,
});
```

### 2. Use Transactions for Multiple Operations

```typescript
// ✅ Good - atomic operations
await db.transaction(async (tx) => {
  await tx.query({ text: 'INSERT INTO orders ...' });
  await tx.query({ text: 'UPDATE inventory ...' });
  return ok(undefined);
});

// ❌ Bad - operations can fail independently
await db.query({ text: 'INSERT INTO orders ...' });
await db.query({ text: 'UPDATE inventory ...' });
```

### 3. Handle Errors Gracefully

```typescript
const result = await db.query({ text: 'SELECT * FROM users' });

if (!isOk(result)) {
  console.error('Query failed:', result.error);
  return;
}

// Use result.value.rows
```

### 4. Close Connections Properly

```typescript
try {
  await db.init({ filename: './app.db' });
  await db.start();

  // Use database...
} finally {
  await db.stop();
  await db.destroy();
}
```

## SQLite vs Other Databases

**SQLite** (this adapter):
- ✅ Embedded database (no server needed)
- ✅ Zero configuration
- ✅ Perfect for development and small apps
- ✅ Fast for read-heavy workloads
- ⚠️  Limited concurrent write support

**PostgreSQL** (@servicejs/adapter-postgres):
- ✅ Full-featured RDBMS
- ✅ Excellent concurrent write support
- ✅ Advanced features (JSON, full-text search, etc.)
- ⚠️  Requires server setup

## Examples

See the `examples/` directory:

- `basic-usage.ts` - CRUD operations
- `transactions.ts` - Transaction handling

Run examples:

```bash
cd packages/adapter-node-sqlite
bun examples/basic-usage.ts
bun examples/transactions.ts
```

## Testing

Tests are included but require Node.js due to better-sqlite3 being a native module:

```bash
# Note: Bun has compatibility issues with better-sqlite3
# Tests should be run with Node.js
npm test
```

## Platform Support

- ✅ Node.js
- ❌ Bun (use @servicejs/adapter-bun-sqlite)
- ❌ Deno (use appropriate Deno SQLite adapter)
- ❌ Browser (use @servicejs/adapter-cloudflare-d1 for Cloudflare Workers)

## License

MIT
