/**
 * Tests for ComponentBuilder
 */

import { describe, test, expect } from 'bun:test';
import { stay } from '@servicejs/core';
import { ComponentBuilder, createComponentBuilder } from '../src/builder.js';

interface CounterState {
  count: number;
}

interface CounterMessage {
  type: 'increment' | 'decrement';
  amount?: number;
}

describe('ComponentBuilder', () => {
  test('builds component with required fields', () => {
    const builder = new ComponentBuilder<CounterState, CounterMessage>();

    const { component, capability } = builder
      .withURN('urn:test:counter')
      .withState({ count: 0 })
      .withReducer((state, message) => {
        if (message.type === 'increment') {
          return stay({ count: state.count + (message.amount || 1) });
        }
        return stay(state);
      })
      .build();

    expect(component).toBeDefined();
    expect(capability).toBeDefined();
    expect(component.urn).toBe('urn:test:counter');
    expect(component.getState()).toEqual({ count: 0 });
  });

  test('throws if URN is missing', () => {
    const builder = new ComponentBuilder<CounterState, CounterMessage>();

    expect(() => {
      builder.withState({ count: 0 }).withReducer((state) => stay(state)).build();
    }).toThrow('URN is required');
  });

  test('throws if state is missing', () => {
    const builder = new ComponentBuilder<CounterState, CounterMessage>();

    expect(() => {
      builder
        .withURN('urn:test:counter')
        .withReducer((state) => stay(state))
        .build();
    }).toThrow('Initial state is required');
  });

  test('throws if reducer is missing', () => {
    const builder = new ComponentBuilder<CounterState, CounterMessage>();

    expect(() => {
      builder.withURN('urn:test:counter').withState({ count: 0 }).build();
    }).toThrow('Reducer is required');
  });

  test('method chaining works', () => {
    const builder = new ComponentBuilder<CounterState, CounterMessage>();

    const result = builder
      .withURN('urn:test:counter')
      .withState({ count: 0 })
      .withReducer((state) => stay(state));

    expect(result).toBe(builder);
  });

  test('calls onInit lifecycle hook', () => {
    let initCalled = false;

    const { component } = new ComponentBuilder<CounterState, CounterMessage>()
      .withURN('urn:test:counter')
      .withState({ count: 0 })
      .withReducer((state) => stay(state))
      .withLifecycle({
        onInit: () => {
          initCalled = true;
        },
      })
      .build();

    expect(initCalled).toBe(true);
    expect(component).toBeDefined();
  });

  test('processes messages correctly', () => {
    const reducer = (state: CounterState, message: CounterMessage) => {
      if (message.type === 'increment') {
        return stay({ count: state.count + (message.amount || 1) }, reducer);
      }
      if (message.type === 'decrement') {
        return stay({ count: state.count - (message.amount || 1) }, reducer);
      }
      return stay(state, reducer);
    };

    const { component, capability } = new ComponentBuilder<CounterState, CounterMessage>()
      .withURN('urn:test:counter')
      .withState({ count: 0 })
      .withReducer(reducer)
      .build();

    capability.send({ type: 'increment', amount: 5 });
    expect(component.getState().count).toBe(5);

    capability.send({ type: 'decrement', amount: 2 });
    expect(component.getState().count).toBe(3);
  });
});

describe('createComponentBuilder', () => {
  test('creates a new builder instance', () => {
    const builder = createComponentBuilder<CounterState, CounterMessage>();

    expect(builder).toBeInstanceOf(ComponentBuilder);
  });

  test('builder from factory works correctly', () => {
    const reducer = (state: CounterState, message: CounterMessage) => {
      if (message.type === 'increment') {
        return stay({ count: state.count + 1 }, reducer);
      }
      return stay(state, reducer);
    };

    const { component, capability } = createComponentBuilder<CounterState, CounterMessage>()
      .withURN('urn:test:counter')
      .withState({ count: 10 })
      .withReducer(reducer)
      .build();

    expect(component.getState().count).toBe(10);

    capability.send({ type: 'increment' });
    expect(component.getState().count).toBe(11);
  });
});
