# @servicejs/adapter-postgres

PostgreSQL adapter for ServiceJS integration framework. Provides production-ready PostgreSQL database connectivity using node-postgres (pg).

## Features

- ✅ **PostgreSQL Native**: Uses node-postgres (pg) for robust connectivity
- ✅ **Connection Pooling**: Built-in connection pool management
- ✅ **ACID Transactions**: Full transaction support with commit/rollback
- ✅ **Parameterized Queries**: Protection against SQL injection
- ✅ **Type Safe**: Full TypeScript support with strict types
- ✅ **Result-Based**: Never throws, returns `Result<T, E>` types
- ✅ **Health Checks**: Built-in connection health monitoring
- ✅ **Production Ready**: Suitable for real-world applications

## Installation

```bash
bun add @servicejs/adapter-postgres pg
```

## Usage

### Basic Usage

```typescript
import { createPostgresAdapter } from '@servicejs/adapter-postgres';
import { isOk } from '@servicejs/result';

const db = createPostgresAdapter();

// Initialize and connect
await db.init({
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  user: 'postgres',
  password: 'secret',
});
await db.start();

// Create table
await db.query({
  text: `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL
    )
  `,
});

// Insert data
const result = await db.query({
  text: 'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
  params: ['Alice', 'alice@example.com'],
});

if (isOk(result)) {
  console.log('User created:', result.value.rows[0]);
}

// Query data
const users = await db.query({
  text: 'SELECT * FROM users WHERE name = $1',
  params: ['Alice'],
});

if (isOk(users)) {
  console.log('Found users:', users.value.rows);
}

await db.stop();
await db.destroy();
```

### Transactions

```typescript
import { ok, err } from '@servicejs/result';

// Using transaction helper
const result = await db.transaction(async (tx) => {
  // Deduct from account A
  await tx.query({
    text: 'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
    params: [100, 1],
  });

  // Add to account B
  await tx.query({
    text: 'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
    params: [100, 2],
  });

  return ok({ transferred: 100 });
});

if (isOk(result)) {
  console.log('Transfer successful');
}
```

### Manual Transaction Control

```typescript
const txResult = await db.begin();

if (isOk(txResult)) {
  const tx = txResult.value;

  try {
    await tx.query({
      text: 'INSERT INTO users (name, email) VALUES ($1, $2)',
      params: ['Bob', 'bob@example.com'],
    });

    // Decide whether to commit or rollback
    if (someCondition) {
      await tx.commit();
    } else {
      await tx.rollback();
    }
  } catch (error) {
    await tx.rollback();
  }
}
```

### Connection String

```typescript
await db.init({
  connectionString: 'postgresql://user:password@localhost:5432/mydb',
});
```

### SSL/TLS Connection

```typescript
await db.init({
  host: 'db.example.com',
  port: 5432,
  database: 'mydb',
  user: 'postgres',
  password: 'secret',
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('ca-cert.pem').toString(),
  },
});
```

### Connection Pooling

```typescript
await db.init({
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  user: 'postgres',
  password: 'secret',
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
});
```

## API

### `createPostgresAdapter()`

Creates a new PostgreSQL adapter instance.

### Configuration

```typescript
interface PostgresConfig {
  // Connection parameters
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;

  // Or use connection string
  connectionString?: string;

  // SSL/TLS
  ssl?: boolean | {
    rejectUnauthorized?: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };

  // Connection pool
  pool?: {
    min?: number;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
  };

  // Query timeout
  statementTimeout?: number;
}
```

### Lifecycle Methods

#### `init(config: PostgresConfig): Promise<Result<void, Error>>`

Initialize the adapter with configuration.

#### `start(): Promise<Result<void, Error>>`

Connect to the database and test the connection.

#### `stop(): Promise<Result<void, Error>>`

Close all connections gracefully.

#### `destroy(): Promise<Result<void, Error>>`

Clean up resources.

### Query Methods

#### `query<TRow>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>>`

Execute a query and return results.

```typescript
const result = await db.query<{ id: number; name: string }>({
  text: 'SELECT * FROM users WHERE id = $1',
  params: [1],
});
```

#### `begin(): Promise<Result<DatabaseTransaction, Error>>`

Begin a new transaction.

#### `transaction<T>(fn: (tx: DatabaseTransaction) => Promise<Result<T, Error>>): Promise<Result<T, Error>>`

Execute a function within a transaction. Automatically commits on success or rolls back on error.

### Health Checks

#### `health(): Promise<Result<HealthStatus, Error>>`

Check database connection health.

```typescript
const health = await db.health();

if (isOk(health)) {
  console.log('Status:', health.value.status); // 'healthy' | 'degraded' | 'unhealthy'
}
```

## Best Practices

### 1. Always Use Parameterized Queries

```typescript
// ✅ Correct (safe from SQL injection)
await db.query({
  text: 'SELECT * FROM users WHERE email = $1',
  params: [userEmail],
});

// ❌ Wrong (vulnerable to SQL injection)
await db.query({
  text: `SELECT * FROM users WHERE email = '${userEmail}'`,
});
```

### 2. Handle Errors Properly

```typescript
const result = await db.query({
  text: 'SELECT * FROM users WHERE id = $1',
  params: [userId],
});

if (isErr(result)) {
  console.error('Query failed:', result.error.message);
  // Handle error appropriately
  return;
}

// Safe to use result.value here
console.log('Users:', result.value.rows);
```

### 3. Use Transactions for Related Updates

```typescript
// ✅ Correct - atomic operation
await db.transaction(async (tx) => {
  await tx.query({
    text: 'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
    params: [amount, fromAccount],
  });

  await tx.query({
    text: 'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
    params: [amount, toAccount],
  });

  return ok(undefined);
});

// ❌ Wrong - not atomic, partial updates possible
await db.query({
  text: 'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
  params: [amount, fromAccount],
});

await db.query({
  text: 'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
  params: [amount, toAccount],
});
```

### 4. Configure Connection Pools

```typescript
await db.init({
  host: 'localhost',
  database: 'myapp',
  pool: {
    min: 2,      // Minimum connections
    max: 10,     // Maximum connections
    idleTimeoutMillis: 30000,  // Close idle connections after 30s
  },
});
```

### 5. Set Statement Timeouts

```typescript
await db.init({
  host: 'localhost',
  database: 'myapp',
  statementTimeout: 5000,  // 5 second timeout for all queries
});
```

## Examples

See the `examples/` directory:

- `basic-usage.ts` - CRUD operations
- `transactions.ts` - Transaction patterns

Run examples:

```bash
cd packages/adapter-postgres
bun examples/basic-usage.ts
bun examples/transactions.ts
```

## Testing

Tests use Docker to run a PostgreSQL container automatically:

```bash
bun test
```

Docker must be installed and running.

## Performance Tips

- Use connection pooling (enabled by default)
- Create indexes on frequently queried columns
- Use prepared statements via parameterized queries
- Monitor slow queries with `pg_stat_statements`
- Use `EXPLAIN ANALYZE` to optimize queries

## License

MIT
