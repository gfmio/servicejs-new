# @servicejs/adapter-elasticsearch

Elasticsearch adapter providing full-text search and analytics capabilities.

## Status

✅ **Implemented** - Production ready

## Features

- **Full-Text Search**: Powerful search with relevance scoring
- **Analytics**: Aggregations, metrics, and analytics queries
- **Index Management**: Create, delete, and manage indices
- **Document Operations**: Index, search, update, and delete documents
- **Bulk Operations**: Efficient batch processing
- **Cloud Support**: Works with Elastic Cloud
- **Lifecycle Management**: Standard init/start/stop/destroy pattern
- **Result Types**: All operations return Result<T, Error> for predictable error handling

## Installation

```bash
npm install @servicejs/adapter-elasticsearch @elastic/elasticsearch
```

## Quick Start

```typescript
import { createElasticsearchAdapter } from '@servicejs/adapter-elasticsearch';
import { isOk } from '@servicejs/result';

// Create and initialize adapter
const adapter = createElasticsearchAdapter();

await adapter.init({
  node: 'http://localhost:9200',
  auth: {
    username: 'elastic',
    password: 'changeme',
  },
});

await adapter.start();

// Index a document
const result = await adapter.index({
  index: 'products',
  document: {
    name: 'Laptop',
    price: 1299.99,
    category: 'electronics',
  },
});

if (isOk(result)) {
  console.log('Document indexed:', result.value);
}

// Search
const searchResult = await adapter.search({
  index: 'products',
  query: {
    match: {
      category: 'electronics',
    },
  },
});

if (isOk(searchResult)) {
  console.log('Search results:', searchResult.value.hits.hits);
}

// Cleanup
await adapter.stop();
```

## Configuration

### Local Elasticsearch

```typescript
await adapter.init({
  node: 'http://localhost:9200',
  auth: {
    username: 'elastic',
    password: 'changeme',
  },
});
```

### Elastic Cloud

```typescript
await adapter.init({
  cloud: {
    id: 'your-cloud-id',
  },
  auth: {
    apiKey: 'your-api-key',
  },
});
```

### Multiple Nodes

```typescript
await adapter.init({
  node: [
    'http://localhost:9200',
    'http://localhost:9201',
    'http://localhost:9202',
  ],
});
```

### Advanced Options

```typescript
await adapter.init({
  node: 'http://localhost:9200',
  requestTimeout: 30000,
  maxRetries: 3,
  auth: {
    bearer: 'your-bearer-token',
  },
});
```

## Document Operations

### Index a Document

```typescript
const result = await adapter.index({
  index: 'products',
  id: '1',
  document: {
    name: 'Laptop',
    price: 1299.99,
    category: 'electronics',
  },
  refresh: 'wait_for',
});
```

### Search Documents

```typescript
const result = await adapter.search({
  index: 'products',
  query: {
    match: {
      name: 'laptop',
    },
  },
  from: 0,
  size: 10,
  sort: [
    { price: 'desc' },
  ],
});
```

### Get a Document

```typescript
const result = await adapter.get('products', '1');

if (isOk(result)) {
  console.log('Document:', result.value._source);
}
```

### Update a Document

```typescript
const result = await adapter.update({
  index: 'products',
  id: '1',
  doc: {
    price: 1199.99,
  },
  refresh: 'wait_for',
});
```

### Delete a Document

```typescript
const result = await adapter.delete({
  index: 'products',
  id: '1',
  refresh: 'wait_for',
});
```

## Full-Text Search

### Match Query

```typescript
const result = await adapter.search({
  index: 'articles',
  query: {
    match: {
      content: 'search engine',
    },
  },
});
```

### Multi-Match Query

```typescript
const result = await adapter.search({
  index: 'articles',
  query: {
    multi_match: {
      query: 'elasticsearch tutorial',
      fields: ['title', 'content'],
    },
  },
});
```

### Boolean Query

```typescript
const result = await adapter.search({
  index: 'products',
  query: {
    bool: {
      must: [
        { match: { category: 'electronics' } },
      ],
      filter: [
        { range: { price: { gte: 100, lte: 2000 } } },
      ],
      must_not: [
        { term: { discontinued: true } },
      ],
    },
  },
});
```

### Phrase Query

```typescript
const result = await adapter.search({
  index: 'articles',
  query: {
    match_phrase: {
      content: 'full-text search',
    },
  },
});
```

## Aggregations

### Terms Aggregation

```typescript
const result = await adapter.search({
  index: 'sales',
  size: 0,
  aggregations: {
    by_category: {
      terms: {
        field: 'category',
      },
    },
  },
});

if (isOk(result)) {
  console.log('Categories:', result.value.aggregations.by_category.buckets);
}
```

### Stats Aggregation

