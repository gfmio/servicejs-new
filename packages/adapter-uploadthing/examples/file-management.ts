/**
 * File management example
 */

import { createUploadThingAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createUploadThingAdapter();

  await adapter.init({
    apiKey: process.env.UPLOADTHING_API_KEY || 'test-api-key',
    appId: process.env.UPLOADTHING_APP_ID || 'test-app-id',
  });

  await adapter.start();

  console.log('=== Upload Multiple Files ===');

  // Upload several files
  const files = [
    { name: 'document1.pdf', content: 'PDF content 1', type: 'application/pdf' },
    { name: 'image1.jpg', content: 'Image data 1', type: 'image/jpeg' },
    { name: 'data.json', content: '{"key":"value"}', type: 'application/json' },
  ];

  const uploadedKeys: string[] = [];

  for (const file of files) {
    const result = await adapter.upload(
      Buffer.from(file.content),
      file.name,
      {
        contentType: file.type,
        metadata: { category: 'demo' },
      }
    );

    if (isOk(result)) {
      console.log(`Uploaded: ${result.value.name} (key: ${result.value.key})`);
      uploadedKeys.push(result.value.key);
    }
  }

  console.log('\n=== List All Files ===');

  const fileList = await adapter.listFiles();
  if (isOk(fileList)) {
    console.log(`Total files: ${fileList.value.length}`);
    fileList.value.forEach(file => {
      console.log(`  - ${file.name} (${file.size} bytes, ${file.type})`);
    });
  }

  console.log('\n=== Get File Info ===');

  if (uploadedKeys.length > 0) {
    const fileInfo = await adapter.getFileInfo(uploadedKeys[0]);
    if (isOk(fileInfo)) {
      console.log('File details:');
      console.log('  Key:', fileInfo.value.key);
      console.log('  Name:', fileInfo.value.name);
      console.log('  Size:', fileInfo.value.size, 'bytes');
      console.log('  Type:', fileInfo.value.type);
      console.log('  URL:', fileInfo.value.url);
      if (fileInfo.value.metadata) {
        console.log('  Metadata:', fileInfo.value.metadata);
      }
    }
  }

  console.log('\n=== Delete File ===');

  if (uploadedKeys.length > 0) {
    const deleteResult = await adapter.deleteFile(uploadedKeys[0]);
    if (isOk(deleteResult)) {
      console.log('File deleted successfully');
    }

    // List remaining files
    const remaining = await adapter.listFiles();
    if (isOk(remaining)) {
      console.log(`Remaining files: ${remaining.value.length}`);
    }
  }

  await adapter.stop();
}

main().catch(console.error);
