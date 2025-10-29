/**
 * Algolia Basic Usage Example
 */

import { createAlgoliaAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createAlgoliaAdapter();

  await adapter.init({
    appId: process.env.ALGOLIA_APP_ID!,
    apiKey: process.env.ALGOLIA_API_KEY!,
  });

  await adapter.start();

  // Save an object
  const saveResult = await adapter.saveObject('products', {
    objectID: '1',
    name: 'Laptop',
    brand: 'TechCo',
    price: 1299.99,
    category: 'electronics',
  });

  if (isOk(saveResult)) {
    console.log('Object saved:', saveResult.value);
  }

  // Search
  const searchResult = await adapter.search('products', {
    query: 'laptop',
    hitsPerPage: 10,
  });

  if (isOk(searchResult)) {
    console.log('Search results:', searchResult.value.hits);
  }

  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
