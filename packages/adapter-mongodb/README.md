# @servicejs/adapter-mongodb

MongoDB adapter for ServiceJS - a powerful document database with rich query capabilities, aggregation pipeline, and real-time change streams.

## Features

- 🗄️ **Document Database**: Flexible schema, JSON-like documents
- 🔍 **Rich Queries**: Filters, projections, sorting, pagination
- 📊 **Aggregation Pipeline**: Complex data transformations and analytics
- 🔒 **Transactions**: ACID transactions with commit/rollback
- 📡 **Change Streams**: Real-time data change notifications
- 🎯 **Type-Safe**: Full TypeScript support with generics
- 🔄 **Lifecycle Management**: Init, start, stop, destroy patterns
- ✅ **Result Types**: Rust-style error handling with `Result<T, E>`
- 🧪 **Testcontainers**: Automated integration testing

## Installation

```bash
npm install @servicejs/adapter-mongodb
# or
bun add @servicejs/adapter-mongodb
```

## Quick Start

```typescript
import { createMongoDBAdapter } from '@servicejs/adapter-mongodb';
import { isOk } from '@servicejs/result';

// Create adapter
const db = createMongoDBAdapter();

// Initialize connection
await db.init({
  url: 'mongodb://localhost:27017',
  database: 'mydb',
});

await db.start();

// Insert a document
const result = await db.insertOne('users', {
  name: 'Alice',
  age: 30,
});

if (isOk(result)) {
  console.log('Inserted with ID:', result.ok.id);
}

// Query documents
const users = await db.query({
  collection: 'users',
  filter: { age: { $gte: 25 } },
});

// Cleanup
await db.stop();
await db.destroy();
```

## Configuration

### MongoDBConfig

```typescript
interface MongoDBConfig {
  // Connection URL (e.g., 'mongodb://localhost:27017')
  url: string;

  // Database name
  database: string;

  // Optional connection options
  options?: {
    maxPoolSize?: number;
    minPoolSize?: number;
    serverSelectionTimeoutMS?: number;
    connectTimeoutMS?: number;
  };
}
```

## API Reference

### Document Operations

#### `insertOne(collection: string, document: Document): Promise<Result<{ id: string }, Error>>`

Insert a single document into a collection.

```typescript
const result = await db.insertOne('users', {
  name: 'Alice',
  age: 30,
  email: 'alice@example.com',
});

if (isOk(result)) {
  console.log('Inserted ID:', result.ok.id);
}
```

#### `insertMany(collection: string, documents: Document[]): Promise<Result<{ ids: string[] }, Error>>`

Insert multiple documents into a collection.

```typescript
const result = await db.insertMany('users', [
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 },
]);

if (isOk(result)) {
  console.log('Inserted IDs:', result.ok.ids);
}
```

#### `findOne<T>(collection: string, filter: Filter): Promise<Result<T | null, Error>>`

Find a single document matching the filter.

```typescript
const result = await db.findOne('users', { name: 'Alice' });

if (isOk(result) && result.ok) {
  console.log('Found:', result.ok);
}
```

#### `updateOne(collection: string, filter: Filter, update: UpdateFilter): Promise<Result<{ modifiedCount: number }, Error>>`

Update a single document.

```typescript
const result = await db.updateOne(
  'users',
  { name: 'Alice' },
  { $set: { age: 31 } }
);

if (isOk(result)) {
  console.log('Modified:', result.ok.modifiedCount);
}
```

#### `updateMany(collection: string, filter: Filter, update: UpdateFilter): Promise<Result<{ modifiedCount: number }, Error>>`

Update multiple documents.

```typescript
const result = await db.updateMany(
  'users',
  { age: { $lt: 30 } },
  { $set: { category: 'young' } }
);
```

#### `deleteOne(collection: string, filter: Filter): Promise<Result<{ deletedCount: number }, Error>>`

Delete a single document.

```typescript
const result = await db.deleteOne('users', { name: 'Alice' });

if (isOk(result)) {
  console.log('Deleted:', result.ok.deletedCount);
}
```

#### `deleteMany(collection: string, filter: Filter): Promise<Result<{ deletedCount: number }, Error>>`

Delete multiple documents.

```typescript
const result = await db.deleteMany('users', { age: { $lt: 18 } });
```

#### `countDocuments(collection: string, filter?: Filter): Promise<Result<number, Error>>`

Count documents in a collection.

```typescript
// Count all documents
const total = await db.countDocuments('users');

// Count with filter
const adults = await db.countDocuments('users', { age: { $gte: 18 } });
```

