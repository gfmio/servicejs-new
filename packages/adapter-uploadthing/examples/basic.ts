/**
 * Basic UploadThing adapter usage
 */

import { createUploadThingAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createUploadThingAdapter();

  // Initialize with credentials
  await adapter.init({
    apiKey: process.env.UPLOADTHING_API_KEY || 'test-api-key',
    appId: process.env.UPLOADTHING_APP_ID || 'test-app-id',
  });

  await adapter.start();

  console.log('=== Upload File ===');

  // Upload a file
  const fileData = Buffer.from('This is a test file content');
  const uploadResult = await adapter.upload(fileData, 'test-document.txt', {
    contentType: 'text/plain',
    acl: 'public-read',
    metadata: {
      userId: 'user123',
      purpose: 'demo',
    },
  });

  if (isOk(uploadResult)) {
    console.log('Upload successful:');
    console.log('  Key:', uploadResult.value.key);
    console.log('  URL:', uploadResult.value.url);
    console.log('  Name:', uploadResult.value.name);
    console.log('  Size:', uploadResult.value.size, 'bytes');
    console.log('  Type:', uploadResult.value.type);
    console.log('  Uploaded at:', uploadResult.value.uploadedAt);
  }

  console.log('\n=== Check Health ===');

  const health = await adapter.health();
  if (isOk(health)) {
    console.log('Status:', health.value.status);
  }

  await adapter.stop();
}

main().catch(console.error);
