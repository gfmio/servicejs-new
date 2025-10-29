import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { createEventBridgeAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('AWS EventBridge Adapter', () => {
  let container: StartedTestContainer;
  let adapter: ReturnType<typeof createEventBridgeAdapter>;

  beforeEach(async () => {
    // Start LocalStack container with EventBridge
    container = await new GenericContainer('localstack/localstack:latest')
      .withExposedPorts(4566)
      .withEnvironment({
        SERVICES: 'events',
        DEBUG: '1',
      })
      .withStartupTimeout(120000)
      .start();

    adapter = createEventBridgeAdapter();
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
        region: 'us-east-1',
        endpoint: `http://${container.getHost()}:${container.getMappedPort(4566)}`,
        credentials: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
        },
      });

      expect(isOk(initResult)).toBe(true);

      const startResult = await adapter.start();
      expect(isOk(startResult)).toBe(true);
    });

    test('health returns healthy after init', async () => {
      await adapter.init({
        region: 'us-east-1',
        endpoint: `http://${container.getHost()}:${container.getMappedPort(4566)}`,
        credentials: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
        },
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

  describe('Event Operations', () => {
    beforeEach(async () => {
      await adapter.init({
        region: 'us-east-1',
        endpoint: `http://${container.getHost()}:${container.getMappedPort(4566)}`,
        credentials: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
        },
      });
      await adapter.start();
    });

    test('putEvents sends single event', async () => {
      const result = await adapter.putEvents([
        {
          source: 'my.application',
          detailType: 'user.created',
          detail: {
            userId: '123',
            email: 'test@example.com',
          },
        },
      ]);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.failedEntryCount).toBe(0);
        expect(result.value.entries.length).toBe(1);
        expect(result.value.entries[0].eventId).toBeDefined();
      }
    });

    test('putEvents sends multiple events', async () => {
      const result = await adapter.putEvents([
        {
          source: 'my.application',
          detailType: 'user.created',
          detail: { userId: '1' },
        },
        {
          source: 'my.application',
          detailType: 'user.updated',
          detail: { userId: '2' },
        },
        {
          source: 'my.application',
          detailType: 'user.deleted',
          detail: { userId: '3' },
        },
      ]);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.failedEntryCount).toBe(0);
        expect(result.value.entries.length).toBe(3);
      }
    });

    test('putEvents with resources', async () => {
      const result = await adapter.putEvents([
        {
          source: 'my.application',
          detailType: 'order.placed',
          detail: { orderId: 'order-123' },
          resources: ['arn:aws:orders:us-east-1:123456789012:order/123'],
        },
      ]);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.failedEntryCount).toBe(0);
      }
    });
  });

  describe('Rule Management', () => {
    beforeEach(async () => {
      await adapter.init({
        region: 'us-east-1',
        endpoint: `http://${container.getHost()}:${container.getMappedPort(4566)}`,
        credentials: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
        },
      });
      await adapter.start();
    });

    test('putRule creates rule', async () => {
      const result = await adapter.putRule({
        name: 'test-rule',
        eventPattern: {
          source: ['my.application'],
          'detail-type': ['user.created'],
        },
        description: 'Test rule for user created events',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.ruleArn).toBeDefined();
        expect(result.value.ruleArn).toContain('test-rule');
      }
    });

    test('listRules returns created rules', async () => {
      await adapter.putRule({
        name: 'rule-1',
        eventPattern: {
          source: ['app1'],
        },
      });

      await adapter.putRule({
        name: 'rule-2',
        eventPattern: {
          source: ['app2'],
        },
      });

      const result = await adapter.listRules();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBeGreaterThanOrEqual(2);
        const ruleNames = result.value.map(r => r.name);
        expect(ruleNames).toContain('rule-1');
        expect(ruleNames).toContain('rule-2');
      }
    });

    test('deleteRule removes rule', async () => {
      await adapter.putRule({
        name: 'temp-rule',
        eventPattern: {
          source: ['temp.app'],
        },
      });

      const deleteResult = await adapter.deleteRule('temp-rule');
      expect(isOk(deleteResult)).toBe(true);

      const listResult = await adapter.listRules();
      if (isOk(listResult)) {
        const ruleNames = listResult.value.map(r => r.name);
        expect(ruleNames).not.toContain('temp-rule');
      }
    });

    test('putRule with disabled state', async () => {
      const result = await adapter.putRule({
        name: 'disabled-rule',
        eventPattern: {
          source: ['my.app'],
        },
        state: 'DISABLED',
      });

      expect(isOk(result)).toBe(true);

      const listResult = await adapter.listRules();
      if (isOk(listResult)) {
        const rule = listResult.value.find(r => r.name === 'disabled-rule');
        expect(rule?.state).toBe('DISABLED');
      }
    });
  });

  describe('Target Management', () => {
    beforeEach(async () => {
      await adapter.init({
        region: 'us-east-1',
        endpoint: `http://${container.getHost()}:${container.getMappedPort(4566)}`,
        credentials: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
        },
      });
      await adapter.start();

      // Create a rule first
      await adapter.putRule({
        name: 'target-test-rule',
        eventPattern: {
          source: ['my.application'],
        },
      });
    });

    test('putTargets adds targets to rule', async () => {
      const result = await adapter.putTargets('target-test-rule', [
        {
          id: '1',
          arn: 'arn:aws:lambda:us-east-1:123456789012:function:MyFunction',
        },
      ]);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.failedEntryCount).toBe(0);
      }
    });

    test('putTargets adds multiple targets', async () => {
      const result = await adapter.putTargets('target-test-rule', [
        {
          id: '1',
          arn: 'arn:aws:lambda:us-east-1:123456789012:function:Function1',
        },
        {
          id: '2',
          arn: 'arn:aws:lambda:us-east-1:123456789012:function:Function2',
        },
      ]);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.failedEntryCount).toBe(0);
      }
    });

    test('removeTargets removes targets from rule', async () => {
      // Add targets first
      await adapter.putTargets('target-test-rule', [
        {
          id: '1',
          arn: 'arn:aws:lambda:us-east-1:123456789012:function:Function1',
        },
        {
          id: '2',
          arn: 'arn:aws:lambda:us-east-1:123456789012:function:Function2',
        },
      ]);

      // Remove one target
      const result = await adapter.removeTargets('target-test-rule', ['1']);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.failedEntryCount).toBe(0);
      }
    });
  });

  describe('Event Bus Info', () => {
    beforeEach(async () => {
      await adapter.init({
        region: 'us-east-1',
        endpoint: `http://${container.getHost()}:${container.getMappedPort(4566)}`,
        credentials: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
        },
      });
      await adapter.start();
    });

    test('describeEventBus returns event bus info', async () => {
      const result = await adapter.describeEventBus();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.name).toBeDefined();
        expect(result.value.arn).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    test('operations fail when not initialized', async () => {
      const putResult = await adapter.putEvents([
        {
          source: 'test',
          detailType: 'test',
          detail: {},
        },
      ]);
      expect(isErr(putResult)).toBe(true);

      const ruleResult = await adapter.putRule({
        name: 'test',
        eventPattern: {},
      });
      expect(isErr(ruleResult)).toBe(true);

      const listResult = await adapter.listRules();
      expect(isErr(listResult)).toBe(true);
    });
  });

  describe('Event Pattern Matching', () => {
    beforeEach(async () => {
      await adapter.init({
        region: 'us-east-1',
        endpoint: `http://${container.getHost()}:${container.getMappedPort(4566)}`,
        credentials: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
        },
      });
      await adapter.start();
    });

    test('complex event pattern with multiple conditions', async () => {
      const result = await adapter.putRule({
        name: 'complex-rule',
        eventPattern: {
          source: ['my.application', 'my.other.app'],
          'detail-type': ['user.created', 'user.updated'],
          detail: {
            status: ['active'],
            tier: ['premium', 'enterprise'],
          },
        },
        description: 'Complex pattern matching rule',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.ruleArn).toBeDefined();
      }
    });
  });
});
