# @servicejs/adapter-kysely

Kysely adapter providing type-safe SQL query building with compile-time type checking and excellent TypeScript inference.

## Status

✅ **Implemented** - Production ready

## Features

- **Type-Safe Query Builder**: Full TypeScript inference for queries
- **Compile-Time Safety**: Catch SQL errors during development
- **Lifecycle Management**: Standard init/start/stop/destroy pattern
- **Transaction Support**: ACID transactions with automatic rollback
- **Multiple Databases**: PostgreSQL, MySQL, SQLite, MS SQL Server
- **Migrations**: Schema versioning and management
- **Plugins**: Extensible with custom plugins
- **Result Types**: All operations return Result<T, Error> for predictable error handling
- **No Magic**: Direct SQL with TypeScript safety

## Installation

```bash
npm install @servicejs/adapter-kysely kysely
```

You'll also need a database driver:

```bash
# PostgreSQL
npm install pg

# MySQL
npm install mysql2

# SQLite
npm install better-sqlite3

# Microsoft SQL Server
npm install tedious
```

## Quick Start

```typescript
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { createKyselyAdapter } from '@servicejs/adapter-kysely';
import { isOk } from '@servicejs/result';

// Define your database schema
interface Database {
  user: {
    id: number;
    name: string;
    email: string;
  };
}

// Create Kysely instance
const kysely = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      host: 'localhost',
      database: 'mydb',
      user: 'user',
      password: 'password',
    }),
  }),
});

// Create and initialize adapter
const adapter = createKyselyAdapter<Database>();
await adapter.init({ kysely });
await adapter.start();

// Build type-safe queries
const kyselyResult = adapter.getKysely();
if (isOk(kyselyResult)) {
  const db = kyselyResult.value;

  // Insert
  const insertQuery = db
    .insertInto('user')
    .values({ name: 'John', email: 'john@example.com' });

  await adapter.execute(insertQuery);

  // Select
  const selectQuery = db
    .selectFrom('user')
    .selectAll()
    .where('email', '=', 'john@example.com');

  const result = await adapter.execute(selectQuery);
  if (isOk(result)) {
    console.log(result.value);
  }
}

// Cleanup
await adapter.stop();
```

## API

### Adapter Creation

```typescript
const adapter = createKyselyAdapter<Database>();
```

### Lifecycle Methods

```typescript
// Initialize with Kysely instance
await adapter.init({ kysely, enableLogging: true });

// Start the adapter
await adapter.start();

// Check health
const health = await adapter.health();
console.log(health.value.status); // 'healthy' | 'degraded' | 'unhealthy'

// Stop and cleanup
await adapter.stop();
await adapter.destroy();
```

### Get Kysely Instance

```typescript
const kyselyResult = adapter.getKysely();
if (isOk(kyselyResult)) {
  const db = kyselyResult.value;
  // Build queries with db
}
```

### Execute Queries

```typescript
// Using the execute helper
const query = db.selectFrom('user').selectAll();
const result = await adapter.execute(query);

// Or execute directly on the query
const result2 = await query.execute();
```

### Transactions

```typescript
const result = await adapter.transaction(async (trx) => {
  // All operations in this transaction
  await trx
    .insertInto('user')
    .values({ name: 'Alice', email: 'alice@example.com' })
    .execute();

  const user = await trx
    .selectFrom('user')
    .selectAll()
    .where('email', '=', 'alice@example.com')
    .executeTakeFirstOrThrow();

  await trx
    .insertInto('post')
    .values({ title: 'Hello', authorId: user.id })
    .execute();

  return user.id;
});

if (isOk(result)) {
  console.log('Transaction successful:', result.value);
}
```

## Query Examples

### Basic CRUD

```typescript
// Insert
await db
  .insertInto('user')
  .values({ name: 'John', email: 'john@example.com' })
  .execute();

// Select
const users = await db
  .selectFrom('user')
  .selectAll()
  .where('name', 'like', '%John%')
  .execute();

// Update
await db
  .updateTable('user')
  .set({ name: 'Jane' })
  .where('id', '=', 1)
  .execute();

// Delete
await db
  .deleteFrom('user')
  .where('id', '=', 1)
  .execute();
```

### Joins

```typescript
const result = await db
  .selectFrom('user')
  .innerJoin('post', 'post.author_id', 'user.id')
  .select([
    'user.name',
    'user.email',
    'post.title',
    'post.published',
  ])
  .where('post.published', '=', true)
  .execute();
```

