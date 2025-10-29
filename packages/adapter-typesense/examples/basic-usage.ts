/**
 * Typesense Basic Usage Example
 */

import { createTypesenseAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createTypesenseAdapter();

  await adapter.init({
    nodes: [{
      host: 'localhost',
      port: 8108,
      protocol: 'http',
    }],
    apiKey: process.env.TYPESENSE_API_KEY || 'xyz',
  });

  await adapter.start();

  // Create collection
  const schema = {
    name: 'books',
    fields: [
      { name: 'title', type: 'string' },
      { name: 'author', type: 'string' },
      { name: 'year', type: 'int32' },
      { name: 'rating', type: 'float' },
    ],
    default_sorting_field: 'rating',
  };

  await adapter.createCollection(schema);

  // Create document
  const createResult = await adapter.createDocument('books', {
    id: '1',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    year: 1925,
    rating: 4.5,
  });

  if (isOk(createResult)) {
    console.log('Document created:', createResult.value);
  }

  // Search
  const searchResult = await adapter.search('books', {
    q: 'gatsby',
    query_by: 'title,author',
    per_page: 10,
  });

  if (isOk(searchResult)) {
    console.log('Search results:', searchResult.value.hits);
  }

  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
