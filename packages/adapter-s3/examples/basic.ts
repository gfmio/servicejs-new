/**
 * Basic AWS S3 adapter usage example
 */

import { createS3Adapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createS3Adapter();

  // Initialize with AWS credentials
  const initResult = await adapter.init({
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'your-access-key-id',
      secretAccessKey: 'your-secret-access-key',
    },
  });

  if (!isOk(initResult)) {
    console.error('Failed to initialize:', initResult.error);
    return;
  }

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

  const bucketName = 'my-bucket';

  // Create bucket
  const createResult = await adapter.createBucket({ bucket: bucketName });
  if (isOk(createResult)) {
    console.log('Bucket created');
  }

  // Put object
  const putResult = await adapter.putObject({
    bucket: bucketName,
    key: 'hello.txt',
    body: 'Hello, S3!',
    contentType: 'text/plain',
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
    console.log('Object content:', getResult.value.body);
    console.log('Content type:', getResult.value.contentType);
  }

  // List objects
  const listResult = await adapter.listObjects({ bucket: bucketName });
  if (isOk(listResult)) {
    console.log('Objects in bucket:', listResult.value.contents?.map((obj) => obj.key));
  }

  // Upload JSON data
  const jsonData = { user: 'john', status: 'active' };
  const putJsonResult = await adapter.putObject({
    bucket: bucketName,
    key: 'data.json',
    body: JSON.stringify(jsonData),
    contentType: 'application/json',
    metadata: {
      author: 'john',
      version: '1.0',
    },
  });

  if (isOk(putJsonResult)) {
    console.log('JSON uploaded');
  }

  // Get object metadata (HEAD request)
  const headResult = await adapter.headObject({
    bucket: bucketName,
    key: 'data.json',
  });

  if (isOk(headResult)) {
    console.log('Object metadata:', headResult.value.metadata);
    console.log('Content length:', headResult.value.contentLength);
  }

  // Copy object
  const copyResult = await adapter.copyObject({
    sourceBucket: bucketName,
    sourceKey: 'hello.txt',
    destinationBucket: bucketName,
    destinationKey: 'hello-copy.txt',
  });

  if (isOk(copyResult)) {
    console.log('Object copied');
  }

  // Delete object
  const deleteResult = await adapter.deleteObject({
    bucket: bucketName,
    key: 'hello-copy.txt',
  });

  if (isOk(deleteResult)) {
    console.log('Object deleted');
  }

  // Delete multiple objects
  const deleteMultipleResult = await adapter.deleteObjects({
    bucket: bucketName,
    keys: ['hello.txt', 'data.json'],
  });

  if (isOk(deleteMultipleResult)) {
    console.log('Multiple objects deleted');
  }

  // Cleanup
  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
