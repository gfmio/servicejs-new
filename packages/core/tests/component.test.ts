import { describe, test, expect } from 'bun:test';
import { createComponent, type Component } from '../src/component';
import { createURN } from '../src/urn';
import { stay, become, type Reducer } from '../src/reducer';
import { emitTo, none } from '../src/effect';
import { createCapability } from '../src/capability';
import { createMessage, type MessageOf } from '../src/message';

type CounterState = { count: number };
type CounterMsg = MessageOf<'increment', { amount: number }> | MessageOf<'reset', {}>;

describe('Component', () => {
  describe('createComponent', () => {
    test('creates component with URN, state, and capability', () => {
      const urn = createURN('test', 'counter-1');
      const initialState: CounterState = { count: 0 };
      const reducer: Reducer<CounterState, CounterMsg> = (state, msg) =>
        stay(state, reducer);

      const { component, capability } = createComponent(urn, initialState, reducer);

      expect(component.urn).toBe(urn);
      expect(component.getState()).toEqual({ count: 0 });
      expect(capability).toBeDefined();
      expect(capability.send).toBeInstanceOf(Function);
    });

    test('component and capability are separate objects', () => {
      const urn = createURN('test', 'counter-1');
      const reducer: Reducer<CounterState, CounterMsg> = (state, msg) =>
        stay(state, reducer);

      const { component, capability } = createComponent(urn, { count: 0 }, reducer);

      expect(component).not.toBe(capability);
      expect(component.getCapability()).toBe(capability);
    });
  });

  describe('Component behavior', () => {
    test('processes messages through reducer', () => {
      const urn = createURN('test', 'counter-1');
      const reducer: Reducer<CounterState, CounterMsg> = (state, msg) => {
        if (msg.type === 'increment') {
          return stay({ count: state.count + msg.amount }, reducer);
        }
        return stay(state, reducer);
      };

      const { component, capability } = createComponent(urn, { count: 0 }, reducer);

      capability.send(createMessage('increment', { amount: 5 }));
      expect(component.getState().count).toBe(5);

      capability.send(createMessage('increment', { amount: 3 }));
      expect(component.getState().count).toBe(8);
    });

    test('updates state immutably', () => {
      const urn = createURN('test', 'counter-1');
      const reducer: Reducer<CounterState, CounterMsg> = (state, msg) => {
        if (msg.type === 'increment') {
          return stay({ count: state.count + msg.amount }, reducer);
        }
        return stay(state, reducer);
      };

      const { component, capability } = createComponent(urn, { count: 10 }, reducer);

      const stateBefore = component.getState();
      capability.send(createMessage('increment', { amount: 5 }));
      const stateAfter = component.getState();

      expect(stateBefore.count).toBe(10); // Original state object unchanged
      expect(stateAfter.count).toBe(15);
      expect(stateAfter).not.toBe(stateBefore); // Different object
    });

    test('supports reducer transitions with become', () => {
      const urn = createURN('test', 'state-machine');

      type State = { mode: 'idle' | 'active' };
      type Msg = MessageOf<'activate', {}> | MessageOf<'deactivate', {}>;

      const idleReducer: Reducer<State, Msg> = (state, msg) => {
        if (msg.type === 'activate') {
          return become({ mode: 'active' }, activeReducer);
        }
        return stay(state, idleReducer);
      };

      const activeReducer: Reducer<State, Msg> = (state, msg) => {
        if (msg.type === 'deactivate') {
          return become({ mode: 'idle' }, idleReducer);
        }
        return stay(state, activeReducer);
      };

      const { component, capability } = createComponent(
        urn,
        { mode: 'idle' as const },
        idleReducer
      );

      expect(component.getState().mode).toBe('idle');

      capability.send(createMessage('activate', {}));
      expect(component.getState().mode).toBe('active');

      capability.send(createMessage('deactivate', {}));
      expect(component.getState().mode).toBe('idle');
    });

    test('executes effects returned by reducer', () => {
      const urn = createURN('test', 'counter-with-effects');

      const emitted: number[] = [];
      const notifyCap = createCapability<CounterMsg>((msg) => {
        if (msg.type === 'increment') {
          emitted.push(msg.amount);
        }
      });

      const reducer: Reducer<CounterState, CounterMsg> = (state, msg) => {
        if (msg.type === 'increment') {
          const newCount = state.count + msg.amount;

          // Emit notification when crossing threshold
          const effects = newCount >= 10
            ? [emitTo(notifyCap, createMessage('increment', { amount: newCount }))]
            : [];

          return stay({ count: newCount }, reducer, effects);
        }
        return stay(state, reducer);
      };

      const { capability } = createComponent(urn, { count: 0 }, reducer);

      capability.send(createMessage('increment', { amount: 5 }));
      expect(emitted).toEqual([]); // Below threshold

      capability.send(createMessage('increment', { amount: 7 }));
      expect(emitted).toEqual([12]); // Crossed threshold, effect executed
    });

    test('handles multiple messages in sequence', () => {
      const urn = createURN('test', 'sequence');

      const reducer: Reducer<CounterState, CounterMsg> = (state, msg) => {
        if (msg.type === 'increment') {
          return stay({ count: state.count + msg.amount }, reducer);
        }
        if (msg.type === 'reset') {
          return stay({ count: 0 }, reducer);
        }
        return stay(state, reducer);
      };

      const { component, capability } = createComponent(urn, { count: 0 }, reducer);

      capability.send(createMessage('increment', { amount: 5 }));
      capability.send(createMessage('increment', { amount: 3 }));
      capability.send(createMessage('increment', { amount: 2 }));
      expect(component.getState().count).toBe(10);

      capability.send(createMessage('reset', {}));
      expect(component.getState().count).toBe(0);

      capability.send(createMessage('increment', { amount: 7 }));
      expect(component.getState().count).toBe(7);
    });
  });

  describe('Component integration', () => {
    test('components can communicate via capabilities', () => {
      type LogMsg = MessageOf<'log', { text: string }>;

      const loggerUrn = createURN('test', 'logger');
      const logs: string[] = [];

      const loggerReducer: Reducer<{ logs: string[] }, LogMsg> = (state, msg) => {
        if (msg.type === 'log') {
          return stay({ logs: [...state.logs, msg.text] }, loggerReducer);
        }
        return stay(state, loggerReducer);
      };

      const { component: logger, capability: logCap } = createComponent(
        loggerUrn,
        { logs: [] },
        loggerReducer
      );

      // Counter that logs to logger
      const counterUrn = createURN('test', 'counter');
      const counterReducer: Reducer<CounterState, CounterMsg> = (state, msg) => {
        if (msg.type === 'increment') {
          const newCount = state.count + msg.amount;
          const effects = [
            emitTo(logCap, createMessage('log', { text: `Count: ${newCount}` })),
          ];
          return stay({ count: newCount }, counterReducer, effects);
        }
        return stay(state, counterReducer);
      };

      const { capability: counterCap } = createComponent(
        counterUrn,
        { count: 0 },
        counterReducer
      );

      counterCap.send(createMessage('increment', { amount: 5 }));
      counterCap.send(createMessage('increment', { amount: 3 }));

      expect(logger.getState().logs).toEqual(['Count: 5', 'Count: 8']);
    });

    test('getCapability returns same capability', () => {
      const urn = createURN('test', 'stable-cap');
      const reducer: Reducer<CounterState, CounterMsg> = (state, msg) =>
        stay(state, reducer);

      const { component, capability } = createComponent(urn, { count: 0 }, reducer);

      const cap1 = component.getCapability();
      const cap2 = component.getCapability();

      expect(cap1).toBe(cap2);
      expect(cap1).toBe(capability);
    });

    test('component URN is accessible for debugging', () => {
      const urn = createURN('app', 'my-component-123');
      const reducer: Reducer<CounterState, CounterMsg> = (state, msg) =>
        stay(state, reducer);

      const { component } = createComponent(urn, { count: 0 }, reducer);

      expect(component.urn.toString()).toBe('urn:app:my-component-123');
    });
  });
});
