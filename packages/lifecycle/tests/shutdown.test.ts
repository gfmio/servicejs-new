/**
 * Tests for shutdown coordinator
 */

import { describe, test, expect } from 'bun:test';
import { createComponent } from '@servicejs/core';
import { withLifecycle } from '../src/lifecycle.js';
import { createShutdownCoordinator } from '../src/shutdown.js';

describe('createShutdownCoordinator', () => {
  test('creates empty coordinator', () => {
    const coordinator = createShutdownCoordinator();

    expect(coordinator.size()).toBe(0);
    expect(coordinator.isShutdown()).toBe(false);
  });

  test('registers components', () => {
    const coordinator = createShutdownCoordinator();

    const { component: c1, capability: cap1 } = createComponent(
      'urn:test:c1',
      {},
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );
    const managed1 = withLifecycle(c1, cap1);

    coordinator.register(managed1);
    expect(coordinator.size()).toBe(1);

    const { component: c2, capability: cap2 } = createComponent(
      'urn:test:c2',
      {},
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );
    const managed2 = withLifecycle(c2, cap2);

    coordinator.register(managed2);
    expect(coordinator.size()).toBe(2);
  });

  test('shutdown without components succeeds', async () => {
    const coordinator = createShutdownCoordinator();
    const result = await coordinator.shutdown();

    expect(result.isOk()).toBe(true);
    expect(coordinator.isShutdown()).toBe(true);
  });

  test('shutdown calls component shutdown hooks', async () => {
    const coordinator = createShutdownCoordinator();
    let called = false;

    const { component, capability } = createComponent(
      'urn:test:component',
      {},
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );

    const managed = withLifecycle(component, capability, {
      onShutdown: async () => {
        called = true;
      },
    });

    await managed.init();
    coordinator.register(managed);

    const result = await coordinator.shutdown();

    expect(result.isOk()).toBe(true);
    expect(called).toBe(true);
  });

  test('shutdown in reverse order (LIFO)', async () => {
    const coordinator = createShutdownCoordinator();
    const order: number[] = [];

    const { component: c1, capability: cap1 } = createComponent(
      'urn:test:c1',
      {},
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );
    const managed1 = withLifecycle(c1, cap1, {
      onShutdown: async () => {
        order.push(1);
      },
    });

    const { component: c2, capability: cap2 } = createComponent(
      'urn:test:c2',
      {},
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );
    const managed2 = withLifecycle(c2, cap2, {
      onShutdown: async () => {
        order.push(2);
      },
    });

    const { component: c3, capability: cap3 } = createComponent(
      'urn:test:c3',
      {},
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );
    const managed3 = withLifecycle(c3, cap3, {
      onShutdown: async () => {
        order.push(3);
      },
    });

    await managed1.init();
    await managed2.init();
    await managed3.init();

    coordinator.register(managed1);
    coordinator.register(managed2);
    coordinator.register(managed3);

    await coordinator.shutdown();

    expect(order).toEqual([3, 2, 1]);
  });

  test('shutdown twice returns error', async () => {
    const coordinator = createShutdownCoordinator();
    await coordinator.shutdown();
    const result = await coordinator.shutdown();

    expect(result.isErr()).toBe(true);
    expect(result.error.type).toBe('ALREADY_SHUTDOWN');
  });

  test('shutdown with continueOnError continues after error', async () => {
    const coordinator = createShutdownCoordinator();
    const order: number[] = [];

    const { component: c1, capability: cap1 } = createComponent(
      'urn:test:c1',
      {},
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );
    const managed1 = withLifecycle(c1, cap1, {
      onShutdown: async () => {
        order.push(1);
      },
    });

    const { component: c2, capability: cap2 } = createComponent(
      'urn:test:c2',
      {},
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );
    const managed2 = withLifecycle(c2, cap2, {
      onShutdown: async () => {
        order.push(2);
        throw new Error('Shutdown failed');
      },
    });

    const { component: c3, capability: cap3 } = createComponent(
      'urn:test:c3',
      {},
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );
    const managed3 = withLifecycle(c3, cap3, {
      onShutdown: async () => {
        order.push(3);
      },
    });

    await managed1.init();
    await managed2.init();
    await managed3.init();

    coordinator.register(managed1);
    coordinator.register(managed2);
    coordinator.register(managed3);

    const result = await coordinator.shutdown({ continueOnError: true });

    expect(result.isErr()).toBe(true);
    expect(result.error.type).toBe('PARTIAL_SHUTDOWN');
    expect(order).toEqual([3, 2, 1]); // All components shut down despite error
  });

  test('shutdown without continueOnError stops at first error', async () => {
    const coordinator = createShutdownCoordinator();
    const order: number[] = [];

    const { component: c1, capability: cap1 } = createComponent(
      'urn:test:c1',
      {},
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );
    const managed1 = withLifecycle(c1, cap1, {
      onShutdown: async () => {
        order.push(1);
      },
    });

    const { component: c2, capability: cap2 } = createComponent(
      'urn:test:c2',
      {},
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );
    const managed2 = withLifecycle(c2, cap2, {
      onShutdown: async () => {
        order.push(2);
        throw new Error('Shutdown failed');
      },
    });

    const { component: c3, capability: cap3 } = createComponent(
      'urn:test:c3',
      {},
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );
    const managed3 = withLifecycle(c3, cap3, {
      onShutdown: async () => {
        order.push(3);
      },
    });

    await managed1.init();
    await managed2.init();
    await managed3.init();

    coordinator.register(managed1);
    coordinator.register(managed2);
    coordinator.register(managed3);

    const result = await coordinator.shutdown({ continueOnError: false });

    expect(result.isErr()).toBe(true);
    expect(result.error.type).toBe('COMPONENT_SHUTDOWN_ERROR');
    expect(order).toEqual([3, 2]); // Stopped after component 2 error
  });

  test('shutdown with timeout', async () => {
    const coordinator = createShutdownCoordinator();

    const { component, capability } = createComponent(
      'urn:test:component',
      {},
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );

    const managed = withLifecycle(component, capability, {
      onShutdown: async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      },
    });

    await managed.init();
    coordinator.register(managed);

    const result = await coordinator.shutdown({ timeout: 50 });

    expect(result.isErr()).toBe(true);
    expect(result.error.type).toBe('PARTIAL_SHUTDOWN');
  });

  test('shutdown respects custom timeout', async () => {
    const coordinator = createShutdownCoordinator();

    const { component, capability } = createComponent(
      'urn:test:component',
      {},
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );

    const managed = withLifecycle(component, capability, {
      onShutdown: async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      },
    });

    await managed.init();
    coordinator.register(managed);

    const result = await coordinator.shutdown({ timeout: 200 });

    expect(result.isOk()).toBe(true);
  });

  test('shutdown handles component without init', async () => {
    const coordinator = createShutdownCoordinator();

    const { component, capability } = createComponent(
      'urn:test:component',
      {},
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );

    const managed = withLifecycle(component, capability);
    coordinator.register(managed);

    const result = await coordinator.shutdown();

    expect(result.isOk()).toBe(true);
  });
});
