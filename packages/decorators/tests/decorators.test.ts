/**
 * Tests for decorators
 */

import { describe, test, expect } from 'bun:test';
import 'reflect-metadata';
import { Component, Handler, Inject, OnInit, OnShutdown } from '../src/decorators.js';
import { METADATA_KEYS } from '../src/metadata.js';

describe('@Component decorator', () => {
  test('stores URN in metadata', () => {
    @Component({ urn: 'urn:test:component' })
    class TestComponent {}

    const urn = Reflect.getMetadata(METADATA_KEYS.COMPONENT_URN, TestComponent);

    expect(urn).toBe('urn:test:component');
  });

  test('generates URN if not provided', () => {
    @Component()
    class MyTestComponent {}

    const urn = Reflect.getMetadata(METADATA_KEYS.COMPONENT_URN, MyTestComponent);

    expect(urn).toBe('urn:component:mytestcomponent');
  });

  test('stores state factory', () => {
    const stateFactory = () => ({ count: 0 });

    @Component({ urn: 'urn:test:component', state: stateFactory })
    class TestComponent {}

    const storedFactory = Reflect.getMetadata(METADATA_KEYS.COMPONENT_STATE, TestComponent);

    expect(storedFactory).toBe(stateFactory);
    expect(storedFactory()).toEqual({ count: 0 });
  });
});

describe('@Handler decorator', () => {
  test('stores handler metadata', () => {
    @Component({ urn: 'urn:test:component' })
    class TestComponent {
      @Handler('increment')
      handleIncrement() {}
    }

    const handlers = Reflect.getMetadata(METADATA_KEYS.COMPONENT_HANDLERS, TestComponent);

    expect(handlers).toHaveLength(1);
    expect(handlers[0]).toEqual({
      methodName: 'handleIncrement',
      messageType: 'increment',
    });
  });

  test('supports multiple handlers', () => {
    @Component({ urn: 'urn:test:component' })
    class TestComponent {
      @Handler('increment')
      handleIncrement() {}

      @Handler('decrement')
      handleDecrement() {}

      @Handler()
      handleAny() {}
    }

    const handlers = Reflect.getMetadata(METADATA_KEYS.COMPONENT_HANDLERS, TestComponent);

    expect(handlers).toHaveLength(3);
    expect(handlers[0].methodName).toBe('handleIncrement');
    expect(handlers[1].methodName).toBe('handleDecrement');
    expect(handlers[2].methodName).toBe('handleAny');
    expect(handlers[2].messageType).toBeUndefined();
  });
});

describe('@Inject decorator', () => {
  test('stores injection metadata', () => {
    @Component({ urn: 'urn:test:component' })
    class TestComponent {
      constructor(@Inject('database') db: any) {}
    }

    const injections = Reflect.getMetadata(METADATA_KEYS.COMPONENT_INJECTIONS, TestComponent);

    expect(injections).toHaveLength(1);
    expect(injections[0]).toEqual({
      parameterIndex: 0,
      capabilityName: 'database',
    });
  });

  test('supports multiple injections', () => {
    @Component({ urn: 'urn:test:component' })
    class TestComponent {
      constructor(
        @Inject('database') db: any,
        @Inject('logger') logger: any,
        @Inject('cache') cache: any
      ) {}
    }

    const injections = Reflect.getMetadata(METADATA_KEYS.COMPONENT_INJECTIONS, TestComponent);

    expect(injections).toHaveLength(3);
    expect(injections.find((i: any) => i.capabilityName === 'database')).toBeDefined();
    expect(injections.find((i: any) => i.capabilityName === 'logger')).toBeDefined();
    expect(injections.find((i: any) => i.capabilityName === 'cache')).toBeDefined();
  });
});

describe('@OnInit decorator', () => {
  test('stores lifecycle hook metadata', () => {
    @Component({ urn: 'urn:test:component' })
    class TestComponent {
      @OnInit
      initialize() {}
    }

    const onInitMethod = Reflect.getMetadata(METADATA_KEYS.COMPONENT_ON_INIT, TestComponent);

    expect(onInitMethod).toBe('initialize');
  });
});

describe('@OnShutdown decorator', () => {
  test('stores lifecycle hook metadata', () => {
    @Component({ urn: 'urn:test:component' })
    class TestComponent {
      @OnShutdown
      cleanup() {}
    }

    const onShutdownMethod = Reflect.getMetadata(
      METADATA_KEYS.COMPONENT_ON_SHUTDOWN,
      TestComponent
    );

    expect(onShutdownMethod).toBe('cleanup');
  });
});

describe('Combined decorators', () => {
  test('all decorators work together', () => {
    @Component({ urn: 'urn:test:full-component' })
    class FullComponent {
      constructor(
        @Inject('database') private db: any,
        @Inject('logger') private logger: any
      ) {}

      @OnInit
      initialize() {}

      @Handler('create')
      handleCreate() {}

      @Handler('update')
      handleUpdate() {}

      @OnShutdown
      cleanup() {}
    }

    const urn = Reflect.getMetadata(METADATA_KEYS.COMPONENT_URN, FullComponent);
    const handlers = Reflect.getMetadata(METADATA_KEYS.COMPONENT_HANDLERS, FullComponent);
    const injections = Reflect.getMetadata(METADATA_KEYS.COMPONENT_INJECTIONS, FullComponent);
    const onInit = Reflect.getMetadata(METADATA_KEYS.COMPONENT_ON_INIT, FullComponent);
    const onShutdown = Reflect.getMetadata(METADATA_KEYS.COMPONENT_ON_SHUTDOWN, FullComponent);

    expect(urn).toBe('urn:test:full-component');
    expect(handlers).toHaveLength(2);
    expect(injections).toHaveLength(2);
    expect(onInit).toBe('initialize');
    expect(onShutdown).toBe('cleanup');
  });
});
