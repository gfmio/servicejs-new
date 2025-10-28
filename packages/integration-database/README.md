# @servicejs/integration-database

Database adapter interfaces for ServiceJS - SQL, NoSQL, and Key-Value store integrations.

## Overview

This package provides interfaces for creating database adapters in ServiceJS. It defines standard patterns for SQL databases, NoSQL databases, and key-value stores with lifecycle management, query execution, transactions, and health monitoring.

## Features

- **SQL Database Support**: Query execution with parameterized statements
- **Transaction Management**: begin, commit, rollback with error handling
- **Connection Pooling**: Efficient connection management
- **Standard Lifecycle**: init, start, stop, destroy
- **Health Monitoring**: Built-in health checks
- **Type Safety**: Fully typed with TypeScript

## Installation

```bash
bun add @servicejs/integration-database
```

## Usage

### Creating a Database Adapter

```typescript
import { createDatabaseAdapter, type DatabaseAdapter } from '@servicejs/integration-database';
import { ok, err } from '@servicejs/result';

const db = createDatabaseAdapter(
  {
    name: 'my-database',
    version: '1.0.0',
    type: 'database',
    platforms: ['node', 'bun'],
    description: 'My database adapter',
  },
  {
    onInit: async (config) => {
      // Initialize database connection
      return ok(undefined);
    },
    onStart: async () => {
      // Start accepting queries
      return ok(undefined);
    },
    onStop: async () => {
      // Stop accepting queries
      return ok(undefined);
    },
    onDestroy: async () => {
      // Close connections
      return ok(undefined);
    },
    onHealth: async () => {
      return ok({ status: 'healthy' });
    },
  }
);

// Implement query method
db.query = async (query) => {
  // Execute query...
  return ok({ rows: [], rowCount: 0 });
};

// Use the database
await db.init({ connection: 'sqlite::memory:' });
await db.start();
```

### Example SQLite Adapter

```typescript
import { createSimpleSqliteAdapter } from '@servicejs/integration-database';

const db = createSimpleSqliteAdapter();

await db.init({ connection: ':memory:' });
await db.start();

// Create table
await db.query({
  text: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)',
});

// Insert data with transaction
await db.transaction(async (tx) => {
  await tx.query({
    text: 'INSERT INTO users (name, email) VALUES (?, ?)',
    params: ['Alice', 'alice@example.com'],
  });

  await tx.query({
    text: 'INSERT INTO users (name, email) VALUES (?, ?)',
    params: ['Bob', 'bob@example.com'],
  });

  return ok(undefined);
});

// Query data
const result = await db.query<{ id: number; name: string; email: string }>({
  text: 'SELECT * FROM users',
});

if (result.isOk()) {
  console.log('Users:', result.value.rows);
}

// Later...
await db.stop();
await db.destroy();
```

## API Reference

### DatabaseQuery

```typescript
interface DatabaseQuery {
  text: string;
  params?: unknown[];
  options?: {
    timeout?: number;
    [key: string]: unknown;
  };
}
```

### DatabaseResult

```typescript
interface DatabaseResult<TRow = unknown> {
  rows: TRow[];
  rowCount?: number;
  metadata?: { [key: string]: unknown };
}
```

### DatabaseTransaction

```typescript
interface DatabaseTransaction {
  readonly id: string;
  query<TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>>;
  commit(): Promise<Result<void, Error>>;
  rollback(): Promise<Result<void, Error>>;
}
```

### DatabaseAdapter

```typescript
interface DatabaseAdapter extends Integration {
  query<TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>>;
  begin(): Promise<Result<DatabaseTransaction, Error>>;
  transaction<T>(fn: (tx: DatabaseTransaction) => Promise<Result<T, Error>>): Promise<Result<T, Error>>;
}
```

## Creating Custom Adapters

To create a custom database adapter, implement the lifecycle handlers and database-specific methods:

