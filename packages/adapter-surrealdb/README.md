# @servicejs/adapter-surrealdb

SurrealDB adapter for ServiceJS - a multi-model database supporting documents, graphs, and key-value operations.

## Features

- 🗄️ **Multi-Model**: Documents, graphs, and key-value in one database
- 🔗 **Graph Operations**: Create and traverse relationships between records
- 🔒 **Transactions**: ACID transactions with commit/rollback
- 📊 **Rich Queries**: Full SurrealQL support with parameters
- 🎯 **Type-Safe**: Full TypeScript support with generics
- 🔄 **Lifecycle Management**: Init, start, stop, destroy patterns
- ✅ **Result Types**: Rust-style error handling with `Result<T, E>`
- 🧪 **Testcontainers**: Automated integration testing

## Installation

```bash
npm install @servicejs/adapter-surrealdb
# or
bun add @servicejs/adapter-surrealdb
```

## Quick Start

```typescript
import { createSurrealDBAdapter } from '@servicejs/adapter-surrealdb';
import { isOk } from '@servicejs/result';

// Create adapter
const db = createSurrealDBAdapter();

// Initialize connection
await db.init({
  url: 'http://127.0.0.1:8000/rpc',
  namespace: 'my_namespace',
  database: 'my_database',
  auth: {
    username: 'root',
    password: 'root',
  },
});

await db.start();

// Create a document
const result = await db.create('person:alice', {
  name: 'Alice',
  age: 30,
});

if (isOk(result)) {
  console.log('Created:', result.ok);
}

// Cleanup
await db.stop();
await db.destroy();
```

## Configuration

### SurrealDBConfig

```typescript
interface SurrealDBConfig {
  // Connection URL (e.g., 'http://127.0.0.1:8000/rpc')
  url: string;

  // Database namespace
  namespace: string;

  // Database name
  database: string;

  // Authentication (username/password or token)
  auth?: {
    username: string;
    password: string;
  } | {
    token: string;
  };
}
```

## API Reference

### Document Operations

#### `create<T>(thing: string, data?: T): Promise<Result<T, Error>>`

Create a new document or generate an ID automatically.

```typescript
// Create with specific ID
await db.create('person:alice', { name: 'Alice', age: 30 });

// Create with auto-generated ID
await db.create('person', { name: 'Bob', age: 25 });
```

#### `select<T>(thing: string): Promise<Result<T[], Error>>`

Select one or more documents.

```typescript
// Select specific document
const result = await db.select('person:alice');

// Select all documents in a table
const allPeople = await db.select('person');
```

#### `update<T>(thing: string, data: Partial<T>): Promise<Result<T, Error>>`

Update a document (replaces fields).

```typescript
await db.update('person:alice', { age: 31 });
```

#### `merge<T>(thing: string, data: Partial<T>): Promise<Result<T, Error>>`

Merge data into a document (adds/updates fields without removing others).

```typescript
await db.merge('person:alice', { city: 'New York' });
```

#### `delete(thing: string): Promise<Result<void, Error>>`

Delete a document or all documents in a table.

```typescript
// Delete specific document
await db.delete('person:alice');

// Delete all documents in a table
await db.delete('person');
```

### Query Operations

#### `query<TRow>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>>`

Execute a SurrealQL query with optional parameters.

```typescript
const result = await db.query({
  text: 'SELECT * FROM person WHERE age > $minAge',
  params: { minAge: 25 },
});

if (isOk(result)) {
  console.log('Rows:', result.ok.rows);
  console.log('Count:', result.ok.rowCount);
}
```

### Graph Operations

#### `relate<T>(from: string, relation: string, to: string, data?: T): Promise<Result<T, Error>>`

Create a relationship (edge) between two records.

```typescript
// Create relationship with metadata
await db.relate('person:alice', 'knows', 'person:bob', {
  since: 2020,
  type: 'friend',
});

// Query relationships
const result = await db.query({
  text: 'SELECT * FROM knows WHERE in = person:alice',
});
```

#### Graph Traversal

Use SurrealQL to traverse relationships:

```typescript
// Get direct connections
const connections = await db.query({
  text: 'SELECT ->knows->person.* FROM person:alice',
});

// Get friends of friends
const friendsOfFriends = await db.query({
  text: 'SELECT ->knows->person->knows->person.name FROM person:alice',
});
```

### Transaction Operations

#### `begin(): Promise<Result<DatabaseTransaction, Error>>`

Start a new transaction.

```typescript
const txResult = await db.begin();
if (isOk(txResult)) {
  const tx = txResult.ok;

  // Execute queries in transaction
  await tx.query({
    text: 'CREATE person:dave SET name = "Dave"',
  });

  // Commit or rollback
  await tx.commit();
  // or
  await tx.rollback();
}
```

### Lifecycle Management

