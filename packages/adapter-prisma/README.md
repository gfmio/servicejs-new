# @servicejs/adapter-prisma

Prisma ORM adapter for type-safe database access

## Installation

```bash
npm install @servicejs/adapter-prisma @prisma/client
npm install -D prisma
```

## Features

- ✅ Type-safe database operations via Prisma Client
- ✅ Transaction support with isolation levels
- ✅ Raw SQL query support
- ✅ Health checking
- ✅ Lifecycle management (init, start, stop, destroy)
- ✅ Direct client access for full Prisma API
- ✅ Metrics support (if enabled in Prisma)
- ✅ Result-based error handling

## Setup

1. Initialize Prisma:
```bash
npx prisma init
```

2. Define your schema in `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id        Int     @id @default(autoincrement())
  title     String
  content   String?
  published Boolean @default(false)
  authorId  Int
  author    User    @relation(fields: [authorId], references: [id])
}
```

3. Generate Prisma Client:
```bash
npx prisma generate
```

4. Run migrations:
```bash
npx prisma migrate dev --name init
```

## Usage

### Basic Setup

```typescript
import { PrismaClient } from '@prisma/client';
import { createPrismaAdapter } from '@servicejs/adapter-prisma';
import { isOk } from '@servicejs/result';

const prisma = new PrismaClient();
const adapter = createPrismaAdapter();

await adapter.init({ client: prisma });
await adapter.start();

// Get client for operations
const clientResult = adapter.getClient();
if (isOk(clientResult)) {
  const client = clientResult.value;

  // Use Prisma client directly
  const users = await client.user.findMany();
}
```

### CRUD Operations

```typescript
const client = (await adapter.getClient()).value!;

// Create
const user = await client.user.create({
  data: {
    email: 'alice@example.com',
    name: 'Alice',
  },
});

// Read
const users = await client.user.findMany({
  where: { email: { contains: '@example.com' } },
  include: { posts: true },
});

// Update
const updated = await client.user.update({
  where: { id: 1 },
  data: { name: 'Alice Updated' },
});

// Delete
await client.user.delete({
  where: { id: 1 },
});
```

### Transactions

```typescript
const result = await adapter.transaction(async (tx) => {
  const user = await tx.user.create({
    data: { email: 'bob@example.com', name: 'Bob' },
  });

  const post = await tx.post.create({
    data: {
      title: 'Hello World',
      authorId: user.id,
    },
  });

  return { user, post };
});

if (isOk(result)) {
  console.log('Transaction completed:', result.value);
}
```

### Transactions with Isolation Level

```typescript
const result = await adapter.transaction(
  async (tx) => {
    // Your transaction logic
    return await tx.user.findMany();
  },
  {
    isolationLevel: 'Serializable',
    maxWait: 5000,
    timeout: 10000,
  }
);
```

### Raw Queries

```typescript
// Tagged template (recommended)
const result = await adapter.queryRaw<User[]>`
  SELECT * FROM User WHERE email = ${email}
`;

if (isOk(result)) {
  console.log('Users:', result.value);
}

// String query
const result2 = await adapter.queryRaw<User[]>(
  'SELECT * FROM User WHERE age > ?',
  18
);
```

### Execute Raw SQL

```typescript
const result = await adapter.executeRaw`
  UPDATE User SET active = ${true} WHERE lastLogin < ${yesterday}
`;

if (isOk(result)) {
  console.log('Updated rows:', result.value);
}
```

### Relations

```typescript
const client = (await adapter.getClient()).value!;

// Include relations
const userWithPosts = await client.user.findUnique({
  where: { id: 1 },
  include: {
    posts: {
      where: { published: true },
      orderBy: { createdAt: 'desc' },
    },
  },
});

// Nested writes
const user = await client.user.create({
  data: {
    email: 'charlie@example.com',
    name: 'Charlie',
    posts: {
      create: [
        { title: 'Post 1', content: 'Content 1' },
        { title: 'Post 2', content: 'Content 2' },
      ],
    },
  },
});
```

### Aggregations

