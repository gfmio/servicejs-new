/**
 * Tests for createComponentFromClass
 */

import { describe, test, expect } from 'bun:test';
import 'reflect-metadata';
import { isOk, isErr } from '@servicejs/result';
import { createCapability, stay } from '@servicejs/core';
import { Component, Handler, Inject, OnInit, OnShutdown } from '../src/decorators.js';
import { createComponentFromClass } from '../src/factory.js';

interface CounterState {
  count: number;
}

interface CounterMessage {
  type: 'increment' | 'decrement' | 'reset';
  amount?: number;
}

describe('createComponentFromClass', () => {
  test('creates component from decorated class', () => {
    @Component({ urn: 'urn:test:counter' })
    class CounterComponent {
      @Handler('increment')
      handleIncrement(state: CounterState, message: CounterMessage): CounterState {
        return { count: state.count + (message.amount || 1) };
      }
    }

    const result = createComponentFromClass<CounterState, CounterMessage>(
      CounterComponent,
      { count: 0 }
    );

    expect(isOk(result)).toBe(true);

    if (isOk(result)) {
      const { component, capability } = result.value;

      expect(component).toBeDefined();
      expect(capability).toBeDefined();
    }
  });

  test('fails if class has no @Component decorator', () => {
    class PlainClass {}

    const result = createComponentFromClass(PlainClass, {});

    expect(isErr(result)).toBe(true);

    if (isErr(result)) {
      expect(result.error.type).toBe('NO_COMPONENT_DECORATOR');
    }
  });

  test('handlers dispatch messages correctly', () => {
    let handlerCalled = false;
    let receivedAmount = 0;

    @Component({ urn: 'urn:test:counter' })
    class CounterComponent {
      @Handler('increment')
      handleIncrement(state: CounterState, message: CounterMessage): CounterState {
        handlerCalled = true;
        receivedAmount = message.amount || 0;
        return { count: state.count + (message.amount || 1) };
      }
    }

    const result = createComponentFromClass<CounterState, CounterMessage>(
      CounterComponent,
      { count: 0 }
    );

    expect(isOk(result)).toBe(true);

    if (isOk(result)) {
      const { component, capability } = result.value;

      // Send a message
      capability.send({ type: 'increment', amount: 5 });

      // Message is processed synchronously
      expect(handlerCalled).toBe(true);
      expect(receivedAmount).toBe(5);
    }
  });

  test('injects capabilities into constructor', () => {
    let injectedDb: any;
    let injectedLogger: any;

    const dbCapability = createCapability(() => {});
    const loggerCapability = createCapability(() => {});

    @Component({ urn: 'urn:test:service' })
    class ServiceComponent {
      constructor(@Inject('database') db: any, @Inject('logger') logger: any) {
        injectedDb = db;
        injectedLogger = logger;
      }

      @Handler()
      handle() {
        return {};
      }
    }

    const result = createComponentFromClass(
      ServiceComponent,
      {},
      {
        capabilities: {
          database: dbCapability,
          logger: loggerCapability,
        },
      }
    );

    expect(isOk(result)).toBe(true);
    expect(injectedDb).toBe(dbCapability);
    expect(injectedLogger).toBe(loggerCapability);
  });

  test('fails if required capability is missing', () => {
    @Component({ urn: 'urn:test:service' })
    class ServiceComponent {
      constructor(@Inject('database') db: any) {}

      @Handler()
      handle() {
        return {};
      }
    }

    const result = createComponentFromClass(ServiceComponent, {}, { capabilities: {} });

    expect(isErr(result)).toBe(true);

    if (isErr(result)) {
      expect(result.error.type).toBe('MISSING_INJECTION');
      expect(result.error.capabilityName).toBe('database');
    }
  });

  test('calls @OnInit during creation', () => {
    let initCalled = false;

    @Component({ urn: 'urn:test:component' })
    class TestComponent {
      @OnInit
      initialize() {
        initCalled = true;
      }

      @Handler()
      handle() {
        return {};
      }
    }

    const result = createComponentFromClass(TestComponent, {});

    expect(isOk(result)).toBe(true);
    expect(initCalled).toBe(true);
  });

  test('stores @OnShutdown hook', () => {
    @Component({ urn: 'urn:test:component' })
    class TestComponent {
      @OnShutdown
      cleanup() {}

      @Handler()
      handle() {
        return {};
      }
    }

    const result = createComponentFromClass(TestComponent, {});

    expect(isOk(result)).toBe(true);

    if (isOk(result)) {
      const { instance } = result.value;

      expect(typeof instance.__onShutdown).toBe('function');
    }
  });

  test('handles multiple message types', () => {
    const calls: string[] = [];

    @Component({ urn: 'urn:test:multi' })
    class MultiComponent {
      @Handler('increment')
      handleIncrement(state: CounterState): CounterState {
        calls.push('increment');
        return { count: state.count + 1 };
      }

      @Handler('decrement')
      handleDecrement(state: CounterState): CounterState {
        calls.push('decrement');
        return { count: state.count - 1 };
      }

      @Handler('reset')
      handleReset(): CounterState {
        calls.push('reset');
        return { count: 0 };
      }
    }

    const result = createComponentFromClass<CounterState, CounterMessage>(MultiComponent, {
      count: 5,
    });

    expect(isOk(result)).toBe(true);

    if (isOk(result)) {
      const { component, capability } = result.value;

      capability.send({ type: 'increment' });
      capability.send({ type: 'decrement' });
      capability.send({ type: 'reset' });

      expect(calls).toEqual(['increment', 'decrement', 'reset']);
    }
  });

  test('uses state factory from decorator if no initial state provided', () => {
    @Component({
      urn: 'urn:test:component',
      state: () => ({ count: 100 }),
    })
    class TestComponent {
      @Handler()
      handle(state: CounterState): CounterState {
        return state;
      }
    }

    const result = createComponentFromClass<CounterState, CounterMessage>(TestComponent, {
      count: 0,
    });

    expect(isOk(result)).toBe(true);

    if (isOk(result)) {
      const { component } = result.value;

      // State should use factory (100), not passed initial state (0)
      expect(component.getState().count).toBe(100);
    }
  });
});
