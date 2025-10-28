# @servicejs/adapter-cockroachdb

CockroachDB adapter for ServiceJS - distributed SQL database with PostgreSQL compatibility, global scalability, and resilience.

## Features

- 🌍 **Distributed SQL**: Horizontally scalable, geo-replicated
- 🐘 **PostgreSQL Compatible**: Use PostgreSQL tools and drivers
- 🔒 **ACID Transactions**: Serializable isolation
- 🔄 **High Availability**: Automatic failover and replication
- 🎯 **Type-Safe**: Full TypeScript support
- ✅ **Result Types**: Rust-style error handling

## Installation

```bash
npm install @servicejs/adapter-cockroachdb
```

## Quick Start

```typescript
import { createCockroachDBAdapter } from '@servicejs/adapter-cockroachdb';
import { isOk } from '@servicejs/result';

const db = createCockroachDBAdapter();

await db.init({
  host: 'localhost',
  port: 26257,
  user: 'root',
  database: 'defaultdb',
});

await db.start();

// Query data
const result = await db.query({
  text: 'SELECT * FROM users WHERE age > $1',
  params: [25],
});

await db.destroy();
```

## License

MIT
