# @servicejs/adapter-mysql

MySQL/MariaDB adapter for ServiceJS - reliable relational database with SQL queries, transactions, and connection pooling.

## Features

- 🗄️ **Relational Database**: ACID-compliant SQL database
- 🔍 **SQL Queries**: Full SQL support with parameterized queries
- 🔒 **Transactions**: ACID transactions with commit/rollback
- 🔄 **Connection Pooling**: Efficient connection management
- 🎯 **Type-Safe**: Full TypeScript support
- ✅ **Result Types**: Rust-style error handling
- 🧪 **Testcontainers**: Automated integration testing

## Installation

```bash
npm install @servicejs/adapter-mysql
# or
bun add @servicejs/adapter-mysql
```

## Quick Start

```typescript
import { createMySQLAdapter } from '@servicejs/adapter-mysql';
import { isOk } from '@servicejs/result';

const db = createMySQLAdapter();

await db.init({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'password',
  database: 'mydb',
});

await db.start();

// Execute DDL
await db.execute({
  text: 'CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), age INT)',
});

// Insert data
await db.execute({
  text: 'INSERT INTO users (name, age) VALUES (?, ?)',
  params: ['Alice', 30],
});

// Query data
const result = await db.query({
  text: 'SELECT * FROM users WHERE age > ?',
  params: [25],
});

if (isOk(result)) {
  console.log('Users:', result.ok.rows);
}

await db.stop();
await db.destroy();
```

## API Reference

### Configuration

```typescript
interface MySQLConfig {
  host?: string; // default: 'localhost'
  port?: number; // default: 3306
  user: string;
  password: string;
  database: string;
  pool?: {
    connectionLimit?: number; // default: 10
    queueLimit?: number; // default: 0
    waitForConnections?: boolean; // default: true
  };
}
```

### Methods

- `init(config)` - Initialize database connection
- `start()` - Start the adapter
- `stop()` - Stop the adapter
- `destroy()` - Close connection pool
- `health()` - Check database health
- `query<T>(query)` - Execute SELECT query
- `execute(query)` - Execute INSERT/UPDATE/DELETE/DDL
- `begin()` - Start transaction

## Examples

See the [examples](./examples) directory for complete examples.

## Testing

```bash
bun test
```

## License

MIT
