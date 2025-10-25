import { describe, test, expect } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createInMemoryLifecycle } from '../src/in-memory.js';

describe('createInMemoryLifecycle', () => {
  test('onShutdown registers handler', async () => {
    const lifecycle = createInMemoryLifecycle();
    let called = false;

    const result = lifecycle.onShutdown(async () => {
      called = true;
    });

    expect(isOk(result)).toBe(true);

    await lifecycle.shutdown();
    expect(called).toBe(true);
  });

  test('shutdown calls handlers in reverse order', async () => {
    const lifecycle = createInMemoryLifecycle();
    const order: number[] = [];

    lifecycle.onShutdown(async () => order.push(1));
    lifecycle.onShutdown(async () => order.push(2));
    lifecycle.onShutdown(async () => order.push(3));

    await lifecycle.shutdown();

    expect(order).toEqual([3, 2, 1]);
  });

  test('unregister removes handler', async () => {
    const lifecycle = createInMemoryLifecycle();
    let called = false;

    const result = lifecycle.onShutdown(async () => {
      called = true;
    });

    if (isOk(result)) {
      result.value(); // Unregister
    }

    await lifecycle.shutdown();
    expect(called).toBe(false);
  });

  test('isShuttingDown returns true during shutdown', async () => {
    const lifecycle = createInMemoryLifecycle();

    expect(lifecycle.isShuttingDown()).toBe(false);

    lifecycle.onShutdown(async () => {
      expect(lifecycle.isShuttingDown()).toBe(true);
    });

    await lifecycle.shutdown();

    expect(lifecycle.isShuttingDown()).toBe(false);
  });
});
