/**
 * Tests for RPC handler (client and service)
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { createRPCClient, createRPCService } from '../src/rpc-handler';
import { isOk, isErr } from '@servicejs/result';

interface TestService {
  add(a: number, b: number): Promise<number>;
  concat(a: string, b: string): Promise<string>;
  getUser(id: string): Promise<{ id: string; name: string } | null>;
  throwError(): Promise<void>;
}

const testService: TestService = {
  async add(a: number, b: number) {
    return a + b;
  },

  async concat(a: string, b: string) {
    return a + b;
  },

  async getUser(id: string) {
    if (id === '123') {
      return { id: '123', name: 'Test User' };
    }
    return null;
  },

  async throwError() {
    throw new Error('Service error');
  },
};

// Mock Fetcher that calls the service directly
class MockFetcher implements Fetcher {
  constructor(private rpcService: ReturnType<typeof createRPCService<TestService>>) {}

  async fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    const request = typeof input === 'string' ? new Request(input, init) : input;
    return this.rpcService.handleRPC(request, {}, {} as ExecutionContext);
  }
}

describe('RPC Handler', () => {
  let rpcService: ReturnType<typeof createRPCService<TestService>>;
  let fetcher: MockFetcher;
  let rpcClient: ReturnType<typeof createRPCClient<TestService>>;

  beforeEach(() => {
    rpcService = createRPCService(testService);
    fetcher = new MockFetcher(rpcService);
    rpcClient = createRPCClient<TestService>(fetcher);
  });

  describe('RPC Client', () => {
    test('calls service method with correct arguments', async () => {
      const result = await rpcClient.call('add', 5, 3);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(8);
      }
    });

    test('handles string concatenation', async () => {
      const result = await rpcClient.call('concat', 'Hello, ', 'World!');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe('Hello, World!');
      }
    });

    test('handles complex return types', async () => {
      const result = await rpcClient.call('getUser', '123');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual({ id: '123', name: 'Test User' });
      }
    });

    test('handles null return values', async () => {
      const result = await rpcClient.call('getUser', '999');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeNull();
      }
    });

    test('handles service errors', async () => {
      const result = await rpcClient.call('throwError');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('Service error');
      }
    });

    test('handles multiple calls sequentially', async () => {
      const result1 = await rpcClient.call('add', 1, 2);
      const result2 = await rpcClient.call('add', 3, 4);
      const result3 = await rpcClient.call('add', 5, 6);

      expect(isOk(result1)).toBe(true);
      expect(isOk(result2)).toBe(true);
      expect(isOk(result3)).toBe(true);

      if (isOk(result1) && isOk(result2) && isOk(result3)) {
        expect(result1.value).toBe(3);
        expect(result2.value).toBe(7);
        expect(result3.value).toBe(11);
      }
    });

    test('handles parallel calls', async () => {
      const [result1, result2, result3] = await Promise.all([
        rpcClient.call('add', 1, 2),
        rpcClient.call('concat', 'A', 'B'),
        rpcClient.call('getUser', '123'),
      ]);

      expect(isOk(result1)).toBe(true);
      expect(isOk(result2)).toBe(true);
      expect(isOk(result3)).toBe(true);

      if (isOk(result1)) expect(result1.value).toBe(3);
      if (isOk(result2)) expect(result2.value).toBe('AB');
      if (isOk(result3)) expect(result3.value).toEqual({ id: '123', name: 'Test User' });
    });
  });

  describe('RPC Service', () => {
    test('executes service method and returns result', async () => {
      const request = new Request('https://rpc', {
        method: 'POST',
        body: JSON.stringify({
          method: 'add',
          args: [10, 20],
        }),
      });

      const response = await rpcService.handleRPC(request, {}, {} as ExecutionContext);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toBe(30);
    });

    test('handles method with string arguments', async () => {
      const request = new Request('https://rpc', {
        method: 'POST',
        body: JSON.stringify({
          method: 'concat',
          args: ['Foo', 'Bar'],
        }),
      });

      const response = await rpcService.handleRPC(request, {}, {} as ExecutionContext);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toBe('FooBar');
    });

    test('handles method with single argument', async () => {
      const request = new Request('https://rpc', {
        method: 'POST',
        body: JSON.stringify({
          method: 'getUser',
          args: ['123'],
        }),
      });

      const response = await rpcService.handleRPC(request, {}, {} as ExecutionContext);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ id: '123', name: 'Test User' });
    });

    test('handles method returning null', async () => {
      const request = new Request('https://rpc', {
        method: 'POST',
        body: JSON.stringify({
          method: 'getUser',
          args: ['999'],
        }),
      });

      const response = await rpcService.handleRPC(request, {}, {} as ExecutionContext);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toBeNull();
    });

    test('handles service errors', async () => {
      const request = new Request('https://rpc', {
        method: 'POST',
        body: JSON.stringify({
          method: 'throwError',
          args: [],
        }),
      });

      const response = await rpcService.handleRPC(request, {}, {} as ExecutionContext);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Service error');
    });

    test('handles invalid method name', async () => {
      const request = new Request('https://rpc', {
        method: 'POST',
        body: JSON.stringify({
          method: 'nonExistentMethod',
          args: [],
        }),
      });

      const response = await rpcService.handleRPC(request, {}, {} as ExecutionContext);

      expect(response.status).toBe(404);
      expect(await response.text()).toContain('not found');
    });

    test('handles malformed request body', async () => {
      const request = new Request('https://rpc', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await rpcService.handleRPC(request, {}, {} as ExecutionContext);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('Integration', () => {
    test('client and service work together correctly', async () => {
      // Perform multiple operations
      const addResult = await rpcClient.call('add', 100, 200);
      const concatResult = await rpcClient.call('concat', 'Test', 'String');
      const userResult = await rpcClient.call('getUser', '123');
      const nullResult = await rpcClient.call('getUser', 'unknown');

      // Verify all results
      expect(isOk(addResult)).toBe(true);
      if (isOk(addResult)) expect(addResult.value).toBe(300);

      expect(isOk(concatResult)).toBe(true);
      if (isOk(concatResult)) expect(concatResult.value).toBe('TestString');

      expect(isOk(userResult)).toBe(true);
      if (isOk(userResult)) {
        expect(userResult.value).toEqual({ id: '123', name: 'Test User' });
      }

      expect(isOk(nullResult)).toBe(true);
      if (isOk(nullResult)) expect(nullResult.value).toBeNull();
    });

    test('handles errors gracefully in integration', async () => {
      const errorResult = await rpcClient.call('throwError');

      expect(isErr(errorResult)).toBe(true);
      if (isErr(errorResult)) {
        expect(errorResult.error).toBeInstanceOf(Error);
        expect(errorResult.error.message).toContain('Service error');
      }
    });
  });
});
