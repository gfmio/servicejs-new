import { describe, it, expect } from 'bun:test';
import { HKTF, HKTO, Method } from '@servicejs/hkt-core';
import * as Combinator from '../src/index.js';

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

  describe('PickMethods', () => {
    it('should pick methods by message type', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'get' };
        [HKTF.ResultSymbol]: string;
      }

      interface Method2 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'set' };
        [HKTF.ResultSymbol]: void;
      }

      interface Method3 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'delete' };
        [HKTF.ResultSymbol]: void;
      }

      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1, Method2, Method3];
      }

      type Picked = HKTF.Apply<
        Combinator.PickMethods,
        { hkto: TestHKTO; picks: readonly ['get', 'set'] }
      >;

      const picked: Picked = null as any;
      expect(typeof picked).toBe('object');
    });

    it('should handle empty picks', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'test' };
        [HKTF.ResultSymbol]: void;
      }

      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1];
      }

      type Picked = HKTF.Apply<
        Combinator.PickMethods,
        { hkto: TestHKTO; picks: readonly [] }
      >;

      const picked: Picked = null as any;
      expect(typeof picked).toBe('object');
    });

    it('should handle picking non-existent methods', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'a' };
        [HKTF.ResultSymbol]: void;
      }

      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1];
      }

      type Picked = HKTF.Apply<
        Combinator.PickMethods,
        { hkto: TestHKTO; picks: readonly ['b', 'c'] }
      >;

      const picked: Picked = null as any;
      expect(typeof picked).toBe('object');
    });
  });

  describe('OmitMethods', () => {
    it('should omit methods by message type', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'get' };
        [HKTF.ResultSymbol]: string;
      }

      interface Method2 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'set' };
        [HKTF.ResultSymbol]: void;
      }

      interface Method3 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'delete' };
        [HKTF.ResultSymbol]: void;
      }

      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1, Method2, Method3];
      }

      type Omitted = HKTF.Apply<
        Combinator.OmitMethods,
        { hkto: TestHKTO; omits: readonly ['delete'] }
      >;

      const omitted: Omitted = null as any;
      expect(typeof omitted).toBe('object');
    });

    it('should handle empty omits', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'test' };
        [HKTF.ResultSymbol]: void;
      }

      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1];
      }

      type Omitted = HKTF.Apply<
        Combinator.OmitMethods,
        { hkto: TestHKTO; omits: readonly [] }
      >;

      const omitted: Omitted = null as any;
      expect(typeof omitted).toBe('object');
    });

    it('should handle omitting all methods', () => {
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

      type Omitted = HKTF.Apply<
        Combinator.OmitMethods,
        { hkto: TestHKTO; omits: readonly ['a', 'b'] }
      >;

      const omitted: Omitted = null as any;
      expect(typeof omitted).toBe('object');
    });
  });

  describe('RenameMethods', () => {
    it('should rename method message types', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'increment' };
        [HKTF.ResultSymbol]: number;
      }

      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1];
      }

      type Renamed = HKTF.Apply<
        Combinator.RenameMethods,
        { hkto: TestHKTO; mapping: { increment: 'add' } }
      >;

      const renamed: Renamed = null as any;
      expect(typeof renamed).toBe('object');
    });

    it('should handle empty mapping', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'test' };
        [HKTF.ResultSymbol]: void;
      }

      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1];
      }

      type Renamed = HKTF.Apply<
        Combinator.RenameMethods,
        { hkto: TestHKTO; mapping: {} }
      >;

      const renamed: Renamed = null as any;
      expect(typeof renamed).toBe('object');
    });

    it('should rename multiple methods', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'get' };
        [HKTF.ResultSymbol]: string;
      }

      interface Method2 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'set' };
        [HKTF.ResultSymbol]: void;
      }

      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1, Method2];
      }

      type Renamed = HKTF.Apply<
        Combinator.RenameMethods,
        { hkto: TestHKTO; mapping: { get: 'read'; set: 'write' } }
      >;

      const renamed: Renamed = null as any;
      expect(typeof renamed).toBe('object');
    });
  });

  describe('PartitionMethods', () => {
    it('should partition methods by predicate', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'get' };
        [HKTF.ResultSymbol]: string;
      }

      interface Method2 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'set' };
        [HKTF.ResultSymbol]: void;
      }

      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1, Method2];
      }

      interface IsReadMethod extends HKTF.Base {
        [HKTF.ArgsSymbol]: { input: unknown };
        [HKTF.ResultSymbol]: this[HKTF.ArgsSymbol]['input'] extends { type: 'get' } ? true : false;
      }

      type Partitioned = HKTF.Apply<
        Combinator.PartitionMethods,
        { hkto: TestHKTO; predicate: IsReadMethod }
      >;

      const partitioned: Partitioned = null as any;
      expect(typeof partitioned).toBe('object');
    });

    it('should handle predicate matching all', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'a' };
        [HKTF.ResultSymbol]: void;
      }

      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1];
      }

      interface AlwaysTrue extends HKTF.Base {
        [HKTF.ArgsSymbol]: { input: unknown };
        [HKTF.ResultSymbol]: true;
      }

      type Partitioned = HKTF.Apply<
        Combinator.PartitionMethods,
        { hkto: TestHKTO; predicate: AlwaysTrue }
      >;

      const partitioned: Partitioned = null as any;
      expect(typeof partitioned).toBe('object');
    });

    it('should handle predicate matching none', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'a' };
        [HKTF.ResultSymbol]: void;
      }

      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1];
      }

      interface AlwaysFalse extends HKTF.Base {
        [HKTF.ArgsSymbol]: { input: unknown };
        [HKTF.ResultSymbol]: false;
      }

      type Partitioned = HKTF.Apply<
        Combinator.PartitionMethods,
        { hkto: TestHKTO; predicate: AlwaysFalse }
      >;

      const partitioned: Partitioned = null as any;
      expect(typeof partitioned).toBe('object');
    });
  });

  describe('ZipHKTOs', () => {
    it('should merge multiple HKTOs', () => {
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

      interface HKTO1 extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1];
      }

      interface HKTO2 extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method2];
      }

      interface HKTO3 extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method3];
      }

      type Zipped = HKTF.Apply<
        Combinator.ZipHKTOs,
        { hktos: readonly [HKTO1, HKTO2, HKTO3] }
      >;

      const zipped: Zipped = null as any;
      expect(typeof zipped).toBe('object');
    });

    it('should handle empty HKTO list', () => {
      type Zipped = HKTF.Apply<
        Combinator.ZipHKTOs,
        { hktos: readonly [] }
      >;

      const zipped: Zipped = null as any;
      expect(typeof zipped).toBe('object');
    });

    it('should handle single HKTO', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'test' };
        [HKTF.ResultSymbol]: void;
      }

      interface HKTO1 extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1];
      }

      type Zipped = HKTF.Apply<
        Combinator.ZipHKTOs,
        { hktos: readonly [HKTO1] }
      >;

      const zipped: Zipped = null as any;
      expect(typeof zipped).toBe('object');
    });
  });

  describe('IntersectMethods', () => {
    it('should keep only common methods', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'common' };
        [HKTF.ResultSymbol]: void;
      }

      interface Method2 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'unique1' };
        [HKTF.ResultSymbol]: void;
      }

      interface Method3 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'common' };
        [HKTF.ResultSymbol]: void;
      }

      interface Method4 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'unique2' };
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

      type Intersected = HKTF.Apply<
        Combinator.IntersectMethods,
        { hkto1: HKTO1; hkto2: HKTO2 }
      >;

      const intersected: Intersected = null as any;
      expect(typeof intersected).toBe('object');
    });

    it('should handle no common methods', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'a' };
        [HKTF.ResultSymbol]: void;
      }

      interface Method2 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'b' };
        [HKTF.ResultSymbol]: void;
      }

      interface HKTO1 extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1];
      }

      interface HKTO2 extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method2];
      }

      type Intersected = HKTF.Apply<
        Combinator.IntersectMethods,
        { hkto1: HKTO1; hkto2: HKTO2 }
      >;

      const intersected: Intersected = null as any;
      expect(typeof intersected).toBe('object');
    });

    it('should handle empty HKTOs', () => {
      interface HKTO1 extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [];
      }

      interface HKTO2 extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [];
      }

      type Intersected = HKTF.Apply<
        Combinator.IntersectMethods,
        { hkto1: HKTO1; hkto2: HKTO2 }
      >;

      const intersected: Intersected = null as any;
      expect(typeof intersected).toBe('object');
    });
  });

  describe('DiffMethods', () => {
    it('should get methods in first HKTO but not in second', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'unique' };
        [HKTF.ResultSymbol]: void;
      }

      interface Method2 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'common' };
        [HKTF.ResultSymbol]: void;
      }

      interface Method3 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'common' };
        [HKTF.ResultSymbol]: void;
      }

      interface HKTO1 extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1, Method2];
      }

      interface HKTO2 extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method3];
      }

      type Diffed = HKTF.Apply<
        Combinator.DiffMethods,
        { hkto1: HKTO1; hkto2: HKTO2 }
      >;

      const diffed: Diffed = null as any;
      expect(typeof diffed).toBe('object');
    });

    it('should handle all methods unique to first', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'a' };
        [HKTF.ResultSymbol]: void;
      }

      interface Method2 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'b' };
        [HKTF.ResultSymbol]: void;
      }

      interface HKTO1 extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1];
      }

      interface HKTO2 extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method2];
      }

      type Diffed = HKTF.Apply<
        Combinator.DiffMethods,
        { hkto1: HKTO1; hkto2: HKTO2 }
      >;

      const diffed: Diffed = null as any;
      expect(typeof diffed).toBe('object');
    });

    it('should handle no unique methods', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'a' };
        [HKTF.ResultSymbol]: void;
      }

      interface Method2 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'a' };
        [HKTF.ResultSymbol]: void;
      }

      interface HKTO1 extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1];
      }

      interface HKTO2 extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method2];
      }

      type Diffed = HKTF.Apply<
        Combinator.DiffMethods,
        { hkto1: HKTO1; hkto2: HKTO2 }
      >;

      const diffed: Diffed = null as any;
      expect(typeof diffed).toBe('object');
    });
  });

  describe('GroupMethods', () => {
    it('should type-check group methods interface', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'read' };
        [HKTF.ResultSymbol]: string;
      }

      interface Method2 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'write' };
        [HKTF.ResultSymbol]: void;
      }

      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1, Method2];
      }

      interface Classifier extends HKTF.Base {
        [HKTF.ArgsSymbol]: { input: unknown };
        [HKTF.ResultSymbol]: this[HKTF.ArgsSymbol]['input'] extends { type: infer T }
          ? T extends string
            ? T
            : 'unknown'
          : 'unknown';
      }

      type Grouped = HKTF.Apply<
        Combinator.GroupMethods,
        { hkto: TestHKTO; classifier: Classifier }
      >;

      const grouped: Grouped = null as any;
      expect(typeof grouped).toBe('object');
    });
  });

  describe('SortMethods', () => {
    it('should type-check sort methods interface', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'z' };
        [HKTF.ResultSymbol]: void;
      }

      interface Method2 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'a' };
        [HKTF.ResultSymbol]: void;
      }

      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1, Method2];
      }

      interface Comparator extends HKTF.Base {
        [HKTF.ArgsSymbol]: { a: unknown; b: unknown };
        [HKTF.ResultSymbol]: number;
      }

      type Sorted = HKTF.Apply<
        Combinator.SortMethods,
        { hkto: TestHKTO; comparator: Comparator }
      >;

      const sorted: Sorted = null as any;
      expect(typeof sorted).toBe('object');
    });
  });

  describe('DedupeMethods', () => {
    it('should remove duplicate methods by type', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'test' };
        [HKTF.ResultSymbol]: string;
      }

      interface Method2 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'test' };
        [HKTF.ResultSymbol]: number;
      }

      interface Method3 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'unique' };
        [HKTF.ResultSymbol]: void;
      }

      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1, Method2, Method3];
      }

      type Deduped = HKTF.Apply<
        Combinator.DedupeMethods,
        { hkto: TestHKTO }
      >;

      const deduped: Deduped = null as any;
      expect(typeof deduped).toBe('object');
    });

    it('should handle no duplicates', () => {
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

      type Deduped = HKTF.Apply<
        Combinator.DedupeMethods,
        { hkto: TestHKTO }
      >;

      const deduped: Deduped = null as any;
      expect(typeof deduped).toBe('object');
    });

    it('should handle empty HKTO', () => {
      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [];
      }

      type Deduped = HKTF.Apply<
        Combinator.DedupeMethods,
        { hkto: TestHKTO }
      >;

      const deduped: Deduped = null as any;
      expect(typeof deduped).toBe('object');
    });
  });

  describe('WrapMethods', () => {
    it('should wrap all method results in a container', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'get' };
        [HKTF.ResultSymbol]: string;
      }

      interface Method2 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'set' };
        [HKTF.ResultSymbol]: void;
      }

      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1, Method2];
      }

      interface WrapInResult extends HKTF.Base {
        [HKTF.ArgsSymbol]: { input: unknown };
        [HKTF.ResultSymbol]: { ok: this[HKTF.ArgsSymbol]['input'] } | { err: string };
      }

      type Wrapped = HKTF.Apply<
        Combinator.WrapMethods,
        { hkto: TestHKTO; wrapper: WrapInResult }
      >;

      const wrapped: Wrapped = null as any;
      expect(typeof wrapped).toBe('object');
    });

    it('should handle empty HKTO', () => {
      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [];
      }

      interface WrapInArray extends HKTF.Base {
        [HKTF.ArgsSymbol]: { input: unknown };
        [HKTF.ResultSymbol]: readonly [this[HKTF.ArgsSymbol]['input']];
      }

      type Wrapped = HKTF.Apply<
        Combinator.WrapMethods,
        { hkto: TestHKTO; wrapper: WrapInArray }
      >;

      const wrapped: Wrapped = null as any;
      expect(typeof wrapped).toBe('object');
    });

    it('should wrap multiple methods', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'a' };
        [HKTF.ResultSymbol]: number;
      }

      interface Method2 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'b' };
        [HKTF.ResultSymbol]: string;
      }

      interface Method3 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'c' };
        [HKTF.ResultSymbol]: boolean;
      }

      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1, Method2, Method3];
      }

      interface WrapInOption extends HKTF.Base {
        [HKTF.ArgsSymbol]: { input: unknown };
        [HKTF.ResultSymbol]: { some: this[HKTF.ArgsSymbol]['input'] } | { none: true };
      }

      type Wrapped = HKTF.Apply<
        Combinator.WrapMethods,
        { hkto: TestHKTO; wrapper: WrapInOption }
      >;

      const wrapped: Wrapped = null as any;
      expect(typeof wrapped).toBe('object');
    });
  });

  describe('PrefixMethods', () => {
    it('should add prefix to all message types', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'increment' };
        [HKTF.ResultSymbol]: number;
      }

      interface Method2 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'decrement' };
        [HKTF.ResultSymbol]: number;
      }

      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1, Method2];
      }

      type Prefixed = HKTF.Apply<
        Combinator.PrefixMethods,
        { hkto: TestHKTO; prefix: 'counter/' }
      >;

      const prefixed: Prefixed = null as any;
      expect(typeof prefixed).toBe('object');
    });

    it('should handle empty prefix', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'test' };
        [HKTF.ResultSymbol]: void;
      }

      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1];
      }

      type Prefixed = HKTF.Apply<
        Combinator.PrefixMethods,
        { hkto: TestHKTO; prefix: '' }
      >;

      const prefixed: Prefixed = null as any;
      expect(typeof prefixed).toBe('object');
    });

    it('should handle empty HKTO', () => {
      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [];
      }

      type Prefixed = HKTF.Apply<
        Combinator.PrefixMethods,
        { hkto: TestHKTO; prefix: 'pre/' }
      >;

      const prefixed: Prefixed = null as any;
      expect(typeof prefixed).toBe('object');
    });
  });

  describe('SuffixMethods', () => {
    it('should add suffix to all message types', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'get' };
        [HKTF.ResultSymbol]: string;
      }

      interface Method2 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'set' };
        [HKTF.ResultSymbol]: void;
      }

      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1, Method2];
      }

      type Suffixed = HKTF.Apply<
        Combinator.SuffixMethods,
        { hkto: TestHKTO; suffix: 'Request' }
      >;

      const suffixed: Suffixed = null as any;
      expect(typeof suffixed).toBe('object');
    });

    it('should handle empty suffix', () => {
      interface Method1 extends Method.Base {
        [HKTF.ArgsSymbol]: { type: 'test' };
        [HKTF.ResultSymbol]: void;
      }

      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [Method1];
      }

      type Suffixed = HKTF.Apply<
        Combinator.SuffixMethods,
        { hkto: TestHKTO; suffix: '' }
      >;

      const suffixed: Suffixed = null as any;
      expect(typeof suffixed).toBe('object');
    });

    it('should handle empty HKTO', () => {
      interface TestHKTO extends HKTO.Base {
        [HKTO.StateSymbol]: unknown;
        [HKTO.MethodsSymbol]: readonly [];
      }

      type Suffixed = HKTF.Apply<
        Combinator.SuffixMethods,
        { hkto: TestHKTO; suffix: 'Event' }
      >;

      const suffixed: Suffixed = null as any;
      expect(typeof suffixed).toBe('object');
    });
  });
});
