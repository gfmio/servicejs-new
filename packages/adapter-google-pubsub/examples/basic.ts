/**
 * Basic Google Cloud Pub/Sub adapter usage example
 *
 * Demonstrates topic management, publishing, and both pull and push subscriptions
 */

import { createGooglePubSubAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const pubsub = createGooglePubSubAdapter();

  // Initialize with GCP credentials
  const initResult = await pubsub.init({
    projectId: 'your-project-id',
    // Option 1: Use key file
    // keyFilename: '/path/to/service-account-key.json',
    //
    // Option 2: Use credentials directly
    // credentials: {
    //   client_email: 'service-account@project.iam.gserviceaccount.com',
    //   private_key: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n',
    // },
    //
    // Option 3: For local testing with emulator:
    // apiEndpoint: 'localhost:8085',
  });

  if (!isOk(initResult)) {
    console.error('Failed to initialize:', initResult.error);
    return;
  }

  console.log('✓ Initialized Google Cloud Pub/Sub adapter');

  await pubsub.start();
  console.log('✓ Started Google Cloud Pub/Sub adapter');

  // Create topics
  console.log('\n=== Creating Topics ===');

  const userTopicResult = await pubsub.createTopic('user-events');
  if (isOk(userTopicResult)) {
    console.log('✓ Created topic:', userTopicResult.value.name);
  }

  const orderTopicResult = await pubsub.createTopic('order-events');
  if (isOk(orderTopicResult)) {
    console.log('✓ Created topic:', orderTopicResult.value.name);
  }

  // List topics
  console.log('\n=== Listing Topics ===');
  const topicsResult = await pubsub.listTopics();
  if (isOk(topicsResult)) {
    console.log(`Found ${topicsResult.value.length} topics:`);
    topicsResult.value.forEach(topic => {
      console.log(`  - ${topic}`);
    });
  }

  // Publish messages
  console.log('\n=== Publishing Messages ===');

  const publishResult = await pubsub.publish('user-events', {
    userId: '123',
    action: 'created',
    email: 'alice@example.com',
    timestamp: new Date().toISOString(),
  });

  if (isOk(publishResult)) {
    console.log('✓ Published message, ID:', publishResult.value.messageId);
  }

  // Publish with attributes
  const publishAttrResult = await pubsub.publish(
    'user-events',
    {
      userId: '456',
      action: 'updated',
    },
    {
      attributes: {
        type: 'user.updated',
        version: '1.0',
        source: 'api',
      },
    }
  );

  if (isOk(publishAttrResult)) {
    console.log('✓ Published message with attributes, ID:', publishAttrResult.value.messageId);
  }

  // Publish batch
  const batchResult = await pubsub.publishBatch('order-events', [
    {
      data: { orderId: 'ORD-001', amount: 100 },
      options: { attributes: { priority: 'high' } },
    },
    {
      data: { orderId: 'ORD-002', amount: 50 },
      options: { attributes: { priority: 'low' } },
    },
    {
      data: { orderId: 'ORD-003', amount: 200 },
      options: { attributes: { priority: 'high' } },
    },
  ]);

  if (isOk(batchResult)) {
    console.log('✓ Published batch of 3 messages');
    console.log('  Message IDs:', batchResult.value.messageIds);
  }

  // Create subscriptions
  console.log('\n=== Creating Subscriptions ===');

  const pullSubResult = await pubsub.createSubscription(
    'user-events',
    'user-events-pull',
    {
      ackDeadlineSeconds: 30,
    }
  );

  if (isOk(pullSubResult)) {
    console.log('✓ Created pull subscription:', pullSubResult.value.name);
  }

  const pushSubResult = await pubsub.createSubscription(
    'user-events',
    'user-events-push',
    {
      ackDeadlineSeconds: 60,
      enableMessageOrdering: true,
    }
  );

  if (isOk(pushSubResult)) {
    console.log('✓ Created push subscription:', pushSubResult.value.name);
  }

  // List subscriptions
  console.log('\n=== Listing Subscriptions ===');
  const subsResult = await pubsub.listSubscriptions('user-events');
  if (isOk(subsResult)) {
    console.log(`Found ${subsResult.value.length} subscriptions for user-events:`);
    subsResult.value.forEach(sub => {
      console.log(`  - ${sub}`);
    });
  }

  // Pull-based consumption
  console.log('\n=== Pull-based Consumption ===');

  // Wait a bit for messages to be available
  await new Promise(resolve => setTimeout(resolve, 2000));

  const pullResult = await pubsub.pull('user-events-pull', {
    maxMessages: 5,
  });

  if (isOk(pullResult)) {
    console.log(`Pulled ${pullResult.value.length} messages:`);
    for (const msg of pullResult.value) {
      console.log(`  Message ${msg.id}:`);
      console.log(`    Data:`, msg.data);
      console.log(`    Attributes:`, msg.attributes);
      console.log(`    Published:`, msg.publishTime);

      // Acknowledge the message
      await pubsub.acknowledge('user-events-pull', [msg.ackId]);
      console.log(`  ✓ Acknowledged message ${msg.id}`);
    }
  }

  // Push-based consumption (streaming)
  console.log('\n=== Push-based Consumption (Streaming) ===');

  const subscribeResult = await pubsub.subscribe('user-events-push', async (msg) => {
    console.log(`Received message ${msg.id}:`);
    console.log(`  Data:`, msg.data);
    console.log(`  Attributes:`, msg.attributes);

    // Process message asynchronously
    await new Promise(resolve => setTimeout(resolve, 100));

    // Acknowledge when done
    msg.ack();
    console.log(`  ✓ Acknowledged message ${msg.id}`);
  });

  if (isOk(subscribeResult)) {
    console.log('✓ Subscribed to user-events-push (streaming)');

    // Publish more messages to demonstrate streaming
    await pubsub.publish('user-events', {
      userId: '789',
      action: 'deleted',
      timestamp: new Date().toISOString(),
    });

    // Wait to receive messages
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Unsubscribe
    subscribeResult.value.unsubscribe();
    console.log('✓ Unsubscribed from user-events-push');
  }

  // Message ordering
  console.log('\n=== Message Ordering ===');

  await pubsub.createTopic('ordered-events');
  await pubsub.createSubscription('ordered-events', 'ordered-sub', {
    enableMessageOrdering: true,
  });

  // Publish ordered messages
  for (let i = 1; i <= 5; i++) {
    await pubsub.publish(
      'ordered-events',
      { sequence: i, data: `Message ${i}` },
      { orderingKey: 'user-123' }
    );
  }

  console.log('✓ Published 5 ordered messages with ordering key: user-123');

  // Dead letter topic
  console.log('\n=== Dead Letter Topic ===');

  await pubsub.createTopic('main-topic');
  await pubsub.createTopic('dead-letter-topic');

  const dlqSubResult = await pubsub.createSubscription('main-topic', 'dlq-sub', {
    deadLetterPolicy: {
      deadLetterTopic: 'dead-letter-topic',
      maxDeliveryAttempts: 5,
    },
  });

  if (isOk(dlqSubResult)) {
    console.log('✓ Created subscription with dead letter policy');
    console.log('  Max delivery attempts: 5');
    console.log('  Dead letter topic: dead-letter-topic');
  }

  // Cleanup
  console.log('\n=== Cleanup ===');

  await pubsub.deleteSubscription('user-events-pull');
  await pubsub.deleteSubscription('user-events-push');
  console.log('✓ Deleted subscriptions');

  await pubsub.deleteTopic('user-events');
  await pubsub.deleteTopic('order-events');
  console.log('✓ Deleted topics');

  // Health check
  const healthResult = await pubsub.health();
  if (isOk(healthResult)) {
    console.log('\n✓ Health status:', healthResult.value.status);
  }

  await pubsub.stop();
  await pubsub.destroy();

  console.log('\n✓ Example completed');
  console.log('\nUse cases for Google Cloud Pub/Sub:');
  console.log('  - Event-driven microservices');
  console.log('  - Real-time analytics pipelines');
  console.log('  - Asynchronous task processing');
  console.log('  - IoT data ingestion');
  console.log('  - Log aggregation');
  console.log('  - Data streaming and ETL');
}

main().catch(console.error);
