import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { createDynamoDBAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';
import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';

describe('DynamoDB Adapter', () => {
  let container: StartedTestContainer;
  let adapter: ReturnType<typeof createDynamoDBAdapter>;
  let dynamoClient: DynamoDBClient;

  beforeAll(async () => {
    // Start DynamoDB Local container
    container = await new GenericContainer('amazon/dynamodb-local:latest')
      .withExposedPorts(8000)
      .withCommand(['-jar', 'DynamoDBLocal.jar', '-sharedDb', '-inMemory'])
      .withStartupTimeout(60000)
      .start();

    const host = container.getHost();
    const port = container.getMappedPort(8000);

    const config = {
      region: 'us-east-1',
      endpoint: `http://${host}:${port}`,
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    };

    // Create table using AWS SDK directly
    dynamoClient = new DynamoDBClient(config);
    await dynamoClient.send(
      new CreateTableCommand({
        TableName: 'test_table',
        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST',
      })
    );

    adapter = createDynamoDBAdapter();
    const initResult = await adapter.init(config);
    expect(isOk(initResult)).toBe(true);

    const startResult = await adapter.start();
    expect(isOk(startResult)).toBe(true);
  }, 120000);

  afterAll(async () => {
    if (adapter) {
      await adapter.stop();
      await adapter.destroy();
    }
    if (dynamoClient) {
      dynamoClient.destroy();
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

  describe('CRUD Operations', () => {
    test('put and get item', async () => {
      const putResult = await adapter.put('test_table', {
        id: 'test-1',
        name: 'Alice',
        age: 30,
      });
      expect(isOk(putResult)).toBe(true);

      const getResult = await adapter.get('test_table', { id: 'test-1' });
      expect(isOk(getResult)).toBe(true);
      if (isOk(getResult)) {
        expect(getResult.value).toEqual({
          id: 'test-1',
          name: 'Alice',
          age: 30,
        });
      }
    });

    test('delete item', async () => {
      await adapter.put('test_table', { id: 'test-2', name: 'Bob' });

      const deleteResult = await adapter.delete('test_table', { id: 'test-2' });
      expect(isOk(deleteResult)).toBe(true);

      const getResult = await adapter.get('test_table', { id: 'test-2' });
      expect(isOk(getResult)).toBe(true);
      if (isOk(getResult)) {
        expect(getResult.value).toBeNull();
      }
    });

    test('query items', async () => {
      await adapter.put('test_table', { id: 'test-3', name: 'Charlie' });

      const queryResult = await adapter.query('test_table', 'id = :id', {
        ':id': 'test-3',
      });
      expect(isOk(queryResult)).toBe(true);
      if (isOk(queryResult)) {
        expect(queryResult.value.length).toBe(1);
        expect(queryResult.value[0].name).toBe('Charlie');
      }
    });

    test('scan items', async () => {
      const scanResult = await adapter.scan('test_table');
      expect(isOk(scanResult)).toBe(true);
      if (isOk(scanResult)) {
        expect(scanResult.value.length).toBeGreaterThan(0);
      }
    });
  });
});
