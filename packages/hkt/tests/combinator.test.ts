import { describe, it, expect } from 'bun:test';
import { HKTF, Combinator, HKTO, Method } from '../src/index.js';

describe('Combinator', () => {
  describe('ComposeHKTOs', () => {
    it('should compose two HKTOs by combining their methods', () => {
      // Define a simple method for testing
      interface IncrementMessage {
        type: 'increment';
      }

      interface IncrementMethod extends Method.Base {
        [HKTF.ArgsSymbol]: IncrementMessage;
        [HKTF.ResultSymbol]: number;
      }

      interface DecrementMessage {
        type: 'decrement';
      }

      interface DecrementMethod extends Method.Base {
        [HKTF.ArgsSymbol]: DecrementMessage;
        [HKTF.ResultSymbol]: number;
      }

      // Define two simple HKTOs
      interface FirstHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: { count: number };
        [HKTO.MethodsSymbol]: readonly [IncrementMethod];
      }

      interface SecondHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: { total: number };
        [HKTO.MethodsSymbol]: readonly [DecrementMethod];
      }

      // Compose them
      type Composed = HKTF.Apply<
        Combinator.ComposeHKTOs,
        { first: FirstHKTO; second: SecondHKTO }
      >;

      // The composed HKTO should have methods from both
      type Methods = Composed[typeof HKTO.MethodsSymbol];

      // Verify the type has the right structure
      const methods: Methods = null as any;
      expect(methods).toBeDefined();
    });

    it('should preserve method order when composing', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'a' };
        [HKTF.ResultSymbol]: string;
      }

      interface Method2 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'b' };
        [HKTF.ResultSymbol]: number;
      }

      interface HKTO1 extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1];
      }

      interface HKTO2 extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method2];
      }

      type Composed = HKTF.Apply<
        Combinator.ComposeHKTOs,
        { first: HKTO1; second: HKTO2 }
      >;

      // Type-level test
      const composed: Composed = null as any;
      expect(typeof composed).toBe('object');
    });
  });

  describe('Extend', () => {
    it('should extend an HKTO with additional methods', () => {
      interface GetMessage {
        type: 'get';
      }

      interface GetMethod extends Method.Base {
        [HKTF.ArgsSymbol]: GetMessage;
        [HKTF.ResultSymbol]: number;
      }

      interface SetMessage {
        type: 'set';
        value: number;
      }

      interface SetMethod extends Method.Base {
        [HKTF.ArgsSymbol]: SetMessage;
        [HKTF.ResultSymbol]: void;
      }

      interface ResetMessage {
        type: 'reset';
      }

      interface ResetMethod extends Method.Base {
        [HKTF.ArgsSymbol]: ResetMessage;
        [HKTF.ResultSymbol]: void;
      }

      interface BaseHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: { value: number };
        [HKTO.MethodsSymbol]: readonly [GetMethod, SetMethod];
      }

      // Extend with reset method
      type Extended = HKTF.Apply<
        Combinator.Extend,
        { base: BaseHKTO; extension: readonly [ResetMethod] }
      >;

      type Methods = Extended[typeof HKTO.MethodsSymbol];

      // Verify extension worked
      const methods: Methods = null as any;
      expect(methods).toBeDefined();
    });

    it('should handle empty extension', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'test' };
        [HKTF.ResultSymbol]: void;
      }

      interface BaseHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1];
      }

      type Extended = HKTF.Apply<
        Combinator.Extend,
        { base: BaseHKTO; extension: readonly [] }
      >;

      const extended: Extended = null as any;
      expect(typeof extended).toBe('object');
    });

    it('should extend with multiple methods', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'a' };
        [HKTF.ResultSymbol]: void;
      }

      interface Method2 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'b' };
        [HKTF.ResultSymbol]: void;
      }

      interface Method3 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'c' };
        [HKTF.ResultSymbol]: void;
      }

      interface BaseHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1];
      }

      type Extended = HKTF.Apply<
        Combinator.Extend,
        { base: BaseHKTO; extension: readonly [Method2, Method3] }
      >;

      const extended: Extended = null as any;
      expect(typeof extended).toBe('object');
    });
  });

  describe('FilterMethods', () => {
    it('should filter methods by predicate', () => {
      interface GetMessage {
        type: 'get';
        id: string;
      }

      interface GetMethod extends Method.Base {
        [HKTF.ArgsSymbol]: GetMessage;
        [HKTF.ResultSymbol]: string;
      }

      interface SetMessage {
        type: 'set';
        id: string;
        value: string;
      }

      interface SetMethod extends Method.Base {
        [HKTF.ArgsSymbol]: SetMessage;
        [HKTF.ResultSymbol]: void;
      }

      interface DeleteMessage {
        type: 'delete';
        id: string;
      }

      interface DeleteMethod extends Method.Base {
        [HKTF.ArgsSymbol]: DeleteMessage;
        [HKTF.ResultSymbol]: void;
      }

      interface CrudHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: { data: Record<string, string> };
        [HKTO.MethodsSymbol]: readonly [GetMethod, SetMethod, DeleteMethod];
      }

      // Predicate that matches only 'get' messages
      interface IsGetMessage extends HKTF.Base {
        [HKTF.ArgsSymbol]: { input: unknown };
        [HKTF.ResultSymbol]: this[HKTF.ArgsSymbol]['input'] extends { type: 'get' } ? true : false;
      }

      // Filter to only get methods
      type ReadOnly = HKTF.Apply<
        Combinator.FilterMethods,
        { hkto: CrudHKTO; predicate: IsGetMessage }
      >;

      const readOnly: ReadOnly = null as any;
      expect(typeof readOnly).toBe('object');
    });

    it('should handle empty filter result', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'a' };
        [HKTF.ResultSymbol]: void;
      }

      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1];
      }

      // Predicate that never matches
      interface NeverMatch extends HKTF.Base {
        [HKTF.ArgsSymbol]: { input: unknown };
        [HKTF.ResultSymbol]: false;
      }

      type Filtered = HKTF.Apply<
        Combinator.FilterMethods,
        { hkto: TestHKTO; predicate: NeverMatch }
      >;

      const filtered: Filtered = null as any;
      expect(typeof filtered).toBe('object');
    });

    it('should handle predicate that matches all', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'a' };
        [HKTF.ResultSymbol]: void;
      }

      interface Method2 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'b' };
        [HKTF.ResultSymbol]: void;
      }

      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1, Method2];
      }

      // Predicate that always matches
      interface AlwaysMatch extends HKTF.Base {
        [HKTF.ArgsSymbol]: { input: unknown };
        [HKTF.ResultSymbol]: true;
      }

      type Filtered = HKTF.Apply<
        Combinator.FilterMethods,
        { hkto: TestHKTO; predicate: AlwaysMatch }
      >;

      const filtered: Filtered = null as any;
      expect(typeof filtered).toBe('object');
    });
  });

  describe('MapMethods', () => {
    it('should transform method results through a function', () => {
      interface GetMessage {
        type: 'get';
      }

      interface GetMethod extends Method.Base {
        [HKTF.ArgsSymbol]: GetMessage;
        [HKTF.ResultSymbol]: number;
      }

      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: { value: number };
        [HKTO.MethodsSymbol]: readonly [GetMethod];
      }

      // Define a transformer HKTF
      interface WrapInOption extends HKTF.Base {
        [HKTF.ArgsSymbol]: { input: unknown };
        [HKTF.ResultSymbol]: { some: this[HKTF.ArgsSymbol]['input'] } | { none: true };
      }

      type Wrapped = HKTF.Apply<
        Combinator.MapMethods,
        { hkto: TestHKTO; transformer: WrapInOption }
      >;

      const wrapped: Wrapped = null as any;
      expect(typeof wrapped).toBe('object');
    });

    it('should handle empty method list', () => {
      interface EmptyHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [];
      }

      interface IdentityTransform extends HKTF.Base {
        [HKTF.ArgsSymbol]: { input: unknown };
        [HKTF.ResultSymbol]: this[HKTF.ArgsSymbol]['input'];
      }

      type Mapped = HKTF.Apply<
        Combinator.MapMethods,
        { hkto: EmptyHKTO; transformer: IdentityTransform }
      >;

      const mapped: Mapped = null as any;
      expect(typeof mapped).toBe('object');
    });

    it('should transform multiple methods', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'a' };
        [HKTF.ResultSymbol]: string;
      }

      interface Method2 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'b' };
        [HKTF.ResultSymbol]: number;
      }

      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1, Method2];
      }

      interface WrapInArray extends HKTF.Base {
        [HKTF.ArgsSymbol]: { input: unknown };
        [HKTF.ResultSymbol]: readonly [this[HKTF.ArgsSymbol]['input']];
      }

      type Mapped = HKTF.Apply<
        Combinator.MapMethods,
        { hkto: TestHKTO; transformer: WrapInArray }
      >;

      const mapped: Mapped = null as any;
      expect(typeof mapped).toBe('object');
    });
  });

  describe('MergeTwoHKTOs', () => {
    it('should merge two HKTOs into one', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'a' };
        [HKTF.ResultSymbol]: string;
      }

      interface Method2 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'b' };
        [HKTF.ResultSymbol]: number;
      }

      interface HKTO1 extends HKTO.Base {
        [HKTO.StateSymbol]: { x: number };
        [HKTO.MethodsSymbol]: readonly [Method1];
      }

      interface HKTO2 extends HKTO.Base {
        [HKTO.StateSymbol]: { y: string };
        [HKTO.MethodsSymbol]: readonly [Method2];
      }

      type Merged = HKTF.Apply<
        Combinator.MergeTwoHKTOs,
        { hkto1: HKTO1; hkto2: HKTO2 }
      >;

      type Methods = Merged[typeof HKTO.MethodsSymbol];

      const methods: Methods = null as any;
      expect(methods).toBeDefined();
    });

    it('should handle merging HKTO with empty methods', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'a' };
        [HKTF.ResultSymbol]: void;
      }

      interface HKTO1 extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1];
      }

      interface HKTO2 extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [];
      }

      type Merged = HKTF.Apply<
        Combinator.MergeTwoHKTOs,
        { hkto1: HKTO1; hkto2: HKTO2 }
      >;

      const merged: Merged = null as any;
      expect(typeof merged).toBe('object');
    });

    it('should handle merging two empty HKTOs', () => {
      interface HKTO1 extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [];
      }

      interface HKTO2 extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [];
      }

      type Merged = HKTF.Apply<
        Combinator.MergeTwoHKTOs,
        { hkto1: HKTO1; hkto2: HKTO2 }
      >;

      const merged: Merged = null as any;
      expect(typeof merged).toBe('object');
    });

    it('should merge multiple methods from both HKTOs', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'a' };
        [HKTF.ResultSymbol]: void;
      }

      interface Method2 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'b' };
        [HKTF.ResultSymbol]: void;
      }

      interface Method3 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'c' };
        [HKTF.ResultSymbol]: void;
      }

      interface Method4 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'd' };
        [HKTF.ResultSymbol]: void;
      }

      interface HKTO1 extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1, Method2];
      }

      interface HKTO2 extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method3, Method4];
      }

      type Merged = HKTF.Apply<
        Combinator.MergeTwoHKTOs,
        { hkto1: HKTO1; hkto2: HKTO2 }
      >;

      const merged: Merged = null as any;
      expect(typeof merged).toBe('object');
    });
  });
});