```typescript
import { createDatabaseAdapter } from '@servicejs/integration-database';
import { ok, err } from '@servicejs/result';
import Database from 'better-sqlite3';

export const createBetterSqliteAdapter = (): DatabaseAdapter => {
  let database: Database.Database | null = null;
  let transactionCounter = 0;

  const adapter = createDatabaseAdapter(
    {
      name: 'better-sqlite3',
      version: '1.0.0',
      type: 'database',
      platforms: ['node'],
      description: 'better-sqlite3 adapter',
    },
    {
      onInit: async (config) => {
        const filename = (config as { filename: string }).filename;
        database = new Database(filename);
        return ok(undefined);
      },

      onStart: async () => {
        if (!database) {
          return err(new Error('Database not initialized'));
        }
        return ok(undefined);
      },

      onStop: async () => {
        return ok(undefined);
      },

      onDestroy: async () => {
        if (database) {
          database.close();
          database = null;
        }
        return ok(undefined);
      },

      onHealth: async () => {
        if (!database) {
          return ok({ status: 'unhealthy', error: new Error('Database not initialized') });
        }

        try {
          database.prepare('SELECT 1').get();
          return ok({ status: 'healthy' });
        } catch (error) {
          return ok({
            status: 'unhealthy',
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      },
    }
  );

  const dbAdapter = adapter as DatabaseAdapter;

  dbAdapter.query = async <TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>> => {
    if (!database) {
      return err(new Error('Database not initialized'));
    }

    try {
      const stmt = database.prepare(query.text);
      const rows = query.params ? stmt.all(...query.params) : stmt.all();

      return ok({
        rows: rows as TRow[],
        rowCount: rows.length,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

  dbAdapter.begin = async (): Promise<Result<DatabaseTransaction, Error>> => {
    if (!database) {
      return err(new Error('Database not initialized'));
    }

    const txId = `tx-${++transactionCounter}`;
    let committed = false;
    let rolledBack = false;

    // Begin transaction
    try {
      database.prepare('BEGIN').run();
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }

    const transaction: DatabaseTransaction = {
      id: txId,

      query: async <TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>> => {
        if (committed || rolledBack) {
          return err(new Error('Transaction already completed'));
        }
        return dbAdapter.query<TRow>(query);
      },

      commit: async (): Promise<Result<void, Error>> => {
        if (committed) {
          return err(new Error('Transaction already committed'));
        }
        if (rolledBack) {
          return err(new Error('Transaction already rolled back'));
        }

        try {
          database!.prepare('COMMIT').run();
          committed = true;
          return ok(undefined);
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
      },

      rollback: async (): Promise<Result<void, Error>> => {
        if (committed) {
          return err(new Error('Transaction already committed'));
        }
        if (rolledBack) {
          return err(new Error('Transaction already rolled back'));
        }

        try {
          database!.prepare('ROLLBACK').run();
          rolledBack = true;
          return ok(undefined);
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
      },
    };

    return ok(transaction);
  };

  dbAdapter.transaction = async <T>(
    fn: (tx: DatabaseTransaction) => Promise<Result<T, Error>>
  ): Promise<Result<T, Error>> => {
    const txResult = await dbAdapter.begin();
    if (txResult.isErr()) {
      return err(txResult.error);
    }

    const tx = txResult.value;

    try {
      const result = await fn(tx);

      if (result.isErr()) {
        await tx.rollback();
        return result;
      }

      const commitResult = await tx.commit();
      if (commitResult.isErr()) {
        return err(commitResult.error);
      }

      return result;
    } catch (error) {
      await tx.rollback();
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return dbAdapter;
};
```

## Transaction Pattern

The transaction method provides automatic commit/rollback:

```typescript
const result = await db.transaction(async (tx) => {
  // Insert user
  const userResult = await tx.query({
    text: 'INSERT INTO users (name) VALUES (?) RETURNING id',
    params: ['Alice'],
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
```

## Related Packages

- **[@servicejs/integrations](../integrations)**: Base integration framework
- **[@servicejs/integration-server](../integration-server)**: Server adapters
- **[@servicejs/integration-mq](../integration-mq)**: Message queue adapters

## Testing

Run tests:

```bash
bun test
```

## License

MIT