### Query Operations

#### `query<TRow>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>>`

Execute a query with filters, projections, sorting, and pagination.

```typescript
const result = await db.query({
  collection: 'users',
  filter: { age: { $gte: 25 } },
  projection: { name: 1, age: 1, _id: 0 },
  sort: { age: -1 },
  skip: 0,
  limit: 10,
});

if (isOk(result)) {
  console.log('Rows:', result.ok.rows);
  console.log('Count:', result.ok.rowCount);
}
```

### Aggregation Pipeline

#### `aggregate<T>(query: AggregationQuery): Promise<Result<T[], Error>>`

Execute an aggregation pipeline for complex data transformations.

```typescript
const result = await db.aggregate({
  collection: 'orders',
  pipeline: [
    { $match: { status: 'completed' } },
    {
      $group: {
        _id: '$userId',
        totalSpent: { $sum: '$amount' },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { totalSpent: -1 } },
    { $limit: 10 },
  ],
});

if (isOk(result)) {
  console.log('Top spenders:', result.ok);
}
```

### Change Streams

#### `watch(collection: string, options?: WatchOptions): Promise<Result<ChangeStream, Error>>`

Watch a collection for real-time changes.

```typescript
const streamResult = await db.watch('users', {
  fullDocument: 'updateLookup',
  pipeline: [{ $match: { operationType: 'insert' } }],
});

if (isOk(streamResult)) {
  const changeStream = streamResult.ok;

  changeStream.on('change', (change) => {
    console.log('Change detected:', change.operationType);
    console.log('Document:', change.fullDocument);
  });

  // Later: close the stream
  await changeStream.close();
}
```

### Transaction Operations

#### `begin(): Promise<Result<DatabaseTransaction, Error>>`

Start a new transaction.

```typescript
const txResult = await db.begin();
if (isOk(txResult)) {
  const tx = txResult.ok;

  try {
    // Perform operations
    await db.updateOne('accounts', { name: 'Alice' }, { $inc: { balance: -50 } });
    await db.updateOne('accounts', { name: 'Bob' }, { $inc: { balance: 50 } });

    // Commit if all operations succeed
    await tx.commit();
  } catch (error) {
    // Rollback on error
    await tx.rollback();
  }
}
```

### Lifecycle Management

#### `init(config: MongoDBConfig): Promise<Result<void, Error>>`

Initialize the database connection.

#### `start(): Promise<Result<void, Error>>`

Start the database adapter (validates connection).

#### `stop(): Promise<Result<void, Error>>`

Stop the database adapter (no-op for MongoDB).

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

### Basic CRUD Operations

```typescript
import { createMongoDBAdapter } from '@servicejs/adapter-mongodb';
import { isOk } from '@servicejs/result';

const db = createMongoDBAdapter();

await db.init({
  url: 'mongodb://localhost:27017',
  database: 'myapp',
});

await db.start();

// Create
await db.insertOne('users', { name: 'Alice', age: 30 });

// Read
const user = await db.findOne('users', { name: 'Alice' });

// Update
await db.updateOne('users', { name: 'Alice' }, { $set: { age: 31 } });

// Delete
await db.deleteOne('users', { name: 'Alice' });

await db.stop();
await db.destroy();
```

### Advanced Queries

```typescript
// Complex filter
const result = await db.query({
  collection: 'products',
  filter: {
    $and: [
      { price: { $gte: 10, $lte: 100 } },
      { category: { $in: ['electronics', 'books'] } },
      { inStock: true },
    ],
  },
  projection: { name: 1, price: 1, category: 1, _id: 0 },
  sort: { price: 1 },
  limit: 20,
});

// Pagination
async function getPage(pageNum: number, pageSize: number) {
  return await db.query({
    collection: 'products',
    filter: {},
    sort: { createdAt: -1 },
    skip: pageNum * pageSize,
    limit: pageSize,
  });
}
```

### Aggregation Pipeline

```typescript
// Sales analytics
const salesStats = await db.aggregate({
  collection: 'orders',
  pipeline: [
    // Filter completed orders from last 30 days
    {
      $match: {
        status: 'completed',
        date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    },
    // Calculate order total
    {
      $addFields: {
        total: { $multiply: ['$quantity', '$price'] },
      },
    },
    // Group by product
    {
      $group: {
        _id: '$productId',
        totalRevenue: { $sum: '$total' },
        totalQuantity: { $sum: '$quantity' },
        orderCount: { $sum: 1 },
        avgOrderValue: { $avg: '$total' },
      },
    },
    // Join with products collection
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    // Format output
    {
      $project: {
        _id: 0,
        productName: '$product.name',
        totalRevenue: 1,
        totalQuantity: 1,
        orderCount: 1,
        avgOrderValue: 1,
      },
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: 10 },
  ],
});
```

