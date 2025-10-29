# @servicejs/adapter-planetscale

PlanetScale adapter providing serverless MySQL with branch-based workflows and edge-compatible connections.

## Status

✅ **Implemented** - Production ready

## Features

- **Serverless MySQL**: Connect to PlanetScale's serverless MySQL platform
- **Edge Compatible**: Works in Cloudflare Workers, Vercel Edge, and other edge runtimes
- **HTTP-based**: Uses HTTP/fetch for connections (no TCP required)
- **Transaction Support**: ACID transactions with automatic rollback
- **Branch Workflows**: Integrates with PlanetScale's git-like branching
- **Lifecycle Management**: Standard init/start/stop/destroy pattern
- **Result Types**: All operations return Result<T, Error> for predictable error handling

## Installation

```bash
npm install @servicejs/adapter-planetscale @planetscale/database
```

## Quick Start

```typescript
import { createPlanetScaleAdapter } from '@servicejs/adapter-planetscale';
import { isOk } from '@servicejs/result';

// Create and initialize adapter
const adapter = createPlanetScaleAdapter();

await adapter.init({
  host: 'your-database.region.psdb.cloud',
  username: 'your-username',
  password: 'your-password',
});

await adapter.start();

// Execute a query
const result = await adapter.execute(
  'SELECT * FROM users WHERE active = ? LIMIT ?',
  [true, 10]
);

if (isOk(result)) {
  console.log('Users:', result.value.rows);
  console.log('Rows affected:', result.value.rowsAffected);
}

// Cleanup
await adapter.stop();
```

## Database Operations

### Execute Queries

```typescript
// SELECT
const result = await adapter.execute(
  'SELECT id, name, email FROM users WHERE age > ?',
  [18]
);

if (isOk(result)) {
  console.log('Rows:', result.value.rows);
  console.log('Fields:', result.value.fields);
}
```

### Insert Data

```typescript
const result = await adapter.execute(
  'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
  ['John Doe', 'john@example.com', 30]
);

if (isOk(result)) {
  console.log('Insert ID:', result.value.insertId);
  console.log('Rows affected:', result.value.rowsAffected);
}
```

### Update Data

```typescript
const result = await adapter.execute(
  'UPDATE users SET age = ? WHERE email = ?',
  [31, 'john@example.com']
);

if (isOk(result)) {
  console.log('Updated rows:', result.value.rowsAffected);
}
```

### Delete Data

```typescript
const result = await adapter.execute(
  'DELETE FROM users WHERE id = ?',
  [123]
);

if (isOk(result)) {
  console.log('Deleted rows:', result.value.rowsAffected);
}
```

## Transactions

```typescript
const result = await adapter.transaction(async (tx) => {
  // All queries in this block run in a transaction
  const debit = await tx.execute(
    'UPDATE accounts SET balance = balance - ? WHERE id = ?',
    [100, 1]
  );

  if (isErr(debit) || debit.value.rowsAffected === 0) {
    throw new Error('Debit failed');
  }

  const credit = await tx.execute(
    'UPDATE accounts SET balance = balance + ? WHERE id = ?',
    [100, 2]
  );

  if (isErr(credit)) {
    throw new Error('Credit failed');
  }

  return { debit: debit.value, credit: credit.value };
});

if (isOk(result)) {
  console.log('Transaction successful:', result.value);
} else {
  console.log('Transaction failed (rolled back):', result.error);
}
```

## Edge Runtime Support

PlanetScale works perfectly in edge environments:

### Cloudflare Workers

```typescript
export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const adapter = createPlanetScaleAdapter();

    await adapter.init({
      host: env.PLANETSCALE_HOST,
      username: env.PLANETSCALE_USERNAME,
      password: env.PLANETSCALE_PASSWORD,
      fetch: fetch, // Use Cloudflare's fetch
    });

    const result = await adapter.execute('SELECT * FROM users LIMIT 10');

    if (isOk(result)) {
      return new Response(JSON.stringify(result.value.rows), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Error', { status: 500 });
  },
};
```

### Vercel Edge Functions

```typescript
import { createPlanetScaleAdapter } from '@servicejs/adapter-planetscale';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const adapter = createPlanetScaleAdapter();

  await adapter.init({
    host: process.env.PLANETSCALE_HOST!,
    username: process.env.PLANETSCALE_USERNAME!,
    password: process.env.PLANETSCALE_PASSWORD!,
  });

  const result = await adapter.execute('SELECT * FROM posts ORDER BY created_at DESC LIMIT 10');

  if (isOk(result)) {
    return new Response(JSON.stringify(result.value.rows));
  }

  return new Response('Error', { status: 500 });
}
```

