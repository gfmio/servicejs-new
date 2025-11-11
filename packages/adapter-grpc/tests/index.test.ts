import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { createGRPCClient, createGRPCServer, fromArray, toArray, type GRPCServer } from '../src/index';
import { isOk } from '@servicejs/result';

describe('gRPC Adapter', () => {
  const TEST_PORT = 15051;
  let server: GRPCServer;

  // Service for testing
  const calculatorService = {
    Add: async (req: { a: number; b: number }) => ({ result: req.a + req.b }),
    Subtract: async (req: { a: number; b: number }) => ({ result: req.a - req.b }),
    Multiply: async (req: { a: number; b: number }) => ({ result: req.a * req.b }),
    Divide: async (req: { a: number; b: number }) => {
      if (req.b === 0) throw new Error('Division by zero');
      return { result: req.a / req.b };
    },
    StreamNumbers: async function* (req: { count: number }) {
      for (let i = 1; i <= req.count; i++) {
        yield { number: i };
      }
    },
  };

  beforeAll(async () => {
    server = createGRPCServer({
      address: `0.0.0.0:${TEST_PORT}`,
      service: calculatorService,
      logging: false,
    });

    const result = await server.listen();
    expect(isOk(result)).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('Unary calls', () => {
    test('successfully makes unary call - Add', async () => {
      const client = createGRPCClient({
        address: `localhost:${TEST_PORT}`,
      });

      const result = await client.unary('Add', { a: 10, b: 5 });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.result).toBe(15);
      }

      await client.close();
    });

    test('successfully makes unary call - Subtract', async () => {
      const client = createGRPCClient({
        address: `localhost:${TEST_PORT}`,
      });

      const result = await client.unary('Subtract', { a: 20, b: 8 });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.result).toBe(12);
      }

      await client.close();
    });

    test('successfully makes unary call - Multiply', async () => {
      const client = createGRPCClient({
        address: `localhost:${TEST_PORT}`,
      });

      const result = await client.unary('Multiply', { a: 6, b: 7 });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.result).toBe(42);
      }

      await client.close();
    });

    test('handles errors in unary calls', async () => {
      const client = createGRPCClient({
        address: `localhost:${TEST_PORT}`,
      });

      const result = await client.unary('Divide', { a: 10, b: 0 });

      expect(isOk(result)).toBe(false);
      if (!isOk(result)) {
        expect(result.error.message).toBe('Division by zero');
      }

      await client.close();
    });

    test('handles non-existent methods', async () => {
      const client = createGRPCClient({
        address: `localhost:${TEST_PORT}`,
      });

      const result = await client.unary('NonExistent', { data: 'test' });

      expect(isOk(result)).toBe(false);
      if (!isOk(result)) {
        expect(result.error.message).toContain('Method NonExistent not found');
      }

      await client.close();
    });

    test('handles concurrent unary calls', async () => {
      const client = createGRPCClient({
        address: `localhost:${TEST_PORT}`,
      });

      const results = await Promise.all([
        client.unary('Add', { a: 1, b: 2 }),
        client.unary('Subtract', { a: 5, b: 3 }),
        client.unary('Multiply', { a: 4, b: 5 }),
      ]);

      expect(results.every(isOk)).toBe(true);
      if (results.every(isOk)) {
        expect(results[0].value.result).toBe(3);
        expect(results[1].value.result).toBe(2);
        expect(results[2].value.result).toBe(20);
      }

      await client.close();
    });
  });

  describe('Server streaming', () => {
    test('successfully streams multiple items', async () => {
      const client = createGRPCClient({
        address: `localhost:${TEST_PORT}`,
      });

      const results = [];
      for await (const result of client.serverStream('StreamNumbers', { count: 5 })) {
        if (isOk(result)) {
          results.push(result.value.number);
        }
      }

      expect(results).toEqual([1, 2, 3, 4, 5]);

      await client.close();
    });

    test('handles empty stream', async () => {
      const client = createGRPCClient({
        address: `localhost:${TEST_PORT}`,
      });

      const results = [];
      for await (const result of client.serverStream('StreamNumbers', { count: 0 })) {
        if (isOk(result)) {
          results.push(result.value);
        }
      }

      expect(results).toEqual([]);

      await client.close();
    });

    test('handles large stream', async () => {
      const client = createGRPCClient({
        address: `localhost:${TEST_PORT}`,
      });

      const results = [];
      for await (const result of client.serverStream('StreamNumbers', { count: 10 })) {
        if (isOk(result)) {
          results.push(result.value.number);
        }
      }

      expect(results.length).toBe(10);
      expect(results[0]).toBe(1);
      expect(results[9]).toBe(10);

      await client.close();
    });
  });

  describe('Connection management', () => {
    test('reports connection status', async () => {
      const client = createGRPCClient({
        address: `localhost:${TEST_PORT}`,
      });

      expect(client.isConnected()).toBe(false);

      await client.unary('Add', { a: 1, b: 2 });
      expect(client.isConnected()).toBe(true);

      await client.close();
      expect(client.isConnected()).toBe(false);
    });

    test('closes connection successfully', async () => {
      const client = createGRPCClient({
        address: `localhost:${TEST_PORT}`,
      });

      await client.unary('Add', { a: 1, b: 2 });

      const result = await client.close();
      expect(isOk(result)).toBe(true);
    });
  });

  describe('Server management', () => {
    test('tracks connection count', async () => {
      const testServer = createGRPCServer({
        address: '0.0.0.0:15052',
        service: calculatorService,
      });

      await testServer.listen();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(testServer.getConnectionCount()).toBe(0);

      const client = createGRPCClient({
        address: 'localhost:15052',
      });

      await client.unary('Add', { a: 1, b: 2 });
      expect(testServer.getConnectionCount()).toBe(1);

      await client.close();
      await testServer.close();
    });
  });

  describe('Helper functions', () => {
    test('fromArray creates async iterable', async () => {
      const items = [1, 2, 3, 4, 5];
      const iterable = fromArray(items);

      const results = [];
      for await (const item of iterable) {
        results.push(item);
      }

      expect(results).toEqual(items);
    });

    test('toArray collects async iterable', async () => {
      const items = [1, 2, 3, 4, 5];
      const iterable = fromArray(items);

      const results = await toArray(iterable);

      expect(results).toEqual(items);
    });
  });
});
