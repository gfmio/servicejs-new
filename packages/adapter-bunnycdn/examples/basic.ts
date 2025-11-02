/**
 * Basic BunnyCDN adapter usage
 */

import { createBunnyCDNAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createBunnyCDNAdapter();

  // Initialize with API key and storage zone
  await adapter.init({
    apiKey: process.env.BUNNY_API_KEY || 'test-api-key',
    storageZone: process.env.BUNNY_STORAGE_ZONE || 'my-storage-zone',
    pullZoneId: Number(process.env.BUNNY_PULL_ZONE_ID) || 12345,
  });

  await adapter.start();

  console.log('=== Upload File ===');

  // Upload a file to storage zone
  const fileContent = Buffer.from('This is a test file for CDN delivery');
  const uploadResult = await adapter.uploadFile('assets/test-file.txt', fileContent);

  if (isOk(uploadResult)) {
    console.log('Upload successful:');
    console.log('  Path:', uploadResult.value.path);
    console.log('  URL:', uploadResult.value.url);
    console.log('  Size:', uploadResult.value.size, 'bytes');
  }

  console.log('\n=== Check Health ===');

  const health = await adapter.health();
  if (isOk(health)) {
    console.log('Status:', health.value.status);
  }

  console.log('\n=== Get Stats ===');

  const stats = await adapter.getStats();
  if (isOk(stats)) {
    console.log('Pull Zone Stats:');
    console.log('  Bandwidth:', (stats.value.bandwidth / (1024 * 1024)).toFixed(2), 'MB');
    console.log('  Requests:', stats.value.requests);
    console.log('  Cache hit rate:', (stats.value.cacheHitRate * 100).toFixed(1) + '%');
  }

  await adapter.stop();
}

main().catch(console.error);