## Advanced Usage

### Access Raw Connection

```typescript
const connResult = adapter.getConnection();

if (isOk(connResult)) {
  const conn = connResult.value;

  // Use PlanetScale connection directly
  const result = await conn.execute('SELECT * FROM users');
  console.log(result.rows);
}
```

### Batch Operations

```typescript
// Multiple inserts
const users = [
  ['Alice', 'alice@example.com'],
  ['Bob', 'bob@example.com'],
  ['Charlie', 'charlie@example.com'],
];

for (const [name, email] of users) {
  await adapter.execute(
    'INSERT INTO users (name, email) VALUES (?, ?)',
    [name, email]
  );
}
```

### Complex Queries

```typescript
const result = await adapter.execute(`
  SELECT
    u.id,
    u.name,
    u.email,
    COUNT(p.id) as post_count,
    MAX(p.created_at) as last_post_at
  FROM users u
  LEFT JOIN posts p ON p.user_id = u.id
  WHERE u.active = ?
  GROUP BY u.id, u.name, u.email
  HAVING post_count > ?
  ORDER BY last_post_at DESC
  LIMIT ?
`, [true, 5, 20]);
```

## Configuration

```typescript
await adapter.init({
  // Required: Database connection URL
  host: 'database-name.region.psdb.cloud',

  // Required: Database username
  username: 'your-username',

  // Required: Database password
  password: 'pscale_pw_...',

  // Optional: Custom fetch function (for edge runtimes)
  fetch: globalThis.fetch,

  // Optional: Fetch options
  fetchOptions: {
    cache: 'no-store',
  },
});
```

## Environment Variables

```bash
# .env file
PLANETSCALE_HOST=database-name.region.psdb.cloud
PLANETSCALE_USERNAME=your-username
PLANETSCALE_PASSWORD=pscale_pw_...
```

## Best Practices

1. **Use Parameterized Queries**: Always use `?` placeholders to prevent SQL injection
2. **Handle Result Types**: Always check `isOk()` before accessing values
3. **Connection Pooling**: PlanetScale handles this automatically
4. **Branch Workflows**: Use branches for schema changes (like git)
5. **Read Replicas**: Configure read replicas for better performance
6. **Edge Deployment**: Take advantage of PlanetScale's global edge network
7. **Monitoring**: Use PlanetScale Insights to monitor query performance

## PlanetScale Branches

PlanetScale supports git-like database branches:

```bash
# Create a new branch
pscale branch create my-database my-feature-branch

# Get connection string for the branch
pscale connect my-database my-feature-branch
```

```typescript
// Connect to a specific branch
await adapter.init({
  host: 'my-database-my-feature-branch.region.psdb.cloud',
  username: 'branch-username',
  password: 'branch-password',
});
```

## Schema Migrations

```typescript
// Run migrations (use PlanetScale CLI for production)
await adapter.execute(`
  CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
  )
`);

await adapter.execute(`
  CREATE TABLE IF NOT EXISTS posts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
  )
`);
```

## Examples

See the [examples](./examples) directory for:
- Basic CRUD operations
- Transaction handling
- Edge runtime deployment
- Batch operations

## Error Handling

All operations return `Result<T, Error>`:

```typescript
import { isOk, isErr } from '@servicejs/result';

const result = await adapter.execute('SELECT * FROM users');

if (isOk(result)) {
  console.log('Data:', result.value.rows);
} else {
  console.error('Error:', result.error.message);
}
```

## TypeScript

Full TypeScript support with strict typing:

```typescript
import { PlanetScaleAdapter } from '@servicejs/adapter-planetscale';

const adapter: PlanetScaleAdapter = createPlanetScaleAdapter();

// Type-safe query results
interface User {
  id: number;
  name: string;
  email: string;
}

const result = await adapter.execute('SELECT * FROM users');
if (isOk(result)) {
  const users = result.value.rows as User[];
}
```

## Limitations

- **No Binary Protocol**: Uses HTTP, not MySQL binary protocol (minimal performance impact)
- **No Prepared Statements**: Queries are sent as strings (still safe with parameterization)
- **Branch-based Schema**: Foreign keys work differently than traditional MySQL

## Resources

- [PlanetScale Documentation](https://planetscale.com/docs)
- [PlanetScale Database Client](https://github.com/planetscale/database-js)
- [Branch Workflows](https://planetscale.com/docs/concepts/branching)
- [Deploy Requests](https://planetscale.com/docs/concepts/deploy-requests)

## License

MIT
