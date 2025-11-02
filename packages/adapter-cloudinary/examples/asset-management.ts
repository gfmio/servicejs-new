/**
 * Asset management example
 */

import { createCloudinaryAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createCloudinaryAdapter();

  await adapter.init({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'demo-cloud',
    apiKey: process.env.CLOUDINARY_API_KEY || 'api-key',
    apiSecret: process.env.CLOUDINARY_API_SECRET || 'api-secret',
  });

  await adapter.start();

  console.log('=== Upload Multiple Assets ===');

  // Upload several images
  const uploads = [
    { id: 'user-avatar-1', data: 'avatar 1 data' },
    { id: 'user-avatar-2', data: 'avatar 2 data' },
    { id: 'product-photo-1', data: 'product photo data' },
  ];

  for (const upload of uploads) {
    const result = await adapter.upload(Buffer.from(upload.data), {
      publicId: upload.id,
    });

    if (isOk(result)) {
      console.log(`Uploaded: ${result.value.publicId}`);
    }
  }

  console.log('\n=== List Assets ===');

  // List all assets
  const allAssets = await adapter.listAssets();
  if (isOk(allAssets)) {
    console.log(`Total assets: ${allAssets.value.length}`);
    allAssets.value.forEach(asset => {
      console.log(`  - ${asset.publicId} (${asset.bytes} bytes)`);
    });
  }

  console.log('\n=== List Assets with Prefix ===');

  // List assets with specific prefix
  const userAssets = await adapter.listAssets({ prefix: 'user-' });
  if (isOk(userAssets)) {
    console.log(`User assets: ${userAssets.value.length}`);
    userAssets.value.forEach(asset => {
      console.log(`  - ${asset.publicId}`);
    });
  }

  console.log('\n=== Get Asset Details ===');

  // Get specific asset
  const asset = await adapter.getAsset('user-avatar-1');
  if (isOk(asset)) {
    console.log('Asset details:');
    console.log('  Public ID:', asset.value.publicId);
    console.log('  Format:', asset.value.format);
    console.log('  Size:', asset.value.bytes, 'bytes');
    console.log('  URL:', asset.value.url);
  }

  console.log('\n=== Delete Asset ===');

  // Delete an asset
  const deleteResult = await adapter.delete('product-photo-1');
  if (isOk(deleteResult)) {
    console.log('Asset deleted successfully');
  }

  // List remaining assets
  const remaining = await adapter.listAssets();
  if (isOk(remaining)) {
    console.log(`Remaining assets: ${remaining.value.length}`);
  }

  await adapter.stop();
}

main().catch(console.error);
