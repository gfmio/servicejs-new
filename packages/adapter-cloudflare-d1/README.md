# @servicejs/adapter-cloudflare-d1

Cloudflare D1 database adapter for ServiceJS. Provides SQLite database functionality in Cloudflare Workers using D1.

## Features

- ✅ **Serverless**: Built for Cloudflare Workers
- ✅ **Distributed SQLite**: Automatic replication and global distribution
- ✅ **Transactions**: Batch API for atomic operations
- ✅ **Type Safe**: Full TypeScript support with strict types
- ✅ **Result-Based**: Never throws, returns `Result<T, E>` types
- ✅ **Zero Config**: Works with your D1 binding

## Installation

```bash
bun add @servicejs/adapter-cloudflare-d1
```

## Setup

### 1. Create D1 Database

```bash
wrangler d1 create my-database
```

### 2. Add to wrangler.toml

```toml
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "<your-database-id>"
```

## Usage

### Basic Usage

```typescript
import { createD1Adapter } from '@servicejs/adapter-cloudflare-d1';
import { isOk } from '@servicejs/result';

interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const db = createD1Adapter();

    // Initialize with D1 binding
    await db.init({ database: env.DB });
    await db.start();

    // Create table
    await db.query({
      text: 'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)',
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

    await db.stop();
    await db.destroy();

    if (isOk(result)) {
      return new Response(JSON.stringify(result.value.rows));
    }

    return new Response('Error', { status: 500 });
  },
};
```

### Transactions (Batch Operations)

```typescript
import { ok, err } from '@servicejs/result';

const result = await db.transaction(async (tx) => {
  // All operations execute atomically in a batch
  await tx.query({
    text: 'INSERT INTO users (name, email) VALUES (?, ?)',
    params: ['Bob', 'bob@example.com'],
  });

  await tx.query({
    text: 'INSERT INTO posts (user_id, title) VALUES (?, ?)',
    params: [1, 'First Post'],
  });

  // Return ok to commit, err to rollback
  return ok(undefined);
});
```

### REST API Example

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const db = createD1Adapter();
    await db.init({ database: env.DB });
    await db.start();

    const url = new URL(request.url);

    try {
      // GET /users - List users
      if (url.pathname === '/users' && request.method === 'GET') {
        const result = await db.query<{ id: number; name: string; email: string }>({
          text: 'SELECT * FROM users ORDER BY id',
        });

        if (isOk(result)) {
          return new Response(JSON.stringify(result.value.rows), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // POST /users - Create user
      if (url.pathname === '/users' && request.method === 'POST') {
        const body = await request.json();

        const result = await db.query({
          text: 'INSERT INTO users (name, email) VALUES (?, ?)',
          params: [body.name, body.email],
        });

        if (isOk(result)) {
          return new Response(JSON.stringify({ success: true }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response('Not Found', { status: 404 });
    } finally {
      await db.stop();
      await db.destroy();
    }
  },
};
```

## API

### `createD1Adapter()`

Creates a new D1 adapter instance.

### Configuration

```typescript
interface D1Config {
  // D1 Database binding from Cloudflare Workers environment
  database: D1Database;
}
```

### Lifecycle Methods

#### `init(config: D1Config): Promise<Result<void, Error>>`

Initialize the adapter with D1 database binding.

#### `start(): Promise<Result<void, Error>>`

Start the database (no-op for D1).

#### `stop(): Promise<Result<void, Error>>`

Stop the database (no-op for D1).

#### `destroy(): Promise<Result<void, Error>>`

Release resources.

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

Begin a new transaction (uses D1 batch API).

#### `transaction<T>(fn): Promise<Result<T, Error>>`

Execute a function within a transaction. All queries are batched and executed atomically.

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
// ✅ Good - atomic batch operation
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
  return new Response('Database Error', { status: 500 });
}

// Use result.value.rows
```

### 4. Clean Up Resources

```typescript
try {
  await db.init({ database: env.DB });
  await db.start();

  // Use database...
} finally {
  await db.stop();
  await db.destroy();
}
```

### 5. Use CREATE TABLE IF NOT EXISTS

```typescript
// ✅ Good - idempotent
await db.query({
  text: 'CREATE TABLE IF NOT EXISTS users (...)',
});

// ❌ Bad - will error if table exists
await db.query({
  text: 'CREATE TABLE users (...)',
});
```

## D1 Specifics

### Transaction Behavior

D1 transactions use the batch API, which means:
- All queries in a transaction are collected and executed together
- Queries don't return data until commit
- If any query fails, all are rolled back
- Maximum 100 statements per batch

### Query Limits

- Maximum 1000 rows returned per query
- Use LIMIT and OFFSET for pagination
- Time-based read consistency (not real-time)

### Local Development

Use wrangler to test locally:

```bash
wrangler dev
```

Or use D1 migrations:

```bash
wrangler d1 execute my-database --file=./schema.sql
```

## Platform Support

- ✅ Cloudflare Workers
- ❌ Node.js (use @servicejs/adapter-node-sqlite)
- ❌ Bun (use @servicejs/adapter-bun-sqlite)
- ❌ Deno

## Examples

See the `examples/` directory:

- `worker-example.ts` - Complete REST API example

## Testing

Tests use a mock D1 database:

```bash
bun test
```

For real D1 testing, deploy to Cloudflare Workers.

## License

MIT
