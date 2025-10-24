import { describe, it, expect } from 'bun:test';
import { HKTF } from '../src/index.js';

describe('HKTF', () => {
  it('should apply type function', () => {
    // Define Args
    interface WrapHKTFArgs {
      value: unknown;
    }

    // Define Result
    interface WrapHKTFResult<T extends WrapHKTFArgs> {
      wrapped: T['value'];
    }

    // Define HKTF
    interface WrapHKTF extends HKTF.Base {
      [HKTF.ArgsSymbol]: WrapHKTFArgs;
      [HKTF.ResultSymbol]: WrapHKTFResult<HKTF.Args<this>>;
    }

    // Apply the type function
    type Result = HKTF.Apply<WrapHKTF, { value: number }>;

    // Type test: Result should be { wrapped: number }
    const result: Result = { wrapped: 42 };
    expect(result.wrapped).toBe(42);
  });

  it('should handle partial application with defaults', () => {
    // Define Args
    interface DefaultHKTFArgs {
      value: unknown;
      multiplier: number;
    }

    // Define Result
    interface DefaultHKTFResult<T extends DefaultHKTFArgs> {
      result: T['value'];
      multiplier: T['multiplier'];
    }

    // HKTF with default value
    interface DefaultHKTF extends HKTF.Base {
      [HKTF.ArgsSymbol]: DefaultHKTFArgs;
      [HKTF.DefaultsSymbol]: { multiplier: 2 };
      [HKTF.ResultSymbol]: DefaultHKTFResult<HKTF.Args<this>>;
    }

    // Apply with default
    type WithDefault = HKTF.Apply<DefaultHKTF, { value: number }>;

    // Type test: multiplier should default to 2
    const withDefault: WithDefault = { result: 10, multiplier: 2 };
    expect(withDefault.multiplier).toBe(2);

    // Apply overriding default
    type OverrideDefault = HKTF.Apply<DefaultHKTF, { value: number; multiplier: 3 }>;

    const overrideDefault: OverrideDefault = { result: 10, multiplier: 3 };
    expect(overrideDefault.multiplier).toBe(3);
  });

  it('should extract result type', () => {
    interface StringHKTFArgs {
      input: unknown;
    }

    interface StringHKTF extends HKTF.Base {
      [HKTF.ArgsSymbol]: StringHKTFArgs;
      [HKTF.ResultSymbol]: string;
    }

    type Result = HKTF.Result<StringHKTF>;

    const result: Result = 'hello';
    expect(typeof result).toBe('string');
  });

  it('should extract args type', () => {
    interface ArgsHKTFArgs {
      a: number;
      b: string;
    }

    interface ArgsHKTF extends HKTF.Base {
      [HKTF.ArgsSymbol]: ArgsHKTFArgs;
      [HKTF.ResultSymbol]: unknown;
    }

    type Args = HKTF.Args<ArgsHKTF>;

    const args: Args = { a: 42, b: 'hello' };
    expect(args.a).toBe(42);
    expect(args.b).toBe('hello');
  });
});
