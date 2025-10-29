/**
 * Meilisearch Basic Usage Example
 */

import { createMeilisearchAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createMeilisearchAdapter();

  await adapter.init({
    host: 'http://localhost:7700',
    apiKey: process.env.MEILISEARCH_API_KEY,
  });

  await adapter.start();

  // Create index
  await adapter.createIndex('movies', { primaryKey: 'id' });

  // Add documents
  const addResult = await adapter.addDocuments('movies', [
    { id: 1, title: 'The Matrix', genre: 'sci-fi', year: 1999 },
    { id: 2, title: 'Inception', genre: 'sci-fi', year: 2010 },
    { id: 3, title: 'The Godfather', genre: 'crime', year: 1972 },
  ]);

  if (isOk(addResult)) {
    console.log('Documents added:', addResult.value);
  }

  // Wait for indexing
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Search
  const searchResult = await adapter.search('movies', {
    query: 'matrix',
    limit: 10,
  });

  if (isOk(searchResult)) {
    console.log('Search results:', searchResult.value.hits);
  }

  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
