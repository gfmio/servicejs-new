/**
 * Tests for Durable Object base class
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { ServiceDurableObject } from '../src/durable-object';
import { isOk } from '@servicejs/result';

interface MockEnv {
  TEST_VAR: string;
}

// Mock DurableObjectId
class MockDurableObjectId implements DurableObjectId {
  name?: string;

  toString(): string {
    return 'test-id';
  }

  equals(other: DurableObjectId): boolean {
    return other.toString() === 'test-id';
  }
}

// Mock DurableObjectState
class MockDurableObjectState implements DurableObjectState {
  id: DurableObjectId = new MockDurableObjectId();

  private storageMap: Map<string, any> = new Map();
  private alarmTime: number | null = null;
  private blocked = false;

  public storage: DurableObjectStorage;

  constructor() {
    // Create storage object once in constructor
    this.storage = {
      get: async <T = unknown>(key: string): Promise<T | undefined> => {
        return this.storageMap.get(key);
      },

      put: async <T = unknown>(key: string, value: T): Promise<void> => {
        this.storageMap.set(key, value);
      },

      delete: async (key: string): Promise<boolean> => {
        return this.storageMap.delete(key);
      },

      list: async (): Promise<Map<string, unknown>> => {
        return new Map(this.storageMap);
      },

      getAlarm: async (): Promise<number | null> => {
        return this.alarmTime;
      },

      setAlarm: async (scheduledTime: number | Date): Promise<void> => {
        this.alarmTime = typeof scheduledTime === 'number'
          ? scheduledTime
          : scheduledTime.getTime();
      },

      deleteAlarm: async (): Promise<void> => {
        this.alarmTime = null;
      },

      getWithMetadata: async () => {
        throw new Error('Not implemented');
      },

      transaction: async () => {
        throw new Error('Not implemented');
      },

      deleteAll: async () => {
        this.storageMap.clear();
      },

      sync: async () => {},
    } as DurableObjectStorage;
  }

  blockConcurrencyWhile = async <T>(callback: () => Promise<T>): Promise<T> => {
    if (this.blocked) {
      throw new Error('Already blocked');
    }
    this.blocked = true;
    try {
      return await callback();
    } finally {
      this.blocked = false;
    }
  };

  waitUntil(promise: Promise<any>): void {
    // Mock implementation
  }

  abort(reason?: string): void {
    throw new Error(reason || 'Aborted');
  }
}

class TestDurableObject extends ServiceDurableObject<MockEnv> {
  public initCalled = false;
  public fetchCalled = false;
  public alarmCalled = false;
  public errorCaught: Error | null = null;

  constructor(state: DurableObjectState, env: MockEnv) {
    super(state, env);

    this.onInit(async (state, env) => {
      this.initCalled = true;
      const count = await state.storage.get<number>('count');
      if (count === undefined) {
        await state.storage.put('count', 0);
      }
    });

    this.onFetch(async (request, env, ctx) => {
      this.fetchCalled = true;
      // request.url contains pathname + search from WorkersHTTPRequest
      const [pathname] = request.url.split('?');

      if (pathname === '/increment') {
        const count = (await this.state.storage.get<number>('count')) || 0;
        const newCount = count + 1;
        await this.state.storage.put('count', newCount);

        return {
          statusCode: 200,
          body: JSON.stringify({ count: newCount }),
          headers: { 'Content-Type': 'application/json' },
        };
      }

      if (pathname === '/get') {
        const count = (await this.state.storage.get<number>('count')) || 0;
        return {
          statusCode: 200,
          body: JSON.stringify({ count }),
          headers: { 'Content-Type': 'application/json' },
        };
      }

      if (pathname === '/error') {
        throw new Error('Test error');
      }

      return {
        statusCode: 404,
        body: 'Not found',
      };
    });

    this.onAlarm(async (env) => {
      this.alarmCalled = true;
      const count = (await this.state.storage.get<number>('count')) || 0;
      await this.state.storage.put('count', count + 100);
    });

    this.onError((error) => {
      this.errorCaught = error;
    });
  }
}

describe('ServiceDurableObject', () => {
  let state: MockDurableObjectState;
  let env: MockEnv;
  let durableObject: TestDurableObject;

  beforeEach(() => {
    state = new MockDurableObjectState();
    env = { TEST_VAR: 'test-value' };
    durableObject = new TestDurableObject(state, env);
  });

  test('initializes on first fetch', async () => {
    expect(durableObject.initCalled).toBe(false);

    const request = new Request('https://example.com/get');
    await durableObject.fetch(request);

    expect(durableObject.initCalled).toBe(true);
  });

  test('only initializes once', async () => {
    const request1 = new Request('https://example.com/get');
    await durableObject.fetch(request1);

    expect(durableObject.initCalled).toBe(true);

    // Reset flag to check it's not called again
    durableObject.initCalled = false;

    const request2 = new Request('https://example.com/get');
    await durableObject.fetch(request2);

    expect(durableObject.initCalled).toBe(false);
  });

  test('handles fetch requests', async () => {
    const request = new Request('https://example.com/get');
    const response = await durableObject.fetch(request);

    expect(durableObject.fetchCalled).toBe(true);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.count).toBe(0);
  });

  test('maintains state across requests', async () => {
    // First increment
    const request1 = new Request('https://example.com/increment');
    const response1 = await durableObject.fetch(request1);
    const data1 = await response1.json();
    expect(data1.count).toBe(1);

    // Second increment
    const request2 = new Request('https://example.com/increment');
    const response2 = await durableObject.fetch(request2);
    const data2 = await response2.json();
    expect(data2.count).toBe(2);

    // Get current count
    const request3 = new Request('https://example.com/get');
    const response3 = await durableObject.fetch(request3);
    const data3 = await response3.json();
    expect(data3.count).toBe(2);
  });

  test('handles 404 for unknown routes', async () => {
    const request = new Request('https://example.com/unknown');
    const response = await durableObject.fetch(request);

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('Not found');
  });

  test('handles errors in fetch handler', async () => {
    const request = new Request('https://example.com/error');
    const response = await durableObject.fetch(request);

    expect(response.status).toBe(500);
    expect(durableObject.errorCaught).toBeInstanceOf(Error);
    expect(durableObject.errorCaught?.message).toBe('Test error');
  });

  test('schedules and triggers alarms', async () => {
    // Schedule alarm
    const scheduledTime = Date.now() + 1000;
    await durableObject.scheduleAlarm(scheduledTime);

    // Check alarm is scheduled
    const alarmTime = await state.storage.getAlarm();
    expect(alarmTime).toBe(scheduledTime);

    // Trigger alarm
    expect(durableObject.alarmCalled).toBe(false);
    await durableObject.alarm();
    expect(durableObject.alarmCalled).toBe(true);
  });

  test('alarm modifies state', async () => {
    // Set initial count
    const request = new Request('https://example.com/increment');
    await durableObject.fetch(request);

    // Get count before alarm
    const request1 = new Request('https://example.com/get');
    const response1 = await durableObject.fetch(request1);
    const data1 = await response1.json();
    expect(data1.count).toBe(1);

    // Trigger alarm (adds 100)
    await durableObject.alarm();

    // Get count after alarm
    const request2 = new Request('https://example.com/get');
    const response2 = await durableObject.fetch(request2);
    const data2 = await response2.json();
    expect(data2.count).toBe(101);
  });

  test('schedules alarm with Date object', async () => {
    const scheduledDate = new Date(Date.now() + 2000);
    await durableObject.scheduleAlarm(scheduledDate);

    const alarmTime = await state.storage.getAlarm();
    expect(alarmTime).toBe(scheduledDate.getTime());
  });

  test('provides access to state and env', async () => {
    // Verify state is accessible
    const count = await durableObject['state'].storage.get<number>('count');
    expect(count).toBeUndefined(); // Before init

    const request = new Request('https://example.com/get');
    await durableObject.fetch(request);

    const countAfterInit = await durableObject['state'].storage.get<number>('count');
    expect(countAfterInit).toBe(0);

    // Verify env is accessible
    expect(durableObject['env'].TEST_VAR).toBe('test-value');
  });

  test('storage operations persist', async () => {
    // Initialize
    const request1 = new Request('https://example.com/get');
    await durableObject.fetch(request1);

    // Increment multiple times
    for (let i = 0; i < 5; i++) {
      const request = new Request('https://example.com/increment');
      await durableObject.fetch(request);
    }

    // Verify final count
    const request2 = new Request('https://example.com/get');
    const response = await durableObject.fetch(request2);
    const data = await response.json();
    expect(data.count).toBe(5);
  });
});
