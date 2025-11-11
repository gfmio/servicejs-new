import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { createThriftClient, createThriftServer, wrapThriftService, type ThriftServer } from '../src/index';
import { isOk } from '@servicejs/result';

describe('Thrift Adapter', () => {
  const TEST_PORT = 19090;
  let server: ThriftServer;

  // Calculator service for testing
  const calculatorService = {
    add: async (a: number, b: number) => a + b,
    subtract: async (a: number, b: number) => a - b,
    multiply: async (a: number, b: number) => a * b,
    divide: async (a: number, b: number) => {
      if (b === 0) throw new Error('Division by zero');
      return a / b;
    },
    ping: () => 'pong',
  };

  beforeAll(async () => {
    server = createThriftServer({
      port: TEST_PORT,
      service: calculatorService,
      logging: false,
    });

    const result = await server.listen();
    expect(isOk(result)).toBe(true);

    // Give server time to start
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('createThriftClient', () => {
    test('successfully creates a client', () => {
      const client = createThriftClient({
        host: 'localhost',
        port: TEST_PORT,
      });

      expect(client).toBeDefined();
      expect(client.call).toBeDefined();
      expect(client.close).toBeDefined();
      expect(client.isConnected).toBeDefined();
    });

    test('makes successful RPC calls - add', async () => {
      const client = createThriftClient({
        host: 'localhost',
        port: TEST_PORT,
      });

      const result = await client.call('add', 10, 5);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(15);
      }

      await client.close();
    });

    test('makes successful RPC calls - subtract', async () => {
      const client = createThriftClient({
        host: 'localhost',
        port: TEST_PORT,
      });

      const result = await client.call('subtract', 20, 8);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(12);
      }

      await client.close();
    });

    test('makes successful RPC calls - multiply', async () => {
      const client = createThriftClient({
        host: 'localhost',
        port: TEST_PORT,
      });

      const result = await client.call('multiply', 6, 7);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(42);
      }

      await client.close();
    });

    test('makes successful RPC calls - divide', async () => {
      const client = createThriftClient({
        host: 'localhost',
        port: TEST_PORT,
      });

      const result = await client.call('divide', 100, 4);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(25);
      }

      await client.close();
    });

    test('handles RPC errors - division by zero', async () => {
      const client = createThriftClient({
        host: 'localhost',
        port: TEST_PORT,
      });

      const result = await client.call('divide', 10, 0);

      expect(isOk(result)).toBe(false);
      if (!isOk(result)) {
        expect(result.error.message).toBe('Division by zero');
      }

      await client.close();
    });

    test('handles non-existent methods', async () => {
      const client = createThriftClient({
        host: 'localhost',
        port: TEST_PORT,
      });

      const result = await client.call('nonExistent', 1, 2);

      expect(isOk(result)).toBe(false);
      if (!isOk(result)) {
        expect(result.error.message).toContain('Method nonExistent not found');
      }

      await client.close();
    });

    test('supports synchronous methods', async () => {
      const client = createThriftClient({
        host: 'localhost',
        port: TEST_PORT,
      });

      const result = await client.call('ping');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe('pong');
      }

      await client.close();
    });

    test('supports timeout configuration', async () => {
      const client = createThriftClient({
        host: 'localhost',
        port: TEST_PORT,
        timeout: 100,
      });

      // Make a normal call that should succeed
      const result = await client.call('add', 1, 2);
      expect(isOk(result)).toBe(true);

      await client.close();
    });

    test('closes connection successfully', async () => {
      const client = createThriftClient({
        host: 'localhost',
        port: TEST_PORT,
      });

      // Make a call first
      await client.call('ping');

      const result = await client.close();
      expect(isOk(result)).toBe(true);
    });

    test('reports connection status', async () => {
      const client = createThriftClient({
        host: 'localhost',
        port: TEST_PORT,
      });

      // Not connected initially
      expect(client.isConnected()).toBe(false);

      // Connect by making a call
      await client.call('ping');
      expect(client.isConnected()).toBe(true);

      // Disconnect
      await client.close();
      expect(client.isConnected()).toBe(false);
    });

    test('handles multiple concurrent calls', async () => {
      const client = createThriftClient({
        host: 'localhost',
        port: TEST_PORT,
      });

      const results = await Promise.all([
        client.call('add', 1, 2),
        client.call('subtract', 5, 3),
        client.call('multiply', 4, 5),
        client.call('divide', 10, 2),
      ]);

      expect(results.every(isOk)).toBe(true);
      if (results.every(isOk)) {
        expect(results[0].value).toBe(3);
        expect(results[1].value).toBe(2);
        expect(results[2].value).toBe(20);
        expect(results[3].value).toBe(5);
      }

      await client.close();
    });
  });

  describe('createThriftServer', () => {
    test('creates server successfully', () => {
      const testServer = createThriftServer({
        port: 19091,
        service: calculatorService,
      });

      expect(testServer).toBeDefined();
      expect(testServer.listen).toBeDefined();
      expect(testServer.close).toBeDefined();
      expect(testServer.getConnectionCount).toBeDefined();
    });

    test('tracks connection count', async () => {
      const testServer = createThriftServer({
        port: 19092,
        service: calculatorService,
      });

      await testServer.listen();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(testServer.getConnectionCount()).toBe(0);

      const client = createThriftClient({
        host: 'localhost',
        port: 19092,
      });

      await client.call('ping');
      expect(testServer.getConnectionCount()).toBe(1);

      await client.close();
      await testServer.close();
    });

    test('handles service errors gracefully', async () => {
      const testServer = createThriftServer({
        port: 19093,
        service: {
          errorMethod: async () => {
            throw new Error('Test error');
          },
        },
      });

      await testServer.listen();
      await new Promise((resolve) => setTimeout(resolve, 50));

      const client = createThriftClient({
        host: 'localhost',
        port: 19093,
      });

      const result = await client.call('errorMethod');
      expect(isOk(result)).toBe(false);
      if (!isOk(result)) {
        expect(result.error.message).toBe('Test error');
      }

      await client.close();
      await testServer.close();
    });
  });

  describe('wrapThriftService', () => {
    test('wraps service methods', async () => {
      const service = {
        add: async (a: number, b: number) => a + b,
        subtract: (a: number, b: number) => a - b,
      };

      const wrapped = wrapThriftService(service);

      const sum = await wrapped.add(1, 2);
      expect(sum).toBe(3);

      const diff = await wrapped.subtract(5, 3);
      expect(diff).toBe(2);
    });

    test('preserves error throwing', async () => {
      const service = {
        throwError: async () => {
          throw new Error('Test error');
        },
      };

      const wrapped = wrapThriftService(service);

      await expect(wrapped.throwError()).rejects.toThrow('Test error');
    });
  });

  describe('protocol support', () => {
    test('supports json protocol', async () => {
      const testServer = createThriftServer({
        port: 19094,
        protocol: 'json',
        service: calculatorService,
      });

      await testServer.listen();
      await new Promise((resolve) => setTimeout(resolve, 50));

      const client = createThriftClient({
        host: 'localhost',
        port: 19094,
        protocol: 'json',
      });

      const result = await client.call('add', 1, 2);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(3);
      }

      await client.close();
      await testServer.close();
    });

    test('supports binary protocol', async () => {
      const testServer = createThriftServer({
        port: 19095,
        protocol: 'binary',
        service: calculatorService,
      });

      await testServer.listen();
      await new Promise((resolve) => setTimeout(resolve, 50));

      const client = createThriftClient({
        host: 'localhost',
        port: 19095,
        protocol: 'binary',
      });

      const result = await client.call('add', 1, 2);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(3);
      }

      await client.close();
      await testServer.close();
    });
  });

  describe('transport support', () => {
    test('supports buffered transport', async () => {
      const testServer = createThriftServer({
        port: 19096,
        transport: 'buffered',
        service: calculatorService,
      });

      await testServer.listen();
      await new Promise((resolve) => setTimeout(resolve, 50));

      const client = createThriftClient({
        host: 'localhost',
        port: 19096,
        transport: 'buffered',
      });

      const result = await client.call('add', 1, 2);
      expect(isOk(result)).toBe(true);

      await client.close();
      await testServer.close();
    });

    test('supports framed transport', async () => {
      const testServer = createThriftServer({
        port: 19097,
        transport: 'framed',
        service: calculatorService,
      });

      await testServer.listen();
      await new Promise((resolve) => setTimeout(resolve, 50));

      const client = createThriftClient({
        host: 'localhost',
        port: 19097,
        transport: 'framed',
      });

      const result = await client.call('add', 1, 2);
      expect(isOk(result)).toBe(true);

      await client.close();
      await testServer.close();
    });
  });
});