#### `init(config: SurrealDBConfig): Promise<Result<void, Error>>`

Initialize the database connection.

#### `start(): Promise<Result<void, Error>>`

Start the database adapter (validates connection).

#### `stop(): Promise<Result<void, Error>>`

Stop the database adapter (no-op for SurrealDB).

#### `destroy(): Promise<Result<void, Error>>`

Close the database connection and clean up resources.

#### `health(): Promise<Result<HealthStatus, Error>>`

Check the health of the database connection.

```typescript
const result = await db.health();
if (isOk(result)) {
  console.log('Status:', result.ok.status); // 'healthy' | 'degraded' | 'unhealthy'
}
```

## Examples

### Multi-Model Database Usage

```typescript
import { createSurrealDBAdapter } from '@servicejs/adapter-surrealdb';
import { isOk } from '@servicejs/result';

const db = createSurrealDBAdapter();

await db.init({
  url: 'http://127.0.0.1:8000/rpc',
  namespace: 'example',
  database: 'example',
  auth: { username: 'root', password: 'root' },
});

await db.start();

// 1. Document Store - Create and query documents
await db.create('person:alice', { name: 'Alice', age: 30 });
await db.create('person:bob', { name: 'Bob', age: 25 });

const people = await db.query({
  text: 'SELECT * FROM person WHERE age > $minAge',
  params: { minAge: 20 },
});

// 2. Graph Database - Create relationships
await db.relate('person:alice', 'knows', 'person:bob', {
  since: 2020,
});

// Traverse the graph
const connections = await db.query({
  text: 'SELECT ->knows->person.name AS friends FROM person:alice',
});

// 3. Key-Value Store - Simple get/set operations
await db.create('config:app', { theme: 'dark', lang: 'en' });
const config = await db.select('config:app');

await db.stop();
await db.destroy();
```

### Transaction Example

```typescript
// Atomic operations with transactions
const txResult = await db.begin();
if (isOk(txResult)) {
  const tx = txResult.ok;

  try {
    // Transfer operation (must be atomic)
    await tx.query({
      text: 'UPDATE account:alice SET balance -= $amount',
      params: { amount: 100 },
    });

    await tx.query({
      text: 'UPDATE account:bob SET balance += $amount',
      params: { amount: 100 },
    });

    // Commit if all operations succeed
    await tx.commit();
  } catch (error) {
    // Rollback on error
    await tx.rollback();
  }
}
```

### Graph Traversal Example

```typescript
// Social network analysis
await db.create('person:alice', { name: 'Alice' });
await db.create('person:bob', { name: 'Bob' });
await db.create('person:charlie', { name: 'Charlie' });

await db.relate('person:alice', 'knows', 'person:bob');
await db.relate('person:bob', 'knows', 'person:charlie');
await db.relate('person:alice', 'follows', 'person:charlie');

// Find all people Alice knows directly or indirectly
const network = await db.query({
  text: `
    SELECT
      name,
      ->knows->person.name AS direct_connections,
      ->knows->person->knows->person.name AS indirect_connections
    FROM person:alice
  `,
});

// Find mutual connections
const mutual = await db.query({
  text: `
    SELECT
      ->knows->person AS p1,
      <-knows<-person AS p2
    FROM person:alice
    WHERE p1 = p2
  `,
});
```

## Testing

The adapter includes comprehensive tests using testcontainers for integration testing:

```bash
bun test
```

Tests cover:
- ✅ Lifecycle management (init, start, stop, destroy)
- ✅ Health checks
- ✅ Document operations (create, select, update, merge, delete)
- ✅ Query operations with parameters
- ✅ Graph operations (relate, traverse)
- ✅ Transaction management (commit, rollback)

## Development

```bash
# Install dependencies
bun install

# Build
bun run build

# Run tests
bun test

# Type check
bun run typecheck
```

## Running SurrealDB

### Docker

```bash
docker run --rm -p 8000:8000 surrealdb/surrealdb:latest \
  start --log trace --user root --pass root memory
```

### Local Installation

```bash
# Install SurrealDB
curl -sSf https://install.surrealdb.com | sh

# Run SurrealDB
surreal start --log trace --user root --pass root memory
```

## Use Cases

- **Document Store**: Store and query JSON documents with flexible schemas
- **Graph Database**: Model and traverse complex relationships
- **Key-Value Store**: Simple configuration and caching
- **Multi-Model**: Combine all approaches in a single database
- **Real-Time Apps**: Built-in live queries and subscriptions
- **Edge Computing**: Lightweight and embeddable

## Resources

- [SurrealDB Documentation](https://surrealdb.com/docs)
- [SurrealQL Language Guide](https://surrealdb.com/docs/surrealql)
- [SurrealDB JavaScript SDK](https://github.com/surrealdb/surrealdb.js)

## License

MIT
