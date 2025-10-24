import { describe, it, expect } from 'bun:test';
import { HKTF, HKTO, Method, FunctionHKTF } from '../src/index.js';

describe('HKTO', () => {
  it('should combine methods into HKTO', () => {
    // Define methods
    interface IncrementMsg {
      type: 'increment';
      amount: number;
    }

    interface GetMsg {
      type: 'get';
    }

    interface IncrementMethod extends Method.Base<IncrementMsg, number> {}

    interface GetMethod extends Method.Base<GetMsg, number> {}

    // Combine into HKTO
    interface CounterHKTO
      extends HKTO.Combine<readonly [IncrementMethod, GetMethod]> {}

    // Type test: messages should be union of IncrementMsg | GetMsg
    type Messages = CounterHKTO[typeof HKTF.ArgsSymbol];

    const incrementMsg: Messages = { type: 'increment', amount: 5 };
    const getMsg: Messages = { type: 'get' };

    expect(incrementMsg.type).toBe('increment');
    expect(getMsg.type).toBe('get');
  });

  it('should send message to correct method', () => {
    // Define message types
    interface MapMsg<T> {
      type: 'map';
      fn: FunctionHKTF.Fn1<T, unknown>;
    }

    interface GetMsg {
      type: 'get';
    }

    // Define MapMethod with proper result handling
    interface MapResult<T, TMsg extends MapMsg<T>> {
      result: TMsg['fn'] extends FunctionHKTF.Fn1<T, infer R>
        ? SomeHKTO<R>
        : never;
    }

    interface MapMethod<T> extends Method.Base<MapMsg<T>, unknown> {
      [HKTF.ResultSymbol]: MapResult<T, HKTF.Args<this>>;
    }

    interface GetMethod<T> extends Method.Base<GetMsg, T> {}

    interface SomeHKTO<T>
      extends HKTO.Combine<readonly [MapMethod<T>, GetMethod<T>]> {}

    // Send 'get' message
    type GetResult = HKTO.Send<SomeHKTO<number>, GetMsg>;

    // Type test: should return number
    const result: GetResult = 42;
    expect(result).toBe(42);
  });

  it('should extract method names from message type field', () => {
    interface IncrementMsg {
      type: 'increment';
      amount: number;
    }

    interface IncrementMethod extends Method.Base<IncrementMsg, void> {}

    interface CounterHKTO extends HKTO.Combine<readonly [IncrementMethod]> {}

    // ToObject should create object with 'increment' method
    type CounterObject = HKTO.ToObject<CounterHKTO>;

    // Type test: should have 'increment' method
    const counter: CounterObject = {
      increment: (msg: IncrementMsg) => {},
    };

    expect(typeof counter.increment).toBe('function');
  });

  it('should handle default method name when no type field', () => {
    // Message without type field
    interface CustomMsg {
      value: number;
    }

    interface CustomMethod extends Method.Base<CustomMsg, void> {}

    interface CustomHKTO extends HKTO.Combine<readonly [CustomMethod]> {}

    // ToObject should use 'send' as default method name
    type CustomObject = HKTO.ToObject<CustomHKTO>;

    // Type test: should have 'send' method
    const custom: CustomObject = {
      send: (msg: CustomMsg) => {},
    };

    expect(typeof custom.send).toBe('function');
  });
});
