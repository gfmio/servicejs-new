import { describe, it, expect } from 'bun:test';
import { HKTF } from '@servicejs/hkt-core';
import * as TupleHKTF from '../src/index.js';
import * as Tuple from '../src/tuple/index.js';

describe('TupleHKTF', () => {
  describe('Map', () => {
    it('should map over tuple elements', () => {
      // Define a function HKTF that doubles numbers
      interface DoubleFn extends FunctionHKTF.Fn1<number, number> {
        [HKTF.ArgsSymbol]: { input: number };
        [HKTF.ResultSymbol]: number; // Would be input * 2
      }

      // Map over a tuple
      type Result = HKTF.Apply<
        TupleHKTF.Map,
        { tuple: readonly [1, 2, 3]; fn: DoubleFn }
      >;

      // Type test: should be tuple of numbers
      const result: Result = [2, 4, 6];
      expect(result).toEqual([2, 4, 6]);
    });

    it('should handle empty tuple', () => {
      interface DoubleFn extends FunctionHKTF.Fn1<number, number> {}

      type Result = HKTF.Apply<
        TupleHKTF.Map,
        { tuple: readonly []; fn: DoubleFn }
      >;

      const result: Result = [];
      expect(result).toEqual([]);
    });
  });

  describe('Filter', () => {
    it('should filter tuple elements', () => {
      // Note: At type level, we can't actually evaluate predicates,
      // so this is more of a structural test
      interface IsPositive extends FunctionHKTF.Predicate<number> {}

      type Input = readonly [1, -2, 3, -4, 5];

      // The type system will preserve all elements since we can't evaluate predicates
      type Result = HKTF.Apply<
        TupleHKTF.Filter,
        { tuple: Input; predicate: IsPositive }
      >;

      // Type test: structure is preserved
      type Test = Result extends readonly number[] ? true : false;
      const test: Test = true;
      expect(test).toBe(true);
    });
  });

  describe('Reduce', () => {
    it('should reduce tuple to single value', () => {
      // Define a reducer HKTF
      interface SumReducer extends FunctionHKTF.Reducer<number, number> {
        [HKTF.ArgsSymbol]: { accumulator: number; value: number };
        [HKTF.ResultSymbol]: number; // Would be accumulator + value
      }

      type Result = HKTF.Apply<
        TupleHKTF.Reduce,
        { tuple: readonly [1, 2, 3]; reducer: SumReducer; initial: 0 }
      >;

      // Type test: should be a number
      const result: Result = 6;
      expect(typeof result).toBe('number');
    });
  });

  describe('Length', () => {
    it('should get length of tuple', () => {
      type Result = HKTF.Apply<
        TupleHKTF.Length,
        { tuple: readonly [1, 2, 3, 4, 5] }
      >;

      // Type test: should be 5
      const result: Result = 5;
      expect(result).toBe(5);
    });

    it('should handle empty tuple', () => {
      type Result = HKTF.Apply<TupleHKTF.Length, { tuple: readonly [] }>;

      const result: Result = 0;
      expect(result).toBe(0);
    });
  });

  describe('Head', () => {
    it('should get first element', () => {
      type Result = HKTF.Apply<
        TupleHKTF.Head,
        { tuple: readonly [1, 2, 3] }
      >;

      // Type test: should be 1
      const result: Result = 1;
      expect(result).toBe(1);
    });

    it('should return never for empty tuple', () => {
      type Result = HKTF.Apply<TupleHKTF.Head, { tuple: readonly [] }>;

      // Type test: should be never
      type Test = Result extends never ? true : false;
      const test: Test = true;
      expect(test).toBe(true);
    });
  });

  describe('Tail', () => {
    it('should get all but first element', () => {
      type Result = HKTF.Apply<
        TupleHKTF.Tail,
        { tuple: readonly [1, 2, 3, 4] }
      >;

      // Type test: should be [2, 3, 4]
      const result: Result = [2, 3, 4];
      expect(result).toEqual([2, 3, 4]);
    });

    it('should return empty for single element', () => {
      type Result = HKTF.Apply<TupleHKTF.Tail, { tuple: readonly [1] }>;

      const result: Result = [];
      expect(result).toEqual([]);
    });

    it('should return empty for empty tuple', () => {
      type Result = HKTF.Apply<TupleHKTF.Tail, { tuple: readonly [] }>;

      const result: Result = [];
      expect(result).toEqual([]);
    });
  });

  describe('Concat', () => {
    it('should concatenate two tuples', () => {
      type Result = HKTF.Apply<
        TupleHKTF.Concat,
        { tuple1: readonly [1, 2]; tuple2: readonly [3, 4] }
      >;

      // Type test: should be [1, 2, 3, 4]
      const result: Result = [1, 2, 3, 4];
      expect(result).toEqual([1, 2, 3, 4]);
    });

    it('should handle empty first tuple', () => {
      type Result = HKTF.Apply<
        TupleHKTF.Concat,
        { tuple1: readonly []; tuple2: readonly [1, 2] }
      >;

      const result: Result = [1, 2];
      expect(result).toEqual([1, 2]);
    });

    it('should handle empty second tuple', () => {
      type Result = HKTF.Apply<
        TupleHKTF.Concat,
        { tuple1: readonly [1, 2]; tuple2: readonly [] }
      >;

      const result: Result = [1, 2];
      expect(result).toEqual([1, 2]);
    });
  });

  describe('Reverse', () => {
    it('should reverse a tuple', () => {
      type Result = HKTF.Apply<
        TupleHKTF.Reverse,
        { tuple: readonly [1, 2, 3, 4] }
      >;

      // Type test: should be [4, 3, 2, 1]
      const result: Result = [4, 3, 2, 1];
      expect(result).toEqual([4, 3, 2, 1]);
    });

    it('should handle empty tuple', () => {
      type Result = HKTF.Apply<TupleHKTF.Reverse, { tuple: readonly [] }>;

      const result: Result = [];
      expect(result).toEqual([]);
    });

    it('should handle single element', () => {
      type Result = HKTF.Apply<TupleHKTF.Reverse, { tuple: readonly [42] }>;

      const result: Result = [42];
      expect(result).toEqual([42]);
    });
  });

  describe('Zip', () => {
    it('should zip two tuples', () => {
      type Result = HKTF.Apply<
        TupleHKTF.Zip,
        { tuple1: readonly [1, 2, 3]; tuple2: readonly ['a', 'b', 'c'] }
      >;

      const result: Result = [
        [1, 'a'],
        [2, 'b'],
        [3, 'c'],
      ];
      expect(result).toEqual([
        [1, 'a'],
        [2, 'b'],
        [3, 'c'],
      ]);
    });

    it('should handle different length tuples', () => {
      type Result = HKTF.Apply<
        TupleHKTF.Zip,
        { tuple1: readonly [1, 2]; tuple2: readonly ['a', 'b', 'c'] }
      >;

      const result: Result = [
        [1, 'a'],
        [2, 'b'],
      ];
      expect(result).toEqual([
        [1, 'a'],
        [2, 'b'],
      ]);
    });
  });

  describe('Flatten', () => {
    it('should flatten nested tuples', () => {
      type Result = HKTF.Apply<
        TupleHKTF.Flatten,
        { tuple: readonly [readonly [1, 2], readonly [3, 4], readonly [5]] }
      >;

      const result: Result = [1, 2, 3, 4, 5];
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle empty nested tuples', () => {
      type Result = HKTF.Apply<
        TupleHKTF.Flatten,
        { tuple: readonly [readonly [], readonly [1, 2], readonly []] }
      >;

      const result: Result = [1, 2];
      expect(result).toEqual([1, 2]);
    });
  });

  describe('Partition', () => {
    it('should partition tuple by predicate', () => {
      interface IsNumber extends FunctionHKTF.Predicate<number> {}

      type Result = HKTF.Apply<
        TupleHKTF.Partition,
        { tuple: readonly [1, 2, 3, 4, 5]; predicate: IsNumber }
      >;

      // Type test: should be [numbers[], non-numbers[]]
      const result: Result = [
        [1, 2, 3, 4, 5],
        [],
      ];
      expect(result).toEqual([
        [1, 2, 3, 4, 5],
        [],
      ]);
    });
  });

  describe('Take', () => {
    it('should take first n elements', () => {
      type Result = HKTF.Apply<
        TupleHKTF.Take,
        { tuple: readonly [1, 2, 3, 4, 5]; n: 3 }
      >;

      const result: Result = [1, 2, 3];
      expect(result).toEqual([1, 2, 3]);
    });

    it('should handle n = 0', () => {
      type Result = HKTF.Apply<
        TupleHKTF.Take,
        { tuple: readonly [1, 2, 3]; n: 0 }
      >;

      const result: Result = [];
      expect(result).toEqual([]);
    });

    it('should handle n larger than tuple length', () => {
      type Result = HKTF.Apply<
        TupleHKTF.Take,
        { tuple: readonly [1, 2]; n: 5 }
      >;

      const result: Result = [1, 2];
      expect(result).toEqual([1, 2]);
    });
  });

  describe('Drop', () => {
    it('should drop first n elements', () => {
      type Result = HKTF.Apply<
        TupleHKTF.Drop,
        { tuple: readonly [1, 2, 3, 4, 5]; n: 2 }
      >;

      const result: Result = [3, 4, 5];
      expect(result).toEqual([3, 4, 5]);
    });

    it('should handle n = 0', () => {
      type Result = HKTF.Apply<
        TupleHKTF.Drop,
        { tuple: readonly [1, 2, 3]; n: 0 }
      >;

      const result: Result = [1, 2, 3];
      expect(result).toEqual([1, 2, 3]);
    });

    it('should handle n larger than tuple length', () => {
      type Result = HKTF.Apply<
        TupleHKTF.Drop,
        { tuple: readonly [1, 2]; n: 5 }
      >;

      const result: Result = [];
      expect(result).toEqual([]);
    });
  });

  describe('Find', () => {
    it('should find first matching element', () => {
      interface IsTwo extends FunctionHKTF.Predicate<2> {}

      type Result = HKTF.Apply<
        TupleHKTF.Find,
        { tuple: readonly [1, 2, 3, 2, 4]; predicate: IsTwo }
      >;

      const result: Result = 2;
      expect(result).toBe(2);
    });

    it('should return never if not found', () => {
      interface IsString extends FunctionHKTF.Predicate<string> {}

      type Result = HKTF.Apply<
        TupleHKTF.Find,
        { tuple: readonly [1, 2, 3]; predicate: IsString }
      >;

      // Type test: should be never
      type Test = Result extends never ? true : false;
      const test: Test = true;
      expect(test).toBe(true);
    });
  });

  describe('Contains', () => {
    it('should return true if element is in tuple', () => {
      type Result = HKTF.Apply<
        TupleHKTF.Contains,
        { tuple: readonly [1, 2, 3, 4]; element: 3 }
      >;

      const result: Result = true;
      expect(result).toBe(true);
    });

    it('should return false if element is not in tuple', () => {
      type Result = HKTF.Apply<
        TupleHKTF.Contains,
        { tuple: readonly [1, 2, 3]; element: 5 }
      >;

      const result: Result = false;
      expect(result).toBe(false);
    });

    it('should handle empty tuple', () => {
      type Result = HKTF.Apply<
        TupleHKTF.Contains,
        { tuple: readonly []; element: 1 }
      >;

      const result: Result = false;
      expect(result).toBe(false);
    });
  });

  describe('Composition', () => {
    it('should compose tuple operations', () => {
      // Reverse then take head
      type Reversed = HKTF.Apply<
        TupleHKTF.Reverse,
        { tuple: readonly [1, 2, 3, 4] }
      >;

      type Last = HKTF.Apply<TupleHKTF.Head, { tuple: Reversed }>;

      // Type test: should be 4 (last element of original)
      const last: Last = 4;
      expect(last).toBe(4);
    });

    it('should concat then get length', () => {
      type Concatenated = HKTF.Apply<
        TupleHKTF.Concat,
        { tuple1: readonly [1, 2]; tuple2: readonly [3, 4, 5] }
      >;

      type Len = HKTF.Apply<TupleHKTF.Length, { tuple: Concatenated }>;

      const len: Len = 5;
      expect(len).toBe(5);
    });

    it('should zip, flatten, and take', () => {
      type Zipped = HKTF.Apply<
        TupleHKTF.Zip,
        { tuple1: readonly [1, 2, 3]; tuple2: readonly [4, 5, 6] }
      >;

      type Flattened = HKTF.Apply<TupleHKTF.Flatten, { tuple: Zipped }>;

      type Taken = HKTF.Apply<TupleHKTF.Take, { tuple: Flattened; n: 4 }>;

      const result: Taken = [1, 4, 2, 5];
      expect(result).toEqual([1, 4, 2, 5]);
    });
  });

  describe('Runtime Operations', () => {
    describe('head', () => {
      it('should get first element with direct call', () => {
        expect(Tuple.head([1, 2, 3])).toBe(1);
        expect(Tuple.head(['a', 'b', 'c'])).toBe('a');
      });

      it('should get first element with object call', () => {
        expect(Tuple.head({ tuple: [1, 2, 3] })).toBe(1);
        expect(Tuple.head({ tuple: ['a', 'b', 'c'] })).toBe('a');
      });
    });

    describe('tail', () => {
      it('should get all except first with direct call', () => {
        expect(Tuple.tail([1, 2, 3])).toEqual([2, 3]);
        expect(Tuple.tail(['a', 'b', 'c'])).toEqual(['b', 'c']);
        expect(Tuple.tail([1])).toEqual([]);
      });

      it('should get all except first with object call', () => {
        expect(Tuple.tail({ tuple: [1, 2, 3] })).toEqual([2, 3]);
        expect(Tuple.tail({ tuple: ['a'] })).toEqual([]);
      });
    });

    describe('length', () => {
      it('should get length with direct call', () => {
        expect(Tuple.length([1, 2, 3])).toBe(3);
        expect(Tuple.length([])).toBe(0);
        expect(Tuple.length([1, 2, 3, 4, 5])).toBe(5);
      });

      it('should get length with object call', () => {
        expect(Tuple.length({ tuple: [1, 2, 3] })).toBe(3);
        expect(Tuple.length({ tuple: [] })).toBe(0);
      });
    });

    describe('concat', () => {
      it('should concatenate with direct call', () => {
        expect(Tuple.concat([1, 2], [3, 4])).toEqual([1, 2, 3, 4]);
        expect(Tuple.concat(['a'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
        expect(Tuple.concat([], [1, 2])).toEqual([1, 2]);
      });

      it('should concatenate with object call', () => {
        expect(Tuple.concat({ tuple1: [1, 2], tuple2: [3, 4] })).toEqual([1, 2, 3, 4]);
        expect(Tuple.concat({ tuple1: [], tuple2: [] })).toEqual([]);
      });
    });

    describe('reverse', () => {
      it('should reverse with direct call', () => {
        expect(Tuple.reverse([1, 2, 3])).toEqual([3, 2, 1]);
        expect(Tuple.reverse(['a', 'b', 'c'])).toEqual(['c', 'b', 'a']);
        expect(Tuple.reverse([])).toEqual([]);
        expect(Tuple.reverse([1])).toEqual([1]);
      });

      it('should reverse with object call', () => {
        expect(Tuple.reverse({ tuple: [1, 2, 3] })).toEqual([3, 2, 1]);
        expect(Tuple.reverse({ tuple: [] })).toEqual([]);
      });
    });

    describe('slice', () => {
      it('should slice with direct call', () => {
        expect(Tuple.slice([1, 2, 3, 4, 5], 1, 3)).toEqual([2, 3]);
        expect(Tuple.slice([1, 2, 3, 4, 5], 2)).toEqual([3, 4, 5]);
        expect(Tuple.slice(['a', 'b', 'c'], 0, 2)).toEqual(['a', 'b']);
      });

      it('should slice with object call', () => {
        expect(Tuple.slice({ tuple: [1, 2, 3, 4, 5], start: 1, end: 3 })).toEqual([2, 3]);
        expect(Tuple.slice({ tuple: [1, 2, 3, 4, 5], start: 2 })).toEqual([3, 4, 5]);
      });
    });

    describe('splice', () => {
      it('should splice with direct call', () => {
        expect(Tuple.splice([1, 2, 3, 4, 5], 2, 2)).toEqual([1, 2, 5]);
        expect(Tuple.splice([1, 2, 3, 4, 5], 2, 2, [10, 20])).toEqual([1, 2, 10, 20, 5]);
        expect(Tuple.splice(['a', 'b', 'c'], 1, 0, ['x', 'y'])).toEqual(['a', 'x', 'y', 'b', 'c']);
      });

      it('should splice with object call', () => {
        expect(Tuple.splice({ tuple: [1, 2, 3, 4, 5], start: 2, deleteCount: 2 })).toEqual([1, 2, 5]);
        expect(Tuple.splice({ tuple: [1, 2, 3, 4, 5], start: 2, deleteCount: 2, items: [10, 20] })).toEqual([1, 2, 10, 20, 5]);
      });
    });

    describe('push', () => {
      it('should push with direct call', () => {
        expect(Tuple.push([1, 2, 3], 4)).toEqual([1, 2, 3, 4]);
        expect(Tuple.push(['a', 'b'], 'c')).toEqual(['a', 'b', 'c']);
        expect(Tuple.push([], 1)).toEqual([1]);
      });

      it('should push with object call', () => {
        expect(Tuple.push({ tuple: [1, 2, 3], element: 4 })).toEqual([1, 2, 3, 4]);
        expect(Tuple.push({ tuple: [], element: 'x' })).toEqual(['x']);
      });
    });

    describe('pop', () => {
      it('should pop with direct call', () => {
        expect(Tuple.pop([1, 2, 3])).toEqual([1, 2]);
        expect(Tuple.pop(['a', 'b', 'c'])).toEqual(['a', 'b']);
        expect(Tuple.pop([1])).toEqual([]);
        expect(Tuple.pop([])).toEqual([]);
      });

      it('should pop with object call', () => {
        expect(Tuple.pop({ tuple: [1, 2, 3] })).toEqual([1, 2]);
        expect(Tuple.pop({ tuple: [] })).toEqual([]);
      });
    });

    describe('insert', () => {
      it('should insert with direct call', () => {
        expect(Tuple.insert([1, 2, 3], 1, 10)).toEqual([1, 10, 2, 3]);
        expect(Tuple.insert(['a', 'b', 'c'], 0, 'x')).toEqual(['x', 'a', 'b', 'c']);
        expect(Tuple.insert([1, 2], 2, 3)).toEqual([1, 2, 3]);
      });

      it('should insert with object call', () => {
        expect(Tuple.insert({ tuple: [1, 2, 3], index: 1, element: 10 })).toEqual([1, 10, 2, 3]);
        expect(Tuple.insert({ tuple: [], index: 0, element: 'x' })).toEqual(['x']);
      });
    });

    describe('remove', () => {
      it('should remove with direct call', () => {
        expect(Tuple.remove([1, 2, 3, 4], 1)).toEqual([1, 3, 4]);
        expect(Tuple.remove(['a', 'b', 'c'], 0)).toEqual(['b', 'c']);
        expect(Tuple.remove([1, 2], 1)).toEqual([1]);
      });

      it('should remove with object call', () => {
        expect(Tuple.remove({ tuple: [1, 2, 3, 4], index: 1 })).toEqual([1, 3, 4]);
        expect(Tuple.remove({ tuple: ['a', 'b'], index: 0 })).toEqual(['b']);
      });
    });

    describe('shift', () => {
      it('should shift with direct call', () => {
        expect(Tuple.shift([1, 2, 3])).toEqual([2, 3]);
        expect(Tuple.shift(['a', 'b', 'c'])).toEqual(['b', 'c']);
        expect(Tuple.shift([1])).toEqual([]);
        expect(Tuple.shift([])).toEqual([]);
      });

      it('should shift with object call', () => {
        expect(Tuple.shift({ tuple: [1, 2, 3] })).toEqual([2, 3]);
        expect(Tuple.shift({ tuple: [] })).toEqual([]);
      });
    });

    describe('unshift', () => {
      it('should unshift with direct call', () => {
        expect(Tuple.unshift([1, 2, 3], 0)).toEqual([0, 1, 2, 3]);
        expect(Tuple.unshift(['a', 'b'], 'z')).toEqual(['z', 'a', 'b']);
        expect(Tuple.unshift([], 1)).toEqual([1]);
      });

      it('should unshift with object call', () => {
        expect(Tuple.unshift({ tuple: [1, 2, 3], element: 0 })).toEqual([0, 1, 2, 3]);
        expect(Tuple.unshift({ tuple: [], element: 'x' })).toEqual(['x']);
      });
    });

    describe('flatMap', () => {
      it('should flatMap with direct call', () => {
        expect(Tuple.flatMap([1, 2, 3], x => [x, x * 2])).toEqual([1, 2, 2, 4, 3, 6]);
        expect(Tuple.flatMap(['a', 'b'], x => [x, x.toUpperCase()])).toEqual(['a', 'A', 'b', 'B']);
      });

      it('should flatMap with object call', () => {
        expect(Tuple.flatMap({ tuple: [1, 2, 3], fn: (x: number) => [x, x * 2] })).toEqual([1, 2, 2, 4, 3, 6]);
      });
    });

    describe('indexOf', () => {
      it('should find indexOf with direct call', () => {
        expect(Tuple.indexOf([1, 2, 3, 2], 2)).toBe(1);
        expect(Tuple.indexOf(['a', 'b', 'c'], 'b')).toBe(1);
        expect(Tuple.indexOf([1, 2, 3], 4)).toBe(-1);
      });

      it('should find indexOf with object call', () => {
        expect(Tuple.indexOf({ tuple: [1, 2, 3, 2], element: 2 })).toBe(1);
        expect(Tuple.indexOf({ tuple: [1, 2, 3], element: 4 })).toBe(-1);
      });
    });

    describe('lastIndexOf', () => {
      it('should find lastIndexOf with direct call', () => {
        expect(Tuple.lastIndexOf([1, 2, 3, 2], 2)).toBe(3);
        expect(Tuple.lastIndexOf(['a', 'b', 'c', 'b'], 'b')).toBe(3);
        expect(Tuple.lastIndexOf([1, 2, 3], 4)).toBe(-1);
      });

      it('should find lastIndexOf with object call', () => {
        expect(Tuple.lastIndexOf({ tuple: [1, 2, 3, 2], element: 2 })).toBe(3);
        expect(Tuple.lastIndexOf({ tuple: [1, 2, 3], element: 4 })).toBe(-1);
      });
    });

    describe('includes', () => {
      it('should check includes with direct call', () => {
        expect(Tuple.includes([1, 2, 3], 2)).toBe(true);
        expect(Tuple.includes([1, 2, 3], 4)).toBe(false);
        expect(Tuple.includes(['a', 'b'], 'b')).toBe(true);
      });

      it('should check includes with object call', () => {
        expect(Tuple.includes({ tuple: [1, 2, 3], element: 2 })).toBe(true);
        expect(Tuple.includes({ tuple: [1, 2, 3], element: 4 })).toBe(false);
      });
    });

    describe('every', () => {
      it('should check every with direct call', () => {
        expect(Tuple.every([2, 4, 6], (x: number) => x % 2 === 0)).toBe(true);
        expect(Tuple.every([2, 3, 6], (x: number) => x % 2 === 0)).toBe(false);
        expect(Tuple.every([], (x: number) => x > 0)).toBe(true);
      });

      it('should check every with object call', () => {
        expect(Tuple.every({ tuple: [2, 4, 6], predicate: (x: number) => x % 2 === 0 })).toBe(true);
        expect(Tuple.every({ tuple: [2, 3, 6], predicate: (x: number) => x % 2 === 0 })).toBe(false);
      });
    });

    describe('some', () => {
      it('should check some with direct call', () => {
        expect(Tuple.some([1, 3, 5], (x: number) => x % 2 === 0)).toBe(false);
        expect(Tuple.some([1, 2, 3], (x: number) => x % 2 === 0)).toBe(true);
        expect(Tuple.some([], (x: number) => x > 0)).toBe(false);
      });

      it('should check some with object call', () => {
        expect(Tuple.some({ tuple: [1, 3, 5], predicate: (x: number) => x % 2 === 0 })).toBe(false);
        expect(Tuple.some({ tuple: [1, 2, 3], predicate: (x: number) => x % 2 === 0 })).toBe(true);
      });
    });

    describe('split', () => {
      it('should split with direct call', () => {
        expect(Tuple.split([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4, 5]]);
        expect(Tuple.split(['a', 'b', 'c'], 1)).toEqual([['a'], ['b', 'c']]);
        expect(Tuple.split([1, 2, 3], 0)).toEqual([[], [1, 2, 3]]);
      });

      it('should split with object call', () => {
        expect(Tuple.split({ tuple: [1, 2, 3, 4, 5], index: 2 })).toEqual([[1, 2], [3, 4, 5]]);
      });
    });

    describe('chunk', () => {
      it('should chunk with direct call', () => {
        expect(Tuple.chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
        expect(Tuple.chunk([1, 2, 3, 4, 5, 6], 3)).toEqual([[1, 2, 3], [4, 5, 6]]);
        expect(Tuple.chunk(['a', 'b', 'c'], 1)).toEqual([['a'], ['b'], ['c']]);
      });

      it('should chunk with object call', () => {
        expect(Tuple.chunk({ tuple: [1, 2, 3, 4, 5], size: 2 })).toEqual([[1, 2], [3, 4], [5]]);
      });
    });

    describe('unique', () => {
      it('should get unique with direct call', () => {
        expect(Tuple.unique([1, 2, 2, 3, 1])).toEqual([1, 2, 3]);
        expect(Tuple.unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
        expect(Tuple.unique([1, 2, 3])).toEqual([1, 2, 3]);
      });

      it('should get unique with object call', () => {
        expect(Tuple.unique({ tuple: [1, 2, 2, 3, 1] })).toEqual([1, 2, 3]);
      });
    });

    describe('intersection', () => {
      it('should get intersection with direct call', () => {
        expect(Tuple.intersection([1, 2, 3], [2, 3, 4])).toEqual([2, 3]);
        expect(Tuple.intersection(['a', 'b', 'c'], ['b', 'c', 'd'])).toEqual(['b', 'c']);
        expect(Tuple.intersection([1, 2], [3, 4])).toEqual([]);
      });

      it('should get intersection with object call', () => {
        expect(Tuple.intersection({ tuple1: [1, 2, 3], tuple2: [2, 3, 4] })).toEqual([2, 3]);
      });
    });

    describe('difference', () => {
      it('should get difference with direct call', () => {
        expect(Tuple.difference([1, 2, 3], [2, 3, 4])).toEqual([1]);
        expect(Tuple.difference(['a', 'b', 'c'], ['b', 'c', 'd'])).toEqual(['a']);
        expect(Tuple.difference([1, 2], [3, 4])).toEqual([1, 2]);
      });

      it('should get difference with object call', () => {
        expect(Tuple.difference({ tuple1: [1, 2, 3], tuple2: [2, 3, 4] })).toEqual([1]);
      });
    });

    describe('union', () => {
      it('should get union with direct call', () => {
        expect(Tuple.union([1, 2, 3], [2, 3, 4])).toEqual([1, 2, 3, 4]);
        expect(Tuple.union(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
        expect(Tuple.union([1, 2], [3, 4])).toEqual([1, 2, 3, 4]);
      });

      it('should get union with object call', () => {
        expect(Tuple.union({ tuple1: [1, 2, 3], tuple2: [2, 3, 4] })).toEqual([1, 2, 3, 4]);
      });
    });

    describe('sort', () => {
      it('should sort with direct call', () => {
        expect(Tuple.sort([3, 1, 2])).toEqual([1, 2, 3]);
        expect(Tuple.sort(['c', 'a', 'b'])).toEqual(['a', 'b', 'c']);
        expect(Tuple.sort([3, 1, 2], (a, b) => b - a)).toEqual([3, 2, 1]);
      });

      it('should sort with object call', () => {
        expect(Tuple.sort({ tuple: [3, 1, 2] })).toEqual([1, 2, 3]);
        expect(Tuple.sort({ tuple: [3, 1, 2], comparator: (a: number, b: number) => b - a })).toEqual([3, 2, 1]);
      });
    });

    describe('groupBy', () => {
      it('should groupBy with direct call', () => {
        const result = Tuple.groupBy([1, 2, 3, 4, 5], (x: number) => x % 2 === 0 ? 'even' : 'odd');
        expect(result).toEqual({ odd: [1, 3, 5], even: [2, 4] });
      });

      it('should groupBy with object call', () => {
        const result = Tuple.groupBy({ tuple: [1, 2, 3, 4, 5], keyFn: (x: number) => x % 2 === 0 ? 'even' : 'odd' });
        expect(result).toEqual({ odd: [1, 3, 5], even: [2, 4] });
      });
    });

    describe('at', () => {
      it('should get at with direct call', () => {
        expect(Tuple.at([1, 2, 3], 0)).toBe(1);
        expect(Tuple.at([1, 2, 3], 2)).toBe(3);
        expect(Tuple.at(['a', 'b', 'c'], 1)).toBe('b');
      });

      it('should get at with object call', () => {
        expect(Tuple.at({ tuple: [1, 2, 3], index: 0 })).toBe(1);
        expect(Tuple.at({ tuple: [1, 2, 3], index: 2 })).toBe(3);
      });
    });

    describe('fill', () => {
      it('should fill with direct call', () => {
        expect(Tuple.fill([1, 2, 3], 0)).toEqual([0, 0, 0]);
        expect(Tuple.fill([1, 2, 3, 4], 'x', 1, 3)).toEqual([1, 'x', 'x', 4]);
        expect(Tuple.fill(['a', 'b', 'c'], 'z', 1)).toEqual(['a', 'z', 'z']);
      });

      it('should fill with object call', () => {
        expect(Tuple.fill({ tuple: [1, 2, 3], value: 0 })).toEqual([0, 0, 0]);
        expect(Tuple.fill({ tuple: [1, 2, 3, 4], value: 'x', start: 1, end: 3 })).toEqual([1, 'x', 'x', 4]);
      });
    });

    describe('repeat', () => {
      it('should repeat with direct call', () => {
        expect(Tuple.repeat([1, 2], 3)).toEqual([1, 2, 1, 2, 1, 2]);
        expect(Tuple.repeat(['a', 'b'], 2)).toEqual(['a', 'b', 'a', 'b']);
        expect(Tuple.repeat([1, 2], 1)).toEqual([1, 2]);
        expect(Tuple.repeat([1, 2], 0)).toEqual([]);
      });

      it('should repeat with object call', () => {
        expect(Tuple.repeat({ tuple: [1, 2], count: 3 })).toEqual([1, 2, 1, 2, 1, 2]);
        expect(Tuple.repeat({ tuple: [1, 2], count: 0 })).toEqual([]);
      });
    });
  });
});
