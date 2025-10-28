# @servicejs/adapter-cassandra

Apache Cassandra adapter for ServiceJS - distributed wide-column store optimized for high write throughput.

## Features

- 📊 **Wide-Column Store**: Flexible schema with column families
- 🌍 **Distributed**: Multi-datacenter replication
- ⚡ **High Throughput**: Optimized for writes
- 🎯 **Type-Safe**: Full TypeScript support

## Installation

```bash
npm install @servicejs/adapter-cassandra
```

## Quick Start

```typescript
import { createCassandraAdapter } from '@servicejs/adapter-cassandra';

const db = createCassandraAdapter();

await db.init({
  contactPoints: ['127.0.0.1'],
  localDataCenter: 'datacenter1',
  keyspace: 'mykeyspace',
});

await db.start();
await db.destroy();
```

## License

MIT
