/**
 * Cache purge example
 */

import { createBunnyCDNAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createBunnyCDNAdapter();

  await adapter.init({
    apiKey: process.env.BUNNY_API_KEY || 'test-api-key',
    storageZone: process.env.BUNNY_STORAGE_ZONE || 'my-storage-zone',
    pullZoneId: Number(process.env.BUNNY_PULL_ZONE_ID) || 12345,
  });

  await adapter.start();

  // Upload some files first
  console.log('=== Upload Files ===');

  const files = [
    'index.html',
    'styles/main.css',
    'images/hero.jpg',
  ];

  for (const filePath of files) {
    const content = Buffer.from(`Content of ${filePath}`);
    const result = await adapter.uploadFile(filePath, content);
    if (isOk(result)) {
      console.log(`Uploaded: ${result.value.url}`);
    }
  }

  console.log('\n=== Purge Specific URL ===');

  // Purge cache for a specific file
  const purgeUrl = 'https://my-storage-zone.b-cdn.net/styles/main.css';
  const purgeResult = await adapter.purgeCache({ url: purgeUrl });

  if (isOk(purgeResult)) {
    console.log(`Cache purged for: ${purgeUrl}`);
    console.log('The file will be re-fetched on the next request');
  }

  console.log('\n=== Purge All Cache ===');

  // Purge entire pull zone cache
  const purgeAllResult = await adapter.purgeCache({ purgeAll: true });

  if (isOk(purgeAllResult)) {
    console.log('All cache purged for pull zone');
    console.log('All files will be re-fetched on the next requests');
  }

  console.log('\n=== Check Stats After Purge ===');

  const stats = await adapter.getStats();
  if (isOk(stats)) {
    console.log('Pull Zone Stats:');
    console.log('  Bandwidth:', (stats.value.bandwidth / (1024 * 1024)).toFixed(2), 'MB');
    console.log('  Requests:', stats.value.requests);
    console.log('  Cache hit rate:', (stats.value.cacheHitRate * 100).toFixed(1) + '%');
    console.log('\nNote: Cache hit rate may decrease temporarily after purge');
  }

  await adapter.stop();
}

main().catch(console.error);
