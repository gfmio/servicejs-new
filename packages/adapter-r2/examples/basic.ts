/**
 * Basic Cloudflare R2 adapter usage example
 */

import { createR2Adapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createR2Adapter();

  // Initialize with Cloudflare credentials
  const initResult = await adapter.init({
    accountId: 'your-account-id',
    accessKeyId: 'your-access-key-id',
    secretAccessKey: 'your-secret-access-key',
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
    body: 'Hello, R2!',
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
  });

  if (isOk(putJsonResult)) {
    console.log('JSON uploaded');
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

  // Cleanup
  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
