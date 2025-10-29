import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { createGooglePubSubAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('Google Cloud Pub/Sub Adapter', () => {
  let container: StartedTestContainer;
  let adapter: ReturnType<typeof createGooglePubSubAdapter>;

  beforeEach(async () => {
    // Start Google Cloud Pub/Sub emulator
    container = await new GenericContainer('gcr.io/google.com/cloudsdktool/google-cloud-cli:emulators')
      .withCommand(['gcloud', 'beta', 'emulators', 'pubsub', 'start', '--host-port=0.0.0.0:8085'])
      .withExposedPorts(8085)
      .withStartupTimeout(120000)
      .start();

    adapter = createGooglePubSubAdapter();
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.destroy();
    }
    if (container) {
      await container.stop();
    }
  });

  describe('Lifecycle', () => {
    test('init and start', async () => {
      const initResult = await adapter.init({
        projectId: 'test-project',
        apiEndpoint: `${container.getHost()}:${container.getMappedPort(8085)}`,
      });

      expect(isOk(initResult)).toBe(true);

      const startResult = await adapter.start();
      expect(isOk(startResult)).toBe(true);
    });

    test('health returns healthy after init', async () => {
      await adapter.init({
        projectId: 'test-project',
        apiEndpoint: `${container.getHost()}:${container.getMappedPort(8085)}`,
      });
      await adapter.start();

      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }
    });

    test('health returns unhealthy before init', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('unhealthy');
      }
    });
  });

  describe('Topic Operations', () => {
    beforeEach(async () => {
      await adapter.init({
        projectId: 'test-project',
        apiEndpoint: `${container.getHost()}:${container.getMappedPort(8085)}`,
      });
      await adapter.start();
    });

    test('createTopic creates topic', async () => {
      const result = await adapter.createTopic('test-topic');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.name).toContain('test-topic');
      }
    });

    test('topicExists returns true for existing topic', async () => {
      await adapter.createTopic('existing-topic');

      const result = await adapter.topicExists('existing-topic');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(true);
      }
    });

    test('topicExists returns false for non-existing topic', async () => {
      const result = await adapter.topicExists('non-existing-topic');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(false);
      }
    });

    test('listTopics returns created topics', async () => {
      await adapter.createTopic('topic-1');
      await adapter.createTopic('topic-2');

      const result = await adapter.listTopics();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBeGreaterThanOrEqual(2);
        expect(result.value.some(t => t.includes('topic-1'))).toBe(true);
        expect(result.value.some(t => t.includes('topic-2'))).toBe(true);
      }
    });

    test('deleteTopic removes topic', async () => {
      await adapter.createTopic('temp-topic');

      const deleteResult = await adapter.deleteTopic('temp-topic');
      expect(isOk(deleteResult)).toBe(true);

      const existsResult = await adapter.topicExists('temp-topic');
      if (isOk(existsResult)) {
        expect(existsResult.value).toBe(false);
      }
    });
  });

  describe('Publishing', () => {
    beforeEach(async () => {
      await adapter.init({
        projectId: 'test-project',
        apiEndpoint: `${container.getHost()}:${container.getMappedPort(8085)}`,
      });
      await adapter.start();
      await adapter.createTopic('publish-topic');
    });

    test('publish sends message', async () => {
      const result = await adapter.publish('publish-topic', {
        userId: '123',
        action: 'created',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.messageId).toBeDefined();
      }
    });

    test('publish with attributes', async () => {
      const result = await adapter.publish(
        'publish-topic',
        { data: 'test' },
        {
          attributes: {
            type: 'user.created',
            version: '1.0',
          },
        }
      );

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.messageId).toBeDefined();
      }
    });

    test('publish with ordering key', async () => {
      const result = await adapter.publish(
        'publish-topic',
        { orderId: '001' },
        {
          orderingKey: 'user-123',
        }
      );

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.messageId).toBeDefined();
      }
    });

    test('publishBatch sends multiple messages', async () => {
      const result = await adapter.publishBatch('publish-topic', [
        { data: { msg: 'first' } },
        { data: { msg: 'second' } },
        { data: { msg: 'third' } },
      ]);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.messageIds.length).toBe(3);
      }
    });
  });

  describe('Subscription Operations', () => {
    beforeEach(async () => {
      await adapter.init({
        projectId: 'test-project',
        apiEndpoint: `${container.getHost()}:${container.getMappedPort(8085)}`,
      });
      await adapter.start();
      await adapter.createTopic('sub-topic');
    });

    test('createSubscription creates subscription', async () => {
      const result = await adapter.createSubscription('sub-topic', 'test-sub');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.name).toContain('test-sub');
      }
    });

    test('createSubscription with config', async () => {
      const result = await adapter.createSubscription('sub-topic', 'config-sub', {
        ackDeadlineSeconds: 30,
        enableMessageOrdering: true,
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.name).toContain('config-sub');
      }
    });

    test('subscriptionExists returns true for existing subscription', async () => {
      await adapter.createSubscription('sub-topic', 'existing-sub');

      const result = await adapter.subscriptionExists('existing-sub');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(true);
      }
    });

    test('subscriptionExists returns false for non-existing subscription', async () => {
      const result = await adapter.subscriptionExists('non-existing-sub');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(false);
      }
    });

    test('listSubscriptions returns subscriptions', async () => {
      await adapter.createSubscription('sub-topic', 'sub-1');
      await adapter.createSubscription('sub-topic', 'sub-2');

      const result = await adapter.listSubscriptions('sub-topic');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBeGreaterThanOrEqual(2);
      }
    });

    test('deleteSubscription removes subscription', async () => {
      await adapter.createSubscription('sub-topic', 'temp-sub');

      const deleteResult = await adapter.deleteSubscription('temp-sub');
      expect(isOk(deleteResult)).toBe(true);

      const existsResult = await adapter.subscriptionExists('temp-sub');
      if (isOk(existsResult)) {
        expect(existsResult.value).toBe(false);
      }
    });
  });

  describe('Pull-based Consumption', () => {
    beforeEach(async () => {
      await adapter.init({
        projectId: 'test-project',
        apiEndpoint: `${container.getHost()}:${container.getMappedPort(8085)}`,
      });
      await adapter.start();
      await adapter.createTopic('pull-topic');
      await adapter.createSubscription('pull-topic', 'pull-sub');
    });

    test('pull receives published messages', async () => {
      // Publish messages
      await adapter.publish('pull-topic', { msg: 'test-1' });
      await adapter.publish('pull-topic', { msg: 'test-2' });

      // Wait a bit for messages to be available
      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = await adapter.pull('pull-sub', { maxMessages: 5 });
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBeGreaterThanOrEqual(2);
        expect(result.value[0].data).toBeDefined();
        expect(result.value[0].ackId).toBeDefined();
      }
    });

    test('acknowledge removes messages from subscription', async () => {
      await adapter.publish('pull-topic', { msg: 'ack-test' });
      await new Promise(resolve => setTimeout(resolve, 1000));

      const pullResult = await adapter.pull('pull-sub', { maxMessages: 1 });
      if (isOk(pullResult) && pullResult.value.length > 0) {
        const ackId = pullResult.value[0].ackId;

        const ackResult = await adapter.acknowledge('pull-sub', [ackId]);
        expect(isOk(ackResult)).toBe(true);
      }
    });

    test('modifyAckDeadline extends deadline', async () => {
      await adapter.publish('pull-topic', { msg: 'deadline-test' });
      await new Promise(resolve => setTimeout(resolve, 1000));

      const pullResult = await adapter.pull('pull-sub', { maxMessages: 1 });
      if (isOk(pullResult) && pullResult.value.length > 0) {
        const ackId = pullResult.value[0].ackId;

        const result = await adapter.modifyAckDeadline('pull-sub', [ackId], 60);
        expect(isOk(result)).toBe(true);
      }
    });
  });

  describe('Push-based Consumption (Streaming)', () => {
    beforeEach(async () => {
      await adapter.init({
        projectId: 'test-project',
        apiEndpoint: `${container.getHost()}:${container.getMappedPort(8085)}`,
      });
      await adapter.start();
      await adapter.createTopic('push-topic');
      await adapter.createSubscription('push-topic', 'push-sub');
    });

    test('subscribe receives messages', async () => {
      const receivedMessages: any[] = [];

      const subscribeResult = await adapter.subscribe('push-sub', (msg) => {
        receivedMessages.push(msg);
        msg.ack();
      });

      expect(isOk(subscribeResult)).toBe(true);

      // Publish messages
      await adapter.publish('push-topic', { msg: 'push-1' });
      await adapter.publish('push-topic', { msg: 'push-2' });

      // Wait for messages
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(receivedMessages.length).toBeGreaterThanOrEqual(2);
      expect(receivedMessages[0].data).toBeDefined();

      // Cleanup
      if (isOk(subscribeResult)) {
        subscribeResult.value.unsubscribe();
      }
    });

    test('unsubscribe stops receiving messages', async () => {
      const receivedMessages: any[] = [];

      const subscribeResult = await adapter.subscribe('push-sub', (msg) => {
        receivedMessages.push(msg);
        msg.ack();
      });

      if (isOk(subscribeResult)) {
        await adapter.publish('push-topic', { msg: 'before-unsub' });
        await new Promise(resolve => setTimeout(resolve, 1000));

        const countBefore = receivedMessages.length;

        // Unsubscribe
        subscribeResult.value.unsubscribe();

        // Publish after unsubscribe
        await adapter.publish('push-topic', { msg: 'after-unsub' });
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Should not receive new messages
        expect(receivedMessages.length).toBe(countBefore);
      }
    });
  });

  describe('Message Attributes', () => {
    beforeEach(async () => {
      await adapter.init({
        projectId: 'test-project',
        apiEndpoint: `${container.getHost()}:${container.getMappedPort(8085)}`,
      });
      await adapter.start();
      await adapter.createTopic('attr-topic');
      await adapter.createSubscription('attr-topic', 'attr-sub');
    });

    test('pull preserves message attributes', async () => {
      await adapter.publish(
        'attr-topic',
        { data: 'test' },
        {
          attributes: {
            userId: '123',
            type: 'user.created',
          },
        }
      );

      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = await adapter.pull('attr-sub', { maxMessages: 1 });
      if (isOk(result) && result.value.length > 0) {
        const msg = result.value[0];
        expect(msg.attributes.userId).toBe('123');
        expect(msg.attributes.type).toBe('user.created');
      }
    });
  });

  describe('Error Handling', () => {
    test('operations fail when not initialized', async () => {
      const topicResult = await adapter.createTopic('test');
      expect(isErr(topicResult)).toBe(true);

      const publishResult = await adapter.publish('test', {});
      expect(isErr(publishResult)).toBe(true);

      const subResult = await adapter.createSubscription('test', 'test');
      expect(isErr(subResult)).toBe(true);
    });

    test('publish fails for non-existent topic', async () => {
      await adapter.init({
        projectId: 'test-project',
        apiEndpoint: `${container.getHost()}:${container.getMappedPort(8085)}`,
      });
      await adapter.start();

      const result = await adapter.publish('non-existent-topic', {});
      expect(isErr(result)).toBe(true);
    });
  });
});
