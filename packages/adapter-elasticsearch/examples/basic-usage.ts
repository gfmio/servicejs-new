/**
 * Elasticsearch Basic Usage Example
 */

import { createElasticsearchAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createElasticsearchAdapter();

  // Initialize with node URL
  await adapter.init({
    node: 'http://localhost:9200',
    auth: {
      username: 'elastic',
      password: 'changeme',
    },
  });

  await adapter.start();

  // Create an index
  console.log('\n--- Create Index ---');
  const createResult = await adapter.createIndex({
    index: 'products',
    mappings: {
      properties: {
        name: { type: 'text' },
        description: { type: 'text' },
        price: { type: 'float' },
        category: { type: 'keyword' },
        tags: { type: 'keyword' },
      },
    },
  });

  if (isOk(createResult)) {
    console.log('Index created:', createResult.value);
  }

  // Index a document
  console.log('\n--- Index Document ---');
  const indexResult = await adapter.index({
    index: 'products',
    id: '1',
    document: {
      name: 'Laptop',
      description: 'High-performance laptop for developers',
      price: 1299.99,
      category: 'electronics',
      tags: ['laptop', 'computer', 'developer'],
    },
    refresh: 'wait_for',
  });

  if (isOk(indexResult)) {
    console.log('Document indexed:', indexResult.value);
  }

  // Index more documents
  await adapter.index({
    index: 'products',
    id: '2',
    document: {
      name: 'Mouse',
      description: 'Wireless ergonomic mouse',
      price: 49.99,
      category: 'electronics',
      tags: ['mouse', 'wireless', 'ergonomic'],
    },
    refresh: 'wait_for',
  });

  await adapter.index({
    index: 'products',
    id: '3',
    document: {
      name: 'Desk',
      description: 'Standing desk with electric adjustment',
      price: 599.99,
      category: 'furniture',
      tags: ['desk', 'standing', 'adjustable'],
    },
    refresh: 'wait_for',
  });

  // Search
  console.log('\n--- Search ---');
  const searchResult = await adapter.search({
    index: 'products',
    query: {
      match: {
        description: 'laptop',
      },
    },
  });

  if (isOk(searchResult)) {
    console.log('Search results:', searchResult.value.hits.hits);
  }

  // Get a document
  console.log('\n--- Get Document ---');
  const getResult = await adapter.get('products', '1');

  if (isOk(getResult)) {
    console.log('Document:', getResult.value._source);
  }

  // Update a document
  console.log('\n--- Update Document ---');
  const updateResult = await adapter.update({
    index: 'products',
    id: '1',
    doc: {
      price: 1199.99,
    },
    refresh: 'wait_for',
  });

  if (isOk(updateResult)) {
    console.log('Document updated:', updateResult.value);
  }

  // Delete a document
  console.log('\n--- Delete Document ---');
  const deleteResult = await adapter.delete({
    index: 'products',
    id: '3',
    refresh: 'wait_for',
  });

  if (isOk(deleteResult)) {
    console.log('Document deleted:', deleteResult.value);
  }

  // Cleanup
  await adapter.deleteIndex('products');
  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
