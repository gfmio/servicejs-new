import { describe, test, expect } from 'bun:test';
import { stay, become, initialResult, type Reducer } from '../src/reducer';
import { none, emitTo, batch } from '../src/effect';
import { createCapability } from '../src/capability';
import { createMessage, type MessageOf } from '../src/message';

type CounterState = { count: number };
type CounterMsg = MessageOf<'increment', { amount: number }> | MessageOf<'reset', {}>;

describe('Reducer', () => {
  describe('stay', () => {
    test('creates result with same reducer', () => {
      const reducer: Reducer<CounterState, CounterMsg> = (state, msg) =>
        stay(state, reducer, []);

      const result = stay({ count: 5 }, reducer, []);

      expect(result.state).toEqual({ count: 5 });
      expect(result.reducer).toBe(reducer);
      expect(result.effects).toEqual([]);
    });

    test('creates result with updated state', () => {
      const reducer: Reducer<CounterState, CounterMsg> = (state, msg) =>
        stay({ count: state.count + 1 }, reducer, []);

      const result = reducer({ count: 0 }, createMessage('increment', { amount: 1 }));

      expect(result.state.count).toBe(1);
      expect(result.reducer).toBe(reducer);
    });

    test('includes effects', () => {
      const cap = createCapability(() => {});
      const effect = emitTo(cap, createMessage('increment', { amount: 1 }));

      const reducer: Reducer<CounterState, CounterMsg> = (state, msg) =>
        stay(state, reducer, [effect]);

      const result = reducer({ count: 0 }, createMessage('increment', { amount: 1 }));

      expect(result.effects).toEqual([effect]);
    });

    test('defaults to empty effects array', () => {
      const reducer: Reducer<CounterState, CounterMsg> = (state, msg) =>
        stay(state, reducer);

      const result = reducer({ count: 0 }, createMessage('increment', { amount: 1 }));

      expect(result.effects).toEqual([]);
    });
  });

  describe('become', () => {
    test('creates result with new reducer', () => {
      const reducer1: Reducer<CounterState, CounterMsg> = (state, msg) =>
        stay(state, reducer1, []);

      const reducer2: Reducer<CounterState, CounterMsg> = (state, msg) =>
        stay(state, reducer2, []);

      const result = become({ count: 10 }, reducer2, []);

      expect(result.state).toEqual({ count: 10 });
      expect(result.reducer).toBe(reducer2);
      expect(result.reducer).not.toBe(reducer1);
    });

    test('enables state machine transitions', () => {
      type State = { status: 'idle' | 'active'; value: number };
      type Msg = MessageOf<'activate', {}> | MessageOf<'deactivate', {}>;

      const idleReducer: Reducer<State, Msg> = (state, msg) => {
        if (msg.type === 'activate') {
          return become({ status: 'active', value: state.value }, activeReducer);
        }
        return stay(state, idleReducer);
      };

      const activeReducer: Reducer<State, Msg> = (state, msg) => {
        if (msg.type === 'deactivate') {
          return become({ status: 'idle', value: state.value }, idleReducer);
        }
        return stay(state, activeReducer);
      };

      let state: State = { status: 'idle', value: 0 };
      let reducer = idleReducer;

      // Activate
      const result1 = reducer(state, createMessage('activate', {}));
      state = result1.state;
      reducer = result1.reducer;

      expect(state.status).toBe('active');
      expect(reducer).toBe(activeReducer);

      // Deactivate
      const result2 = reducer(state, createMessage('deactivate', {}));
      state = result2.state;
      reducer = result2.reducer;

      expect(state.status).toBe('idle');
      expect(reducer).toBe(idleReducer);
    });

    test('includes effects', () => {
      const cap = createCapability(() => {});
      const effect = emitTo(cap, createMessage('increment', { amount: 1 }));

      const reducer1: Reducer<CounterState, CounterMsg> = (state, msg) =>
        stay(state, reducer1);

      const reducer2: Reducer<CounterState, CounterMsg> = (state, msg) =>
        stay(state, reducer2);

      const result = become({ count: 5 }, reducer2, [effect]);

      expect(result.effects).toEqual([effect]);
    });

    test('defaults to empty effects array', () => {
      const reducer1: Reducer<CounterState, CounterMsg> = (state, msg) =>
        stay(state, reducer1);

      const reducer2: Reducer<CounterState, CounterMsg> = (state, msg) =>
        stay(state, reducer2);

      const result = become({ count: 5 }, reducer2);

      expect(result.effects).toEqual([]);
    });
  });

  describe('initialResult', () => {
    test('creates initial reducer result', () => {
      const reducer: Reducer<CounterState, CounterMsg> = (state, msg) =>
        stay(state, reducer);

      const result = initialResult({ count: 0 }, reducer);

      expect(result.state).toEqual({ count: 0 });
      expect(result.reducer).toBe(reducer);
      expect(result.effects).toEqual([]);
    });

    test('supports initial effects', () => {
      const cap = createCapability(() => {});
      const effect = emitTo(cap, createMessage('increment', { amount: 1 }));

      const reducer: Reducer<CounterState, CounterMsg> = (state, msg) =>
        stay(state, reducer);

      const result = initialResult({ count: 0 }, reducer, [effect]);

      expect(result.effects).toEqual([effect]);
    });
  });

  describe('Reducer integration', () => {
    test('processes multiple messages', () => {
      const counterReducer: Reducer<CounterState, CounterMsg> = (state, msg) => {
        if (msg.type === 'increment') {
          return stay({ count: state.count + msg.amount }, counterReducer);
        }
        if (msg.type === 'reset') {
          return stay({ count: 0 }, counterReducer);
        }
        return stay(state, counterReducer);
      };

      let state: CounterState = { count: 0 };
      let reducer = counterReducer;

      const result1 = reducer(state, createMessage('increment', { amount: 5 }));
      state = result1.state;
      expect(state.count).toBe(5);

      const result2 = reducer(state, createMessage('increment', { amount: 3 }));
      state = result2.state;
      expect(state.count).toBe(8);

      const result3 = reducer(state, createMessage('reset', {}));
      state = result3.state;
      expect(state.count).toBe(0);
    });

    test('emits effects during processing', () => {
      const emitted: CounterMsg[] = [];
      const cap = createCapability<CounterMsg>((msg) => {
        emitted.push(msg);
      });

      const counterReducer: Reducer<CounterState, CounterMsg> = (state, msg) => {
        if (msg.type === 'increment') {
          const newCount = state.count + msg.amount;
          const effects =
            newCount >= 10
              ? [emitTo(cap, createMessage('reset', {}))]
              : [];

          return stay({ count: newCount }, counterReducer, effects);
        }
        if (msg.type === 'reset') {
          return stay({ count: 0 }, counterReducer);
        }
        return stay(state, counterReducer);
      };

      const result = counterReducer({ count: 8 }, createMessage('increment', { amount: 5 }));

      expect(result.state.count).toBe(13);
      expect(result.effects).toHaveLength(1);
      expect(result.effects[0].type).toBe('emit');
    });

    test('maintains immutability', () => {
      const counterReducer: Reducer<CounterState, CounterMsg> = (state, msg) => {
        if (msg.type === 'increment') {
          return stay({ count: state.count + msg.amount }, counterReducer);
        }
        return stay(state, counterReducer);
      };

      const originalState = { count: 5 };
      const result = counterReducer(originalState, createMessage('increment', { amount: 3 }));

      expect(originalState.count).toBe(5); // Original unchanged
      expect(result.state.count).toBe(8); // New state
      expect(result.state).not.toBe(originalState); // Different object
    });
  });
});
