/**
 * Storage management example
 */

import { createBunnyCDNAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createBunnyCDNAdapter();

  await adapter.init({
    apiKey: process.env.BUNNY_API_KEY || 'test-api-key',
    storageZone: process.env.BUNNY_STORAGE_ZONE || 'my-storage-zone',
  });

  await adapter.start();

  console.log('=== Upload Multiple Files ===');

  // Upload files to different directories
  const files = [
    { path: 'images/logo.png', content: 'Logo PNG data' },
    { path: 'images/banner.jpg', content: 'Banner JPG data' },
    { path: 'styles/main.css', content: 'CSS content' },
    { path: 'scripts/app.js', content: 'JavaScript content' },
  ];

  for (const file of files) {
    const result = await adapter.uploadFile(file.path, Buffer.from(file.content));
    if (isOk(result)) {
      console.log(`Uploaded: ${result.value.path}`);
      console.log(`  URL: ${result.value.url}`);
    }
  }

  console.log('\n=== List All Files ===');

  const allFiles = await adapter.listFiles('/');
  if (isOk(allFiles)) {
    console.log(`Total files: ${allFiles.value.length}`);
    allFiles.value.forEach(file => {
      console.log(`  - ${file.path} (${file.size} bytes)`);
    });
  }

  console.log('\n=== List Files in Images Directory ===');

  const imageFiles = await adapter.listFiles('images/');
  if (isOk(imageFiles)) {
    console.log(`Image files: ${imageFiles.value.length}`);
    imageFiles.value.forEach(file => {
      console.log(`  - ${file.name}`);
    });
  }

  console.log('\n=== Delete File ===');

  const deleteResult = await adapter.deleteFile('scripts/app.js');
  if (isOk(deleteResult)) {
    console.log('File deleted successfully');
  }

  // List remaining files
  const remaining = await adapter.listFiles('/');
  if (isOk(remaining)) {
    console.log(`Remaining files: ${remaining.value.length}`);
  }

  await adapter.stop();
}

main().catch(console.error);
