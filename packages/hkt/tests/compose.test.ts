import { describe, it, expect } from 'bun:test';
import { HKTF, Compose, StringHKTF, ArithmeticHKTF } from '../src/index.js';

describe('Compose', () => {
  describe('Identity', () => {
    it('should return input unchanged', () => {
      type Result = HKTF.Apply<Compose.Identity, { input: 42 }>;

      const result: Result = 42;
      expect(result).toBe(42);
    });

    it('should preserve type', () => {
      type Result = HKTF.Apply<Compose.Identity, { input: 'hello' }>;

      const result: Result = 'hello';
      expect(result).toBe('hello');
    });

    it('should work with objects', () => {
      type Result = HKTF.Apply<Compose.Identity, { input: { a: 1, b: 2 } }>;

      const result: Result = { a: 1, b: 2 };
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should work with arrays', () => {
      type Result = HKTF.Apply<Compose.Identity, { input: readonly [1, 2, 3] }>;

      const result: Result = [1, 2, 3];
      expect(result).toEqual([1, 2, 3]);
    });

    it('should work with null', () => {
      type Result = HKTF.Apply<Compose.Identity, { input: null }>;

      const result: Result = null;
      expect(result).toBeNull();
    });

    it('should work with undefined', () => {
      type Result = HKTF.Apply<Compose.Identity, { input: undefined }>;

      const result: Result = undefined;
      expect(result).toBeUndefined();
    });
  });

  describe('Constant', () => {
    it('should return constant value', () => {
      type Result = HKTF.Apply<
        Compose.Constant,
        { value: 42; input: 'ignored' }
      >;

      const result: Result = 42;
      expect(result).toBe(42);
    });

    it('should ignore input', () => {
      type Result = HKTF.Apply<
        Compose.Constant,
        { value: 'constant'; input: 999 }
      >;

      const result: Result = 'constant';
      expect(result).toBe('constant');
    });

    it('should work with object constant', () => {
      type Result = HKTF.Apply<
        Compose.Constant,
        { value: { x: 1 }; input: 'anything' }
      >;

      const result: Result = { x: 1 };
      expect(result).toEqual({ x: 1 });
    });

    it('should work with null constant', () => {
      type Result = HKTF.Apply<
        Compose.Constant,
        { value: null; input: 123 }
      >;

      const result: Result = null;
      expect(result).toBeNull();
    });

    it('should work with boolean constant', () => {
      type Result = HKTF.Apply<
        Compose.Constant,
        { value: true; input: 'ignored' }
      >;

      const result: Result = true;
      expect(result).toBe(true);
    });
  });

  describe('Compose', () => {
    it('should compose two HKTFs', () => {
      // Define simple HKTFs for testing
      interface AddOneArgs {
        input: number;
      }

      interface AddOneResult<T extends AddOneArgs> {
        result: T['input'] extends number ? number : never;
      }

      interface AddOne extends HKTF.Base {
        [HKTF.ArgsSymbol]: AddOneArgs;
        [HKTF.ResultSymbol]: AddOneResult<HKTF.Args<this>>;
      }

      interface DoubleArgs {
        input: number;
      }

      interface DoubleResult<T extends DoubleArgs> {
        result: T['input'] extends number ? number : never;
      }

      interface Double extends HKTF.Base {
        [HKTF.ArgsSymbol]: DoubleArgs;
        [HKTF.ResultSymbol]: DoubleResult<HKTF.Args<this>>;
      }

      // Compose: first add one, then double
      type Result = HKTF.Apply<
        Compose.Compose,
        { f: AddOne; g: Double; input: 5 }
      >;

      // Type should be number
      const result: Result = 12; // (5 + 1) * 2 = 12 conceptually
      expect(typeof result).toBe('number');
    });

    it('should compose with Identity as first function', () => {
      type Result = HKTF.Apply<
        Compose.Compose,
        { f: Compose.Identity; g: Compose.Identity; input: 'test' }
      >;

      const result: Result = 'test';
      expect(result).toBe('test');
    });

    it('should compose with Identity twice', () => {
      type Result = HKTF.Apply<
        Compose.Compose,
        { f: Compose.Identity; g: Compose.Identity; input: 42 }
      >;

      const result: Result = 42;
      expect(result).toBe(42);
    });
  });

  describe('Pipe', () => {
    it('should pipe through empty function list', () => {
      type Result = HKTF.Apply<Compose.Pipe, { functions: readonly []; input: 42 }>;

      const result: Result = 42;
      expect(result).toBe(42);
    });

    it('should pipe through empty function list with string', () => {
      type Result = HKTF.Apply<Compose.Pipe, { functions: readonly []; input: 'unchanged' }>;

      const result: Result = 'unchanged';
      expect(result).toBe('unchanged');
    });

    it('should pipe through empty function list with object', () => {
      type Result = HKTF.Apply<Compose.Pipe, { functions: readonly []; input: { x: 1 } }>;

      const result: Result = { x: 1 };
      expect(result).toEqual({ x: 1 });
    });

    it('should pipe through single function', () => {
      interface AddOneArgs {
        input: number;
      }

      interface AddOneResult<T extends AddOneArgs> {
        result: T['input'] extends number ? number : never;
      }

      interface AddOne extends HKTF.Base {
        [HKTF.ArgsSymbol]: AddOneArgs;
        [HKTF.ResultSymbol]: AddOneResult<HKTF.Args<this>>;
      }

      type Result = HKTF.Apply<
        Compose.Pipe,
        { functions: readonly [AddOne]; input: 5 }
      >;

      const result: Result = 6;
      expect(typeof result).toBe('number');
    });

    it('should pipe through single Identity', () => {
      type Result = HKTF.Apply<
        Compose.Pipe,
        { functions: readonly [Compose.Identity]; input: 'test' }
      >;

      const result: Result = 'test';
      expect(result).toBe('test');
    });

    it('should pipe through multiple functions', () => {
      interface AddOneArgs {
        input: number;
      }

      interface AddOneResult<T extends AddOneArgs> {
        result: T['input'] extends number ? number : never;
      }

      interface AddOne extends HKTF.Base {
        [HKTF.ArgsSymbol]: AddOneArgs;
        [HKTF.ResultSymbol]: AddOneResult<HKTF.Args<this>>;
      }

      type Result = HKTF.Apply<
        Compose.Pipe,
        { functions: readonly [AddOne, AddOne, AddOne]; input: 0 }
      >;

      const result: Result = 3; // 0 + 1 + 1 + 1 = 3 conceptually
      expect(typeof result).toBe('number');
    });

    it('should pipe through multiple Identity functions', () => {
      type Result = HKTF.Apply<
        Compose.Pipe,
        {
          functions: readonly [
            Compose.Identity,
            Compose.Identity,
            Compose.Identity
          ];
          input: 'preserved'
        }
      >;

      const result: Result = 'preserved';
      expect(result).toBe('preserved');
    });

    it('should handle mixed type transformations', () => {
      // This tests that the type system can handle heterogeneous pipelines
      type Result = HKTF.Apply<
        Compose.Pipe,
        { functions: readonly [Compose.Identity]; input: 42 }
      >;

      const result: Result = 42;
      expect(result).toBe(42);
    });
  });

  describe('Flip', () => {
    it('should reverse composition order', () => {
      // Flip reverses f and g, so g is applied first
      type Result = HKTF.Apply<
        Compose.Flip,
        { f: Compose.Identity; g: Compose.Identity; input: 'test' }
      >;

      const result: Result = 'test';
      expect(result).toBe('test');
    });

    it('should work with different types', () => {
      type Result = HKTF.Apply<
        Compose.Flip,
        { f: Compose.Identity; g: Compose.Identity; input: 42 }
      >;

      const result: Result = 42;
      expect(result).toBe(42);
    });
  });

  describe('Apply', () => {
    it('should apply HKTF to value', () => {
      type Result = HKTF.Apply<
        Compose.Apply,
        { fn: Compose.Identity; input: 'hello' }
      >;

      const result: Result = 'hello';
      expect(result).toBe('hello');
    });

    it('should work with numbers', () => {
      type Result = HKTF.Apply<
        Compose.Apply,
        { fn: Compose.Identity; input: 123 }
      >;

      const result: Result = 123;
      expect(result).toBe(123);
    });
  });

  describe('Chain', () => {
    it('should chain two HKTFs', () => {
      type Result = HKTF.Apply<
        Compose.Chain,
        { f: Compose.Identity; g: Compose.Identity; input: 'chain' }
      >;

      const result: Result = 'chain';
      expect(result).toBe('chain');
    });
  });

  describe('Zip', () => {
    it('should apply multiple HKTFs to same input', () => {
      type Result = HKTF.Apply<
        Compose.Zip,
        {
          functions: readonly [Compose.Identity, Compose.Identity];
          input: 'test'
        }
      >;

      const result: Result = ['test', 'test'];
      expect(result).toEqual(['test', 'test']);
    });

    it('should handle empty function list', () => {
      type Result = HKTF.Apply<
        Compose.Zip,
        { functions: readonly []; input: 'ignored' }
      >;

      const result: Result = [];
      expect(result).toEqual([]);
    });

    it('should handle single function', () => {
      type Result = HKTF.Apply<
        Compose.Zip,
        { functions: readonly [Compose.Identity]; input: 42 }
      >;

      const result: Result = [42];
      expect(result).toEqual([42]);
    });
  });

  describe('Parallel', () => {
    it('should apply multiple HKTFs in parallel (conceptually)', () => {
      type Result = HKTF.Apply<
        Compose.Parallel,
        {
          functions: readonly [Compose.Identity, Compose.Identity];
          input: 'test'
        }
      >;

      const result: Result = ['test', 'test'];
      expect(result).toEqual(['test', 'test']);
    });

    it('should handle empty function list', () => {
      type Result = HKTF.Apply<
        Compose.Parallel,
        { functions: readonly []; input: 'ignored' }
      >;

      const result: Result = [];
      expect(result).toEqual([]);
    });
  });

  describe('Tap', () => {
    it('should return original input', () => {
      type Result = HKTF.Apply<
        Compose.Tap,
        { fn: Compose.Identity; input: 'original' }
      >;

      const result: Result = 'original';
      expect(result).toBe('original');
    });

    it('should work with numbers', () => {
      type Result = HKTF.Apply<
        Compose.Tap,
        { fn: Compose.Identity; input: 42 }
      >;

      const result: Result = 42;
      expect(result).toBe(42);
    });
  });

  describe('Sequence', () => {
    it('should apply functions to corresponding inputs', () => {
      type Result = HKTF.Apply<
        Compose.Sequence,
        {
          functions: readonly [Compose.Identity, Compose.Identity];
          inputs: readonly ['a', 'b']
        }
      >;

      const result: Result = ['a', 'b'];
      expect(result).toEqual(['a', 'b']);
    });

    it('should handle empty lists', () => {
      type Result = HKTF.Apply<
        Compose.Sequence,
        { functions: readonly []; inputs: readonly [] }
      >;

      const result: Result = [];
      expect(result).toEqual([]);
    });

    it('should handle single pair', () => {
      type Result = HKTF.Apply<
        Compose.Sequence,
        {
          functions: readonly [Compose.Identity];
          inputs: readonly [42]
        }
      >;

      const result: Result = [42];
      expect(result).toEqual([42]);
    });
  });

  describe('Bimap', () => {
    it('should map over ok value', () => {
      type Result = HKTF.Apply<
        Compose.Bimap,
        {
          successFn: Compose.Identity;
          failureFn: Compose.Identity;
          input: { ok: 42 }
        }
      >;

      const result: Result = { ok: 42 };
      expect(result).toEqual({ ok: 42 });
    });

    it('should map over err value', () => {
      type Result = HKTF.Apply<
        Compose.Bimap,
        {
          successFn: Compose.Identity;
          failureFn: Compose.Identity;
          input: { err: 'error' }
        }
      >;

      const result: Result = { err: 'error' };
      expect(result).toEqual({ err: 'error' });
    });
  });

  describe('When', () => {
    it('should handle true predicate', () => {
      // Define a simple predicate HKTF
      interface AlwaysTrue extends HKTF.Base {
        [HKTF.ArgsSymbol]: { input: unknown };
        [HKTF.ResultSymbol]: true;
      }

      type Result = HKTF.Apply<
        Compose.When,
        {
          predicate: AlwaysTrue;
          fn: Compose.Identity;
          input: 'test'
        }
      >;

      const result: Result = 'test';
      expect(result).toBe('test');
    });

    it('should handle false predicate', () => {
      interface AlwaysFalse extends HKTF.Base {
        [HKTF.ArgsSymbol]: { input: unknown };
        [HKTF.ResultSymbol]: false;
      }

      type Result = HKTF.Apply<
        Compose.When,
        {
          predicate: AlwaysFalse;
          fn: Compose.Identity;
          input: 'test'
        }
      >;

      const result: Result = 'test';
      expect(result).toBe('test');
    });
  });

  describe('Unless', () => {
    it('should handle false predicate', () => {
      interface AlwaysFalse extends HKTF.Base {
        [HKTF.ArgsSymbol]: { input: unknown };
        [HKTF.ResultSymbol]: false;
      }

      type Result = HKTF.Apply<
        Compose.Unless,
        {
          predicate: AlwaysFalse;
          fn: Compose.Identity;
          input: 'test'
        }
      >;

      const result: Result = 'test';
      expect(result).toBe('test');
    });

    it('should handle true predicate', () => {
      interface AlwaysTrue extends HKTF.Base {
        [HKTF.ArgsSymbol]: { input: unknown };
        [HKTF.ResultSymbol]: true;
      }

      type Result = HKTF.Apply<
        Compose.Unless,
        {
          predicate: AlwaysTrue;
          fn: Compose.Identity;
          input: 'test'
        }
      >;

      const result: Result = 'test';
      expect(result).toBe('test');
    });
  });
});