```typescript
const client = (await adapter.getClient()).value!;

const stats = await client.user.aggregate({
  _count: true,
  _avg: { age: true },
  _max: { age: true },
  _min: { age: true },
});

const grouped = await client.post.groupBy({
  by: ['authorId'],
  _count: { id: true },
  having: {
    id: { _count: { gt: 5 } },
  },
});
```

### Pagination

```typescript
const page = 1;
const pageSize = 10;

const posts = await client.post.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
  orderBy: { createdAt: 'desc' },
});

const total = await client.post.count();
```

### Batch Operations

```typescript
// Create many
const result = await client.post.createMany({
  data: [
    { title: 'Post 1', authorId: 1 },
    { title: 'Post 2', authorId: 1 },
    { title: 'Post 3', authorId: 2 },
  ],
  skipDuplicates: true,
});

console.log(`Created ${result.count} posts`);

// Update many
const updated = await client.post.updateMany({
  where: { published: false },
  data: { published: true },
});

// Delete many
const deleted = await client.post.deleteMany({
  where: {
    createdAt: { lt: new Date('2023-01-01') },
  },
});
```

## Configuration

```typescript
interface PrismaAdapterConfig {
  client: PrismaClient;        // Prisma client instance (required)
  enableLogging?: boolean;     // Enable adapter logging (default: false)
}

interface TransactionOptions {
  maxWait?: number;            // Max time to wait for transaction (ms)
  timeout?: number;            // Transaction timeout (ms)
  isolationLevel?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable';
}
```

## API Reference

### Lifecycle

```typescript
await adapter.init(config: PrismaAdapterConfig): Promise<Result<void, Error>>
await adapter.start(): Promise<Result<void, Error>>
await adapter.stop(): Promise<Result<void, Error>>
await adapter.destroy(): Promise<Result<void, Error>>
await adapter.health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>
```

### Client Access

```typescript
adapter.getClient(): Result<PrismaClient, Error>
```

### Transactions

```typescript
await adapter.transaction<T>(
  fn: (client: PrismaClient) => Promise<T>,
  options?: TransactionOptions
): Promise<Result<T, Error>>
```

### Raw Queries

```typescript
await adapter.queryRaw<T>(
  query: string | TemplateStringsArray,
  ...values: any[]
): Promise<Result<T, Error>>

await adapter.executeRaw(
  query: string | TemplateStringsArray,
  ...values: any[]
): Promise<Result<number, Error>>
```

### Metrics

```typescript
await adapter.getMetrics(): Promise<Result<any, Error>>
```

## Best Practices

1. **Use Transactions**: Group related operations in transactions
2. **Enable Query Logging**: Use Prisma's log option for debugging
3. **Index Frequently Queried Fields**: Add indexes to your schema
4. **Use Select to Limit Data**: Only fetch fields you need
5. **Leverage Prisma's Type Safety**: Let TypeScript catch errors at compile time
6. **Handle Errors with Result Types**: Use isOk/isErr pattern
7. **Use Migrations**: Track schema changes with Prisma Migrate
8. **Connection Pooling**: Configure connection pool in database URL

## Multi-Database Support

Prisma supports multiple databases:

```prisma
// PostgreSQL
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// MySQL
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// SQLite
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

// MongoDB
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

// SQL Server
datasource db {
  provider = "sqlserver"
  url      = env("DATABASE_URL")
}

// CockroachDB
datasource db {
  provider = "cockroachdb"
  url      = env("DATABASE_URL")
}
```

## Error Handling

```typescript
const result = await adapter.transaction(async (tx) => {
  return await tx.user.create({
    data: { email: 'test@example.com' },
  });
});

if (isErr(result)) {
  if (result.error.message.includes('Unique constraint')) {
    console.error('Email already exists');
  } else {
    console.error('Transaction failed:', result.error);
  }
}
```

## Examples

- `examples/basic.ts` - Complete CRUD operations, transactions, relations, and raw queries

## Prisma Studio

Prisma includes a visual database browser:

```bash
npx prisma studio
```

## Related Packages

- [@servicejs/adapter-typeorm](../adapter-typeorm) - TypeORM adapter
- [@servicejs/adapter-kysely](../adapter-kysely) - Kysely query builder adapter

## License

MIT