### Transactions

```typescript
// Bank transfer with transaction
async function transfer(from: string, to: string, amount: number) {
  const txResult = await db.begin();
  if (!isOk(txResult)) {
    throw new Error('Failed to start transaction');
  }

  const tx = txResult.ok;

  try {
    // Check sender balance
    const sender = await db.findOne('accounts', { name: from });
    if (!isOk(sender) || !sender.ok || sender.ok.balance < amount) {
      await tx.rollback();
      throw new Error('Insufficient funds');
    }

    // Deduct from sender
    await db.updateOne(
      'accounts',
      { name: from },
      { $inc: { balance: -amount } }
    );

    // Add to receiver
    await db.updateOne(
      'accounts',
      { name: to },
      { $inc: { balance: amount } }
    );

    // Record transaction
    await db.insertOne('transactions', {
      from,
      to,
      amount,
      date: new Date(),
    });

    await tx.commit();
    return { success: true };
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}
```

### Change Streams

```typescript
// Monitor user activity in real-time
const watchResult = await db.watch('users', {
  fullDocument: 'updateLookup',
});

if (isOk(watchResult)) {
  const stream = watchResult.ok;

  stream.on('change', (change) => {
    switch (change.operationType) {
      case 'insert':
        console.log('New user registered:', change.fullDocument);
        // Send welcome email
        break;
      case 'update':
        console.log('User updated:', change.documentKey);
        // Invalidate cache
        break;
      case 'delete':
        console.log('User deleted:', change.documentKey);
        // Clean up user data
        break;
    }
  });

  stream.on('error', (error) => {
    console.error('Stream error:', error);
  });

  // Close stream when done
  process.on('SIGINT', async () => {
    await stream.close();
    process.exit(0);
  });
}
```

## Testing

The adapter includes comprehensive tests using testcontainers for integration testing:

```bash
bun test
```

Tests cover:
- ✅ Lifecycle management (init, start, stop, destroy)
- ✅ Health checks
- ✅ Document operations (insert, find, update, delete, count)
- ✅ Query operations (filter, projection, sort, limit, skip)
- ✅ Aggregation pipeline
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

## Running MongoDB

### Docker

```bash
docker run --rm -p 27017:27017 --name mongodb mongo:7.0
```

### Docker Compose

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:7.0
    ports:
      - '27017:27017'
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
```

### Local Installation

```bash
# macOS
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Or run manually
mongod --config /opt/homebrew/etc/mongod.conf
```

## Use Cases

- **Content Management**: Flexible schema for various content types
- **E-commerce**: Product catalogs, shopping carts, orders
- **User Management**: User profiles, preferences, activity logs
- **Analytics**: Event tracking, aggregated statistics
- **Real-Time Apps**: Change streams for live updates
- **IoT**: Time-series data, sensor readings
- **Social Networks**: Posts, comments, relationships

## Performance Tips

1. **Indexes**: Create indexes on frequently queried fields
   ```typescript
   // Create index via MongoDB shell or admin API
   db.collection('users').createIndex({ email: 1 }, { unique: true });
   ```

2. **Projection**: Only fetch fields you need
   ```typescript
   await db.query({
     collection: 'users',
     filter: {},
     projection: { name: 1, email: 1, _id: 0 },
   });
   ```

3. **Aggregation**: Use `$match` early in pipeline to filter data
   ```typescript
   pipeline: [
     { $match: { status: 'active' } }, // Filter first
     { $sort: { createdAt: -1 } },
     // ... other stages
   ];
   ```

4. **Connection Pooling**: Configure pool size for your workload
   ```typescript
   await db.init({
     url: 'mongodb://localhost:27017',
     database: 'mydb',
     options: {
       maxPoolSize: 50,
       minPoolSize: 10,
     },
   });
   ```

## Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [MongoDB Node.js Driver](https://mongodb.github.io/node-mongodb-native/)
- [MongoDB Query Operators](https://docs.mongodb.com/manual/reference/operator/query/)
- [Aggregation Pipeline](https://docs.mongodb.com/manual/core/aggregation-pipeline/)
- [Change Streams](https://docs.mongodb.com/manual/changeStreams/)

## License

MIT
