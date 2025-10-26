/**
 * Tests for lifecycle hooks
 */

import { describe, test, expect } from 'bun:test';
import { createComponent, createCapability } from '@servicejs/core';
import { withLifecycle } from '../src/lifecycle.js';

interface TestMessage {
  readonly type: 'test';
}

describe('withLifecycle', () => {
  test('creates managed component', () => {
    const { component, capability } = createComponent(
      'urn:test:component',
      { count: 0 },
      (state) => ({ state, reducer: (s) => ({ state: s, reducer: (s) => ({ state: s, reducer: (s) => ({ state: s, reducer: (s) => ({ state: s, effects: [] }), effects: [] }), effects: [] }), effects: [] }), effects: [] })
    );

    const managed = withLifecycle(component, capability);

    expect(managed.component).toBe(component);
    expect(managed.capability).toBe(capability);
    expect(managed.isInitialized()).toBe(false);
    expect(managed.isShutdown()).toBe(false);
  });

  test('init without hooks succeeds', async () => {
    const { component, capability } = createComponent(
      'urn:test:component',
      { count: 0 },
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );

    const managed = withLifecycle(component, capability);
    const result = await managed.init();

    expect(result.isOk()).toBe(true);
    expect(managed.isInitialized()).toBe(true);
  });

  test('init calls onInit hook', async () => {
    let called = false;

    const { component, capability } = createComponent(
      'urn:test:component',
      { count: 0 },
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );

    const managed = withLifecycle(component, capability, {
      onInit: async () => {
        called = true;
      },
    });

    await managed.init();
    expect(called).toBe(true);
  });

  test('init handles onInit errors', async () => {
    const { component, capability } = createComponent(
      'urn:test:component',
      { count: 0 },
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );

    const managed = withLifecycle(component, capability, {
      onInit: async () => {
        throw new Error('Init failed');
      },
    });

    const result = await managed.init();

    expect(result.isErr()).toBe(true);
    expect(result.error.type).toBe('INIT_ERROR');
    expect(managed.isInitialized()).toBe(false);
  });

  test('init twice returns error', async () => {
    const { component, capability } = createComponent(
      'urn:test:component',
      { count: 0 },
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );

    const managed = withLifecycle(component, capability);

    await managed.init();
    const result = await managed.init();

    expect(result.isErr()).toBe(true);
    expect(result.error.type).toBe('ALREADY_INITIALIZED');
  });

  test('shutdown without hooks succeeds', async () => {
    const { component, capability } = createComponent(
      'urn:test:component',
      { count: 0 },
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );

    const managed = withLifecycle(component, capability);
    await managed.init();
    const result = await managed.shutdown();

    expect(result.isOk()).toBe(true);
    expect(managed.isShutdown()).toBe(true);
  });

  test('shutdown calls onShutdown hook', async () => {
    let called = false;

    const { component, capability } = createComponent(
      'urn:test:component',
      { count: 0 },
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );

    const managed = withLifecycle(component, capability, {
      onShutdown: async () => {
        called = true;
      },
    });

    await managed.init();
    await managed.shutdown();
    expect(called).toBe(true);
  });

  test('shutdown handles onShutdown errors', async () => {
    const { component, capability } = createComponent(
      'urn:test:component',
      { count: 0 },
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );

    const managed = withLifecycle(component, capability, {
      onShutdown: async () => {
        throw new Error('Shutdown failed');
      },
    });

    await managed.init();
    const result = await managed.shutdown();

    expect(result.isErr()).toBe(true);
    expect(result.error.type).toBe('SHUTDOWN_ERROR');
  });

  test('shutdown twice returns error', async () => {
    const { component, capability } = createComponent(
      'urn:test:component',
      { count: 0 },
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );

    const managed = withLifecycle(component, capability);

    await managed.init();
    await managed.shutdown();
    const result = await managed.shutdown();

    expect(result.isErr()).toBe(true);
    expect(result.error.type).toBe('ALREADY_SHUTDOWN');
  });

  test('shutdown without init when no onInit hook succeeds', async () => {
    const { component, capability } = createComponent(
      'urn:test:component',
      { count: 0 },
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );

    const managed = withLifecycle(component, capability);
    const result = await managed.shutdown();

    expect(result.isOk()).toBe(true);
  });

  test('shutdown without init when onInit hook exists returns error', async () => {
    const { component, capability } = createComponent(
      'urn:test:component',
      { count: 0 },
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );

    const managed = withLifecycle(component, capability, {
      onInit: async () => {},
    });

    const result = await managed.shutdown();

    expect(result.isErr()).toBe(true);
    expect(result.error.type).toBe('NOT_INITIALIZED');
  });

  test('init after shutdown returns error', async () => {
    const { component, capability } = createComponent(
      'urn:test:component',
      { count: 0 },
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );

    const managed = withLifecycle(component, capability);

    await managed.init();
    await managed.shutdown();
    const result = await managed.init();

    expect(result.isErr()).toBe(true);
    expect(result.error.type).toBe('ALREADY_SHUTDOWN');
  });

  test('complete lifecycle with both hooks', async () => {
    let initCalled = false;
    let shutdownCalled = false;

    const { component, capability } = createComponent(
      'urn:test:component',
      { count: 0 },
      (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
    );

    const managed = withLifecycle(component, capability, {
      onInit: async () => {
        initCalled = true;
      },
      onShutdown: async () => {
        shutdownCalled = true;
      },
    });

    const initResult = await managed.init();
    expect(initResult.isOk()).toBe(true);
    expect(initCalled).toBe(true);
    expect(managed.isInitialized()).toBe(true);

    const shutdownResult = await managed.shutdown();
    expect(shutdownResult.isOk()).toBe(true);
    expect(shutdownCalled).toBe(true);
    expect(managed.isShutdown()).toBe(true);
  });
});
