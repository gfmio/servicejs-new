/**
 * Basic AWS SQS adapter usage example
 */

import { createSQSAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createSQSAdapter();

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

  // Create queue
  const createResult = await adapter.createQueue({
    queueName: 'my-queue',
    attributes: {
      DelaySeconds: '0',
      MessageRetentionPeriod: '345600', // 4 days
    },
  });

  if (!isOk(createResult)) {
    console.error('Failed to create queue:', createResult.error);
    return;
  }

  const queueUrl = createResult.value.queueUrl;
  console.log('Queue created:', queueUrl);

  // Send message
  const sendResult = await adapter.send(queueUrl, 'Hello, SQS!');
  if (isOk(sendResult)) {
    console.log('Message sent, ID:', sendResult.value.messageId);
  }

  // Send message with attributes
  const sendWithAttrsResult = await adapter.send(
    queueUrl,
    JSON.stringify({ user: 'john', action: 'login' }),
    {
      contentType: 'application/json',
      timestamp: new Date().toISOString(),
    }
  );

  if (isOk(sendWithAttrsResult)) {
    console.log('Message with attributes sent');
  }

  // Send batch
  const batchResult = await adapter.sendBatch(queueUrl, [
    { id: '1', message: 'Message 1' },
    { id: '2', message: 'Message 2' },
    { id: '3', message: 'Message 3' },
  ]);

  if (isOk(batchResult)) {
    console.log('Batch sent, successful:', batchResult.value.successful?.length);
  }

  // Receive messages
  const receiveResult = await adapter.receive(queueUrl, {
    maxNumberOfMessages: 5,
    waitTimeSeconds: 5,
  });

  if (isOk(receiveResult)) {
    const messages = receiveResult.value.messages || [];
    console.log(`Received ${messages.length} messages`);

    // Process and delete messages
    for (const msg of messages) {
      console.log('Message body:', msg.body);
      console.log('Attributes:', msg.attributes);

      // Delete after processing
      const deleteResult = await adapter.delete(queueUrl, msg.receiptHandle);
      if (isOk(deleteResult)) {
        console.log('Message deleted');
      }
    }
  }

  // Get queue attributes
  const attrsResult = await adapter.getQueueAttributes(queueUrl, [
    'ApproximateNumberOfMessages',
    'ApproximateNumberOfMessagesNotVisible',
  ]);

  if (isOk(attrsResult)) {
    console.log('Queue attributes:', attrsResult.value.attributes);
  }

  // Purge queue (delete all messages)
  const purgeResult = await adapter.purgeQueue(queueUrl);
  if (isOk(purgeResult)) {
    console.log('Queue purged');
  }

  // Delete queue
  const deleteQueueResult = await adapter.deleteQueue(queueUrl);
  if (isOk(deleteQueueResult)) {
    console.log('Queue deleted');
  }

  // Cleanup
  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
