/**
 * Basic Apache Pulsar adapter usage example
 */

import { createPulsarAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createPulsarAdapter();

  // Initialize with connection config
  const initResult = await adapter.init({
    serviceUrl: 'pulsar://localhost:6650',
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

  // Create producer
  const producerResult = await adapter.createProducer({
    topic: 'persistent://public/default/my-topic',
  });

  if (!isOk(producerResult)) {
    console.error('Failed to create producer:', producerResult.error);
    return;
  }

  console.log('Producer created');

  // Send message
  const sendResult = await adapter.send({
    topic: 'persistent://public/default/my-topic',
    data: Buffer.from('Hello, Pulsar!'),
  });

  if (isOk(sendResult)) {
    console.log('Message sent, ID:', sendResult.value.messageId);
  }

  // Send with properties
  const sendWithPropsResult = await adapter.send({
    topic: 'persistent://public/default/my-topic',
    data: Buffer.from(JSON.stringify({ user: 'john', action: 'login' })),
    properties: {
      contentType: 'application/json',
      timestamp: new Date().toISOString(),
    },
  });

  if (isOk(sendWithPropsResult)) {
    console.log('Message with properties sent');
  }

  // Create consumer
  const consumerResult = await adapter.createConsumer({
    topic: 'persistent://public/default/my-topic',
    subscription: 'my-subscription',
  });

  if (!isOk(consumerResult)) {
    console.error('Failed to create consumer:', consumerResult.error);
    return;
  }

  console.log('Consumer created');

  // Receive messages
  let messageCount = 0;
  const maxMessages = 2;

  while (messageCount < maxMessages) {
    const receiveResult = await adapter.receive({
      topic: 'persistent://public/default/my-topic',
      subscription: 'my-subscription',
    });

    if (isOk(receiveResult)) {
      const msg = receiveResult.value;
      console.log('Received message:', msg.data.toString());
      console.log('Properties:', msg.properties);

      // Acknowledge message
      const ackResult = await adapter.acknowledge({
        topic: 'persistent://public/default/my-topic',
        subscription: 'my-subscription',
        messageId: msg.messageId,
      });

      if (isOk(ackResult)) {
        console.log('Message acknowledged');
      }

      messageCount++;
    }
  }

  // Close producer
  const closeProducerResult = await adapter.closeProducer({
    topic: 'persistent://public/default/my-topic',
  });

  if (isOk(closeProducerResult)) {
    console.log('Producer closed');
  }

  // Close consumer
  const closeConsumerResult = await adapter.closeConsumer({
    topic: 'persistent://public/default/my-topic',
    subscription: 'my-subscription',
  });

  if (isOk(closeConsumerResult)) {
    console.log('Consumer closed');
  }

  // Cleanup
  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
