/**
 * Basic Filesystem adapter usage example
 */

import { createFilesystemAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';
import * as os from 'os';
import * as path from 'path';

async function main() {
  const adapter = createFilesystemAdapter();

  // Initialize with base path
  const basePath = path.join(os.tmpdir(), 'servicejs-fs-example');
  const initResult = await adapter.init({
    basePath,
    createIfMissing: true,
  });

  if (!isOk(initResult)) {
    console.error('Failed to initialize:', initResult.error);
    return;
  }

  console.log('Initialized filesystem adapter at:', basePath);

  // Start the adapter
  const startResult = await adapter.start();
  if (!isOk(startResult)) {
    console.error('Failed to start:', startResult.error);
    return;
  }

  // Check health
  const healthResult = await adapter.health();
  if (isOk(healthResult)) {
    console.log('Health status:', healthResult.value.status);
  }

  // Create a bucket (directory)
  const bucketName = 'my-bucket';
  const createBucketResult = await adapter.createBucket({ bucket: bucketName });
  if (isOk(createBucketResult)) {
    console.log('Bucket created:', bucketName);
  }

  // List buckets
  const listBucketsResult = await adapter.listBuckets();
  if (isOk(listBucketsResult)) {
    console.log('Buckets:', listBucketsResult.value);
  }

  // Put an object (file)
  const putResult = await adapter.putObject({
    bucket: bucketName,
    key: 'hello.txt',
    body: 'Hello, Filesystem!',
    contentType: 'text/plain',
    metadata: {
      author: 'system',
      version: '1.0',
    },
  });

  if (isOk(putResult)) {
    console.log('Object uploaded, ETag:', putResult.value.etag);
  }

  // Get object
  const getResult = await adapter.getObject({
    bucket: bucketName,
    key: 'hello.txt',
  });

  if (isOk(getResult)) {
    console.log('Object content:', getResult.value.body.toString());
    console.log('Content type:', getResult.value.contentType);
    console.log('Metadata:', getResult.value.metadata);
    console.log('Size:', getResult.value.size);
    console.log('Last modified:', getResult.value.lastModified);
  }

  // Head object (get metadata without content)
  const headResult = await adapter.headObject({
    bucket: bucketName,
    key: 'hello.txt',
  });

  if (isOk(headResult)) {
    console.log('Head object - Size:', headResult.value.size);
    console.log('Head object - Content type:', headResult.value.contentType);
  }

  // Put more objects
  await adapter.putObject({
    bucket: bucketName,
    key: 'data/file1.json',
    body: JSON.stringify({ id: 1, name: 'Item 1' }),
    contentType: 'application/json',
  });

  await adapter.putObject({
    bucket: bucketName,
    key: 'data/file2.json',
    body: JSON.stringify({ id: 2, name: 'Item 2' }),
    contentType: 'application/json',
  });

  await adapter.putObject({
    bucket: bucketName,
    key: 'images/photo.jpg',
    body: Buffer.from('fake-image-data'),
    contentType: 'image/jpeg',
  });

  // List all objects
  const listResult = await adapter.listObjects({ bucket: bucketName });
  if (isOk(listResult)) {
    console.log('All objects:');
    listResult.value.contents.forEach((obj) => {
      console.log(`  - ${obj.key} (${obj.size} bytes, modified: ${obj.lastModified})`);
    });
  }

  // List objects with prefix
  const listPrefixResult = await adapter.listObjects({
    bucket: bucketName,
    prefix: 'data/',
  });

  if (isOk(listPrefixResult)) {
    console.log('Objects with prefix "data/":');
    listPrefixResult.value.contents.forEach((obj) => {
      console.log(`  - ${obj.key}`);
    });
  }

  // Copy object
  const copyResult = await adapter.copyObject({
    sourceBucket: bucketName,
    sourceKey: 'hello.txt',
    destinationBucket: bucketName,
    destinationKey: 'hello-copy.txt',
  });

  if (isOk(copyResult)) {
    console.log('Object copied successfully');
  }

  // Delete object
  const deleteResult = await adapter.deleteObject({
    bucket: bucketName,
    key: 'hello-copy.txt',
  });

  if (isOk(deleteResult)) {
    console.log('Object deleted');
  }

  // List objects with maxKeys
  const limitedListResult = await adapter.listObjects({
    bucket: bucketName,
    maxKeys: 2,
  });

  if (isOk(limitedListResult)) {
    console.log('Limited list (maxKeys=2):', limitedListResult.value.contents.length, 'items');
    console.log('Is truncated:', limitedListResult.value.isTruncated);
  }

  // Cleanup
  await adapter.stop();
  await adapter.destroy();

  console.log('\nNote: Files are stored at:', basePath);
  console.log('You can inspect them manually or clean up with:');
  console.log(`  rm -rf ${basePath}`);
}

main().catch(console.error);