### Aggregations

```typescript
const result = await db
  .selectFrom('user')
  .select((eb) => [
    'user.name',
    eb.fn.count<number>('user.id').as('count'),
    eb.fn.avg<number>('user.age').as('avg_age'),
  ])
  .groupBy('user.name')
  .having((eb) => eb.fn.count('user.id'), '>', 5)
  .execute();
```

### Subqueries

```typescript
const result = await db
  .selectFrom('user')
  .selectAll()
  .where('id', 'in', (qb) =>
    qb
      .selectFrom('post')
      .select('author_id')
      .where('published', '=', true)
      .distinct()
  )
  .execute();
```

### CTEs (Common Table Expressions)

```typescript
const result = await db
  .with('published_authors', (qb) =>
    qb
      .selectFrom('post')
      .select('author_id')
      .where('published', '=', true)
      .distinct()
  )
  .selectFrom('user')
  .innerJoin('published_authors', 'published_authors.author_id', 'user.id')
  .selectAll()
  .execute();
```

### Raw SQL

```typescript
import { sql } from 'kysely';

const result = await db
  .selectFrom('user')
  .select([
    'name',
    sql<number>`LENGTH(email)`.as('email_length'),
  ])
  .execute();
```

## Type Safety

Kysely provides excellent TypeScript inference:

```typescript
interface Database {
  user: {
    id: number;
    name: string;
    email: string;
    age: number | null;
  };
  post: {
    id: number;
    title: string;
    author_id: number;
    published: boolean;
  };
}

const db = kysely as Kysely<Database>;

// TypeScript knows the return type
const users: Array<{ name: string; email: string }> = await db
  .selectFrom('user')
  .select(['name', 'email']) // ← Autocomplete works here!
  .execute();

// Compile-time error if column doesn't exist
const bad = await db
  .selectFrom('user')
  .select('nonexistent') // ← TypeScript error!
  .execute();
```

## Migrations

```typescript
import { Migrator, FileMigrationProvider } from 'kysely';
import { promises as fs } from 'fs';
import path from 'path';

const migrator = new Migrator({
  db: kysely,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder: path.join(__dirname, 'migrations'),
  }),
});

// Run all pending migrations
const { error, results } = await migrator.migrateToLatest();

if (error) {
  console.error('Migration failed:', error);
} else {
  console.log('Migrations completed:', results);
}
```

## Best Practices

1. **Define your schema types accurately**: TypeScript types should match your database schema
2. **Use transactions for multi-step operations**: Ensures data consistency
3. **Handle Result types**: Always check `isOk()` before accessing values
4. **Use query builders, not raw SQL**: Maintain type safety
5. **Enable strict mode in TypeScript**: Catch more errors at compile time
6. **Use migrations for schema changes**: Version your database schema
7. **Connection pooling**: Configure pool size appropriately

## Database-Specific Configuration

### PostgreSQL

```typescript
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

const kysely = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      host: 'localhost',
      port: 5432,
      database: 'mydb',
      user: 'user',
      password: 'password',
      max: 10, // connection pool size
    }),
  }),
});
```

### MySQL

```typescript
import { Kysely, MysqlDialect } from 'kysely';
import { createPool } from 'mysql2';

const kysely = new Kysely<Database>({
  dialect: new MysqlDialect({
    pool: createPool({
      host: 'localhost',
      port: 3306,
      database: 'mydb',
      user: 'user',
      password: 'password',
    }),
  }),
});
```

### SQLite

```typescript
import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';

const kysely = new Kysely<Database>({
  dialect: new SqliteDialect({
    database: new Database('mydb.db'),
  }),
});
```

## Examples

See the [examples](./examples) directory for:
- Basic CRUD operations
- Transaction handling
- Complex queries with joins
- Aggregations and subqueries
- CTE usage

## Error Handling

All operations return `Result<T, Error>`:

```typescript
import { isOk, isErr, unwrap } from '@servicejs/result';

const result = await adapter.execute(query);

if (isOk(result)) {
  const data = result.value;
  // Use data
} else {
  console.error('Query failed:', result.error.message);
}

// Or use unwrap (throws if error)
const data = unwrap(result);
```

## TypeScript

Full TypeScript support with generic database schema:

```typescript
import { KyselyAdapter } from '@servicejs/adapter-kysely';

const adapter: KyselyAdapter<Database> = createKyselyAdapter<Database>();
```

## License

MIT
