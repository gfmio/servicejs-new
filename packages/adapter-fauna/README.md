# @servicejs/adapter-fauna

FaunaDB adapter providing document-relational database with strong consistency, ACID transactions, and global distribution.

## Status

✅ **Implemented** - Production ready

## Features

- **Document-Relational**: Combine flexibility of documents with relational integrity
- **Strong Consistency**: ACID transactions with serializable isolation
- **FQL v10**: Modern Fauna Query Language with type safety
- **Global Distribution**: Multi-region replication with low latency
- **Serverless**: Auto-scaling with pay-per-use pricing
- **Lifecycle Management**: Standard init/start/stop/destroy pattern
- **Result Types**: All operations return Result<T, Error> for predictable error handling

## Installation

```bash
npm install @servicejs/adapter-fauna fauna
```

## Quick Start

```typescript
import { createFaunaAdapter, fql } from '@servicejs/adapter-fauna';
import { isOk } from '@servicejs/result';

// Create and initialize adapter
const adapter = createFaunaAdapter();

await adapter.init({
  secret: 'your-fauna-secret-key',
});

await adapter.start();

// Execute a query
const result = await adapter.query(fql`
  Users.where(.active == true).pageSize(10)
`);

if (isOk(result)) {
  console.log('Active users:', result.value);
}

// Cleanup
await adapter.stop();
```

## Basic Operations

### Create Document

```typescript
const result = await adapter.query(fql`
  Users.create({
    name: "John Doe",
    email: "john@example.com",
    age: 30
  })
`);

if (isOk(result)) {
  console.log('Created user:', result.value);
  console.log('Document ID:', result.value.id);
}
```

### Query Documents

```typescript
// Query by field
const result = await adapter.query(fql`
  Users.byEmail("john@example.com").first()
`);

// Query with filter
const activeUsers = await adapter.query(fql`
  Users.where(.active == true && .age > 18)
`);

// Query with pagination
const page1 = await adapter.query(fql`
  Users.all().pageSize(20)
`);
```

### Update Document

```typescript
const result = await adapter.query(fql`
  Users.byEmail("john@example.com").first()!.update({
    age: 31,
    lastLogin: Time.now()
  })
`);
```

### Delete Document

```typescript
const result = await adapter.query(fql`
  Users.byEmail("john@example.com").first()!.delete()
`);
```

## Relationships

FaunaDB supports document relationships:

```typescript
// Create collections
await adapter.query(fql`
  if (!Collection.byName("Authors").exists()) {
    Collection.create({ name: "Authors" })
  }
`);

await adapter.query(fql`
  if (!Collection.byName("Posts").exists()) {
    Collection.create({ name: "Posts" })
  }
`);

// Create author
const author = await adapter.query(fql`
  Authors.create({
    name: "Alice Smith",
    email: "alice@example.com"
  })
`);

if (isOk(author)) {
  // Create post with author reference
  await adapter.query(fql`
    Posts.create({
      title: "Hello World",
      content: "My first post",
      authorId: ${author.value.id}
    })
  `);

  // Query with join
  const postsWithAuthors = await adapter.query(fql`
    Posts.where(.authorId == ${author.value.id}).map(post => {
      author: Authors.byId(post.authorId),
      post: post
    })
  `);
}
```

## Indexes

Create indexes for efficient queries:

```typescript
// Create an index
await adapter.query(fql`
  if (!Index.byName("users_by_email").exists()) {
    Index.create({
      name: "users_by_email",
      source: Collection.byName("Users"),
      terms: [{ field: "email" }]
    })
  }
`);

// Use the index
const result = await adapter.query(fql`
  Index.byName("users_by_email").match("john@example.com")
`);
```

### Composite Indexes

```typescript
await adapter.query(fql`
  Index.create({
    name: "products_by_category_and_price",
    source: Collection.byName("Products"),
    terms: [
      { field: "category" },
      { field: "price" }
    ]
  })
`);
```

## Transactions

FaunaDB provides ACID transactions by default. All queries are atomic:

```typescript
// Atomic multi-document transaction
const result = await adapter.query(fql`
  let sender = Accounts.byId("sender-id").first()!
  let receiver = Accounts.byId("receiver-id").first()!
  let amount = 100

  if (sender.balance < amount) {
    abort("Insufficient funds")
  }

  sender.update({ balance: sender.balance - amount })
  receiver.update({ balance: receiver.balance + amount })

  { sender: sender, receiver: receiver }
`);
```

## Advanced Queries

### Filtering and Sorting

```typescript
const result = await adapter.query(fql`
  Users
    .where(.age > 21 && .active == true)
    .order(.name, "asc")
    .pageSize(10)
`);
```

### Aggregations

```typescript
// Count
const count = await adapter.query(fql`
  Users.where(.active == true).count()
`);

// Sum/Average
const avgAge = await adapter.query(fql`
  Users.all().fold(0, (sum, user) => sum + user.age) /
  Users.all().count()
`);
```

