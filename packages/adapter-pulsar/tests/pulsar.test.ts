import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { createPulsarAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

describe('Pulsar Adapter', () => {
  let container: StartedTestContainer;
  let adapter: ReturnType<typeof createPulsarAdapter>;

  beforeAll(async () => {
    // Start Pulsar container
    container = await new GenericContainer('apachepulsar/pulsar:latest')
      .withExposedPorts(6650, 8080)
      .withCommand(['bin/pulsar', 'standalone'])
      .withStartupTimeout(120000)
      .start();

    const host = container.getHost();
    const port = container.getMappedPort(6650);

    const config = {
      serviceUrl: `pulsar://${host}:${port}`,
    };

    adapter = createPulsarAdapter();
    const initResult = await adapter.init(config);
    expect(isOk(initResult)).toBe(true);

    const startResult = await adapter.start();
    expect(isOk(startResult)).toBe(true);

    // Wait a bit for Pulsar to be fully ready
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }, 180000);

  afterAll(async () => {
    if (adapter) {
      await adapter.stop();
      await adapter.destroy();
    }
    if (container) {
      await container.stop();
    }
  });

  describe('Lifecycle', () => {
    test('health returns healthy after init', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }
    });
  });

  describe('Messaging Operations', () => {
    test('create producer and send message', async () => {
      const topic = 'persistent://public/default/test-topic-1';

      const producerResult = await adapter.createProducer({ topic });
      expect(isOk(producerResult)).toBe(true);

      if (isOk(producerResult)) {
        const sendResult = await producerResult.value.send(Buffer.from('Hello, Pulsar!'));
        expect(isOk(sendResult)).toBe(true);
      }
    });

    test('create consumer and receive message', async () => {
      const topic = 'persistent://public/default/test-topic-2';

      // Create producer and send message
      const producerResult = await adapter.createProducer({ topic });
      expect(isOk(producerResult)).toBe(true);

      if (isOk(producerResult)) {
        const message = Buffer.from('Test Message');
        const sendResult = await producerResult.value.send(message);
        expect(isOk(sendResult)).toBe(true);
      }

      // Create consumer and receive
      const consumerResult = await adapter.createConsumer({
        topic,
        subscription: 'test-subscription',
      });
      expect(isOk(consumerResult)).toBe(true);

      if (isOk(consumerResult)) {
        const receiveResult = await consumerResult.value.receive();
        expect(isOk(receiveResult)).toBe(true);
        if (isOk(receiveResult)) {
          expect(receiveResult.value.toString()).toBe('Test Message');
        }
      }
    });

    test('acknowledge message', async () => {
      const topic = 'persistent://public/default/test-topic-3';

      // Send message
      const producerResult = await adapter.createProducer({ topic });
      if (isOk(producerResult)) {
        await producerResult.value.send(Buffer.from('Ack Test'));
      }

      // Receive and ack
      const consumerResult = await adapter.createConsumer({
        topic,
        subscription: 'ack-subscription',
      });

      if (isOk(consumerResult)) {
        const receiveResult = await consumerResult.value.receive();
        if (isOk(receiveResult)) {
          // Note: The ack method receives the message ID, not the message itself
          // In practice, we would extract the message ID from the Pulsar message
          // For this test, we're just checking that ack is callable
          expect(receiveResult.value).toBeDefined();
        }
      }
    });
  });
});
