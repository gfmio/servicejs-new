/**
 * Supabase Storage Example
 *
 * Demonstrates file storage operations
 */

import { createSupabaseAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';
import { readFile } from 'fs/promises';

async function main() {
  const adapter = createSupabaseAdapter();

  await adapter.init({
    url: process.env.SUPABASE_URL!,
    key: process.env.SUPABASE_KEY!,
  });

  await adapter.start();

  const bucketName = 'avatars';

  // Upload a file
  console.log('\n--- Upload File ---');

  // Create a simple text file to upload
  const fileContent = 'Hello, this is a test file!';
  const fileBlob = new Blob([fileContent], { type: 'text/plain' });

  const uploadResult = await adapter.uploadFile({
    bucket: bucketName,
    path: 'test/hello.txt',
    file: fileBlob,
    options: {
      contentType: 'text/plain',
      upsert: true,
    },
  });

  if (isOk(uploadResult)) {
    console.log('File uploaded:', uploadResult.value.path);
  } else {
    console.error('Upload failed:', uploadResult.error.message);
  }

  // Get public URL
  console.log('\n--- Get Public URL ---');
  const publicUrlResult = adapter.getPublicUrl(bucketName, 'test/hello.txt');

  if (isOk(publicUrlResult)) {
    console.log('Public URL:', publicUrlResult.value);
  }

  // List files in bucket
  console.log('\n--- List Files ---');
  const listResult = await adapter.listFiles({
    bucket: bucketName,
    path: 'test',
    options: {
      limit: 10,
      sortBy: { column: 'name', order: 'asc' },
    },
  });

  if (isOk(listResult)) {
    console.log('Files in bucket:');
    for (const file of listResult.value) {
      console.log(`  - ${file.name} (${file.metadata?.size || 0} bytes)`);
    }
  } else {
    console.error('List failed:', listResult.error.message);
  }

  // Download a file
  console.log('\n--- Download File ---');
  const downloadResult = await adapter.downloadFile({
    bucket: bucketName,
    path: 'test/hello.txt',
  });

  if (isOk(downloadResult)) {
    const text = await downloadResult.value.text();
    console.log('Downloaded file content:', text);
  } else {
    console.error('Download failed:', downloadResult.error.message);
  }

  // Upload an image (simulated)
  console.log('\n--- Upload Image ---');

  // In a real scenario, you would read an actual image file
  // For this example, we'll just create a small buffer
  const imageBuffer = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG header
  const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });

  const imageUploadResult = await adapter.uploadFile({
    bucket: bucketName,
    path: 'images/avatar.jpg',
    file: imageBlob,
    options: {
      contentType: 'image/jpeg',
      cacheControl: '3600',
    },
  });

  if (isOk(imageUploadResult)) {
    console.log('Image uploaded:', imageUploadResult.value.path);

    // Get public URL for the image
    const imageUrlResult = adapter.getPublicUrl(bucketName, imageUploadResult.value.path);
    if (isOk(imageUrlResult)) {
      console.log('Image URL:', imageUrlResult.value);
    }
  }

  // Delete files
  console.log('\n--- Delete Files ---');
  const deleteResult = await adapter.deleteFile(bucketName, [
    'test/hello.txt',
    'images/avatar.jpg',
  ]);

  if (isOk(deleteResult)) {
    console.log('Files deleted successfully');
  } else {
    console.error('Delete failed:', deleteResult.error.message);
  }

  // Cleanup
  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