### Map and Projection

```typescript
const result = await adapter.query(fql`
  Users.all().map(user => {
    id: user.id,
    name: user.name,
    email: user.email
  })
`);
```

### Conditional Logic

```typescript
const result = await adapter.query(fql`
  let user = Users.byEmail("john@example.com").first()

  if (user != null) {
    user.update({ lastSeen: Time.now() })
  } else {
    Users.create({ email: "john@example.com", name: "John" })
  }
`);
```

## Collections

### Create Collection

```typescript
await adapter.query(fql`
  Collection.create({
    name: "Users",
    history_days: 30,
    ttl_days: null
  })
`);
```

### List Collections

```typescript
const collections = await adapter.query(fql`
  Collection.all()
`);
```

## User-Defined Functions

```typescript
// Create a function
await adapter.query(fql`
  Function.create({
    name: "getActiveUsers",
    body: Query(Lambda(
      [],
      Users.where(.active == true)
    ))
  })
`);

// Call the function
const result = await adapter.query(fql`
  Function.byName("getActiveUsers").call()
`);
```

## Time and Dates

```typescript
// Current time
await adapter.query(fql`
  Users.create({
    name: "John",
    createdAt: Time.now()
  })
`);

// Date arithmetic
const result = await adapter.query(fql`
  Users.where(.createdAt > Time.now() - Duration.fromDays(7))
`);
```

## Configuration

```typescript
await adapter.init({
  // Required: Fauna secret key
  secret: 'your-secret-key',

  // Optional: Custom endpoint (for local dev)
  endpoint: 'http://localhost:8443',

  // Optional: Query timeout in milliseconds
  queryTimeout: 60000,
});
```

## Environment Variables

```bash
# .env file
FAUNA_SECRET=your-fauna-secret-key
```

## Best Practices

1. **Use Indexes**: Create indexes for frequently queried fields
2. **Pagination**: Always use `.pageSize()` for large result sets
3. **Parameterized Queries**: Use template literals for dynamic values
4. **Handle Result Types**: Always check `isOk()` before accessing values
5. **Schema Design**: Design collections with relationships in mind
6. **Error Handling**: Use conditional logic to handle missing documents
7. **TTL**: Set `ttl_days` on documents that should expire

## Advanced Usage

### Access Raw Client

```typescript
const clientResult = adapter.getClient();

if (isOk(clientResult)) {
  const client = clientResult.value;

  // Use Fauna client directly
  const result = await client.query(fql`
    Users.all().pageSize(10)
  `);
}
```

### Batch Operations

```typescript
// Insert multiple documents
const users = [
  { name: "Alice", email: "alice@example.com" },
  { name: "Bob", email: "bob@example.com" },
  { name: "Charlie", email: "charlie@example.com" },
];

for (const user of users) {
  await adapter.query(fql`
    Users.create(${user})
  `);
}
```

## Schema Management

### Migrations

```typescript
// Create collection with schema
await adapter.query(fql`
  if (!Collection.byName("Users").exists()) {
    Collection.create({
      name: "Users",
      constraints: [
        {
          unique: ["email"],
          status: "active"
        }
      ]
    })
  }
`);

// Add index
await adapter.query(fql`
  if (!Index.byName("users_by_status").exists()) {
    Index.create({
      name: "users_by_status",
      source: Collection.byName("Users"),
      terms: [{ field: "status" }]
    })
  }
`);
```

## Examples

See the [examples](./examples) directory for:
- Basic CRUD operations
- Relationships and joins
- Indexes and queries
- Aggregations

## Error Handling

All operations return `Result<T, Error>`:

```typescript
import { isOk, isErr } from '@servicejs/result';

const result = await adapter.query(fql`
  Users.byEmail("unknown@example.com").first()
`);

if (isOk(result)) {
  console.log('User:', result.value);
} else {
  console.error('Error:', result.error.message);
}
```

## TypeScript

Full TypeScript support with FQL type inference:

```typescript
import { FaunaAdapter } from '@servicejs/adapter-fauna';

const adapter: FaunaAdapter = createFaunaAdapter();

// Define types for your data
interface User {
  id: string;
  name: string;
  email: string;
  age: number;
}

const result = await adapter.query<User>(fql`
  Users.byEmail("john@example.com").first()
`);
```

## Regions and Distribution

FaunaDB automatically replicates data across regions:

```typescript
// Connect to a specific region group
await adapter.init({
  secret: process.env.FAUNA_SECRET!,
  endpoint: 'https://db.us.fauna.com', // US region
  // endpoint: 'https://db.eu.fauna.com', // EU region
});
```

## Resources

- [FaunaDB Documentation](https://docs.fauna.com/)
- [FQL v10 Reference](https://docs.fauna.com/fauna/current/learn/query/fql/)
- [Fauna JavaScript Driver](https://github.com/fauna/fauna-js)
- [Best Practices](https://docs.fauna.com/fauna/current/learn/understanding/)

## License

MIT