```typescript
const result = await adapter.search({
  index: 'sales',
  size: 0,
  aggregations: {
    price_stats: {
      stats: {
        field: 'price',
      },
    },
  },
});

if (isOk(result)) {
  const stats = result.value.aggregations.price_stats;
  console.log('Min:', stats.min, 'Max:', stats.max, 'Avg:', stats.avg);
}
```

### Date Histogram

```typescript
const result = await adapter.search({
  index: 'sales',
  size: 0,
  aggregations: {
    sales_over_time: {
      date_histogram: {
        field: 'date',
        calendar_interval: 'day',
      },
    },
  },
});
```

### Nested Aggregations

```typescript
const result = await adapter.search({
  index: 'sales',
  size: 0,
  aggregations: {
    by_category: {
      terms: {
        field: 'category',
      },
      aggregations: {
        total_revenue: {
          sum: {
            field: 'price',
          },
        },
        avg_price: {
          avg: {
            field: 'price',
          },
        },
      },
    },
  },
});
```

## Bulk Operations

```typescript
const operations = [
  { index: { _index: 'products', _id: '1' } },
  { name: 'Laptop', price: 1299.99 },
  { index: { _index: 'products', _id: '2' } },
  { name: 'Mouse', price: 49.99 },
  { update: { _index: 'products', _id: '3' } },
  { doc: { price: 599.99 } },
  { delete: { _index: 'products', _id: '4' } },
];

const result = await adapter.bulk(operations);

if (isOk(result)) {
  console.log('Bulk operation completed:', result.value.items.length);
}
```

## Index Management

### Create Index

```typescript
const result = await adapter.createIndex({
  index: 'products',
  mappings: {
    properties: {
      name: { type: 'text' },
      price: { type: 'float' },
      category: { type: 'keyword' },
      tags: { type: 'keyword' },
      created_at: { type: 'date' },
    },
  },
  settings: {
    number_of_shards: 1,
    number_of_replicas: 1,
  },
});
```

### Delete Index

```typescript
const result = await adapter.deleteIndex('products');
```

### Check if Index Exists

```typescript
const result = await adapter.indexExists('products');

if (isOk(result)) {
  console.log('Index exists:', result.value);
}
```

## Advanced Queries

### Fuzzy Search

```typescript
const result = await adapter.search({
  index: 'products',
  query: {
    fuzzy: {
      name: {
        value: 'laptpo',
        fuzziness: 'AUTO',
      },
    },
  },
});
```

### Wildcard Search

```typescript
const result = await adapter.search({
  index: 'products',
  query: {
    wildcard: {
      name: 'lap*',
    },
  },
});
```

### Prefix Search

```typescript
const result = await adapter.search({
  index: 'products',
  query: {
    prefix: {
      name: 'lap',
    },
  },
});
```

### Range Query

```typescript
const result = await adapter.search({
  index: 'products',
  query: {
    range: {
      price: {
        gte: 100,
        lte: 2000,
      },
    },
  },
});
```

## Sorting and Pagination

```typescript
const result = await adapter.search({
  index: 'products',
  query: {
    match_all: {},
  },
  from: 0,
  size: 20,
  sort: [
    { price: 'desc' },
    { name: 'asc' },
  ],
});
```

## Source Filtering

```typescript
// Include only specific fields
const result = await adapter.search({
  index: 'products',
  query: { match_all: {} },
  _source: ['name', 'price'],
});

// Exclude source entirely
const result2 = await adapter.search({
  index: 'products',
  query: { match_all: {} },
  _source: false,
});
```

## Best Practices

1. **Use Index Templates**: Define templates for consistent index structure
2. **Optimize Mappings**: Choose appropriate field types for your data
3. **Bulk Operations**: Use bulk API for indexing multiple documents
4. **Refresh Control**: Use `refresh: 'wait_for'` when you need immediate consistency
5. **Pagination**: Always use pagination for large result sets
6. **Result Scoring**: Understand relevance scoring for better search results
7. **Aggregations**: Use aggregations for analytics instead of retrieving all documents

## Environment Variables

```bash
# .env file
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=changeme
```

## Examples

See the [examples](./examples) directory for:
- Basic usage
- Full-text search patterns
- Aggregations and analytics

## Error Handling

All operations return `Result<T, Error>`:

```typescript
import { isOk, isErr } from '@servicejs/result';

const result = await adapter.search({
  index: 'products',
  query: { match_all: {} },
});

if (isOk(result)) {
  console.log('Results:', result.value.hits.hits);
} else {
  console.error('Error:', result.error.message);
}
```

## TypeScript

Full TypeScript support:

```typescript
import { ElasticsearchAdapter } from '@servicejs/adapter-elasticsearch';

const adapter: ElasticsearchAdapter = createElasticsearchAdapter();
```

## Resources

- [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Elasticsearch JavaScript Client](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/index.html)
- [Query DSL](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html)
- [Aggregations](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations.html)

## License

MIT
