import { describe, it, expect } from 'bun:test';
import { NonEmptyArray, nea } from '../src/index.js';

describe('NonEmptyArray', () => {
  describe('Construction', () => {
    it('should create with of', () => {
      const arr = NonEmptyArray.of(1, 2, 3);
      expect(arr.toArray()).toEqual([1, 2, 3]);
    });

    it('should create with convenience function', () => {
      const arr = nea(1, 2, 3);
      expect(arr.toArray()).toEqual([1, 2, 3]);
    });

    it('should create from array', () => {
      const arr = NonEmptyArray.fromArray([1, 2, 3]);
      expect(arr.toArray()).toEqual([1, 2, 3]);
    });

    it('should throw when creating from empty array', () => {
      expect(() => NonEmptyArray.fromArray([])).toThrow();
    });

    it('should return None for empty array with fromArrayOption', () => {
      const opt = NonEmptyArray.fromArrayOption([]);
      expect(opt.isNone()).toBe(true);
    });

    it('should return Some for non-empty array with fromArrayOption', () => {
      const opt = NonEmptyArray.fromArrayOption([1, 2]);
      expect(opt.isSome()).toBe(true);
      if (opt.isSome()) {
        expect(opt.value.toArray()).toEqual([1, 2]);
      }
    });
  });

  describe('Access', () => {
    const arr = nea(1, 2, 3, 4, 5);

    it('should get head', () => {
      expect(arr.head()).toBe(1);
    });

    it('should get tail', () => {
      expect(arr.tail()).toEqual([2, 3, 4, 5]);
    });

    it('should get last', () => {
      expect(arr.last()).toBe(5);
    });

    it('should get init', () => {
      expect(arr.init()).toEqual([1, 2, 3, 4]);
    });

    it('should get length', () => {
      expect(arr.length()).toBe(5);
    });

    it('should get element at index', () => {
      const el = arr.get(2);
      expect(el.isSome()).toBe(true);
      if (el.isSome()) {
        expect(el.value).toBe(3);
      }
    });

    it('should return None for out of bounds', () => {
      expect(arr.get(10).isNone()).toBe(true);
      expect(arr.get(-1).isNone()).toBe(true);
    });
  });

  describe('Transformations', () => {
    it('should map', () => {
      const arr = nea(1, 2, 3);
      const mapped = arr.map(x => x * 2);
      expect(mapped.toArray()).toEqual([2, 4, 6]);
    });

    it('should flatMap', () => {
      const arr = nea(1, 2);
      const flatMapped = arr.flatMap(x => nea(x, x * 10));
      expect(flatMapped.toArray()).toEqual([1, 10, 2, 20]);
    });

    it('should filter', () => {
      const arr = nea(1, 2, 3, 4, 5);
      const filtered = arr.filter(x => x % 2 === 0);
      expect(filtered).toEqual([2, 4]);
    });

    it('should reverse', () => {
      const arr = nea(1, 2, 3);
      expect(arr.reverse().toArray()).toEqual([3, 2, 1]);
    });

    it('should sort', () => {
      const arr = nea(3, 1, 2);
      expect(arr.sort().toArray()).toEqual([1, 2, 3]);
    });
  });

  describe('Reduction', () => {
    it('should reduce with initial value', () => {
      const arr = nea(1, 2, 3);
      const sum = arr.reduce((acc, x) => acc + x, 0);
      expect(sum).toBe(6);
    });

    it('should reduce without initial value', () => {
      const arr = nea(1, 2, 3);
      const sum = arr.reduce1((acc, x) => acc + x);
      expect(sum).toBe(6);
    });

    it('should reduce1 with single element', () => {
      const arr = nea(42);
      expect(arr.reduce1((a, b) => a + b)).toBe(42);
    });
  });

  describe('Modification', () => {
    it('should append', () => {
      const arr = nea(1, 2);
      expect(arr.append(3).toArray()).toEqual([1, 2, 3]);
    });

    it('should prepend', () => {
      const arr = nea(2, 3);
      expect(arr.prepend(1).toArray()).toEqual([1, 2, 3]);
    });

    it('should concat', () => {
      const arr1 = nea(1, 2);
      const arr2 = nea(3, 4);
      expect(arr1.concat(arr2).toArray()).toEqual([1, 2, 3, 4]);
    });
  });

  describe('Search', () => {
    const arr = nea(1, 2, 3, 4, 5);

    it('should check includes', () => {
      expect(arr.includes(3)).toBe(true);
      expect(arr.includes(10)).toBe(false);
    });

    it('should find element', () => {
      const found = arr.find(x => x > 3);
      expect(found.isSome()).toBe(true);
      if (found.isSome()) {
        expect(found.value).toBe(4);
      }
    });

    it('should return None when not found', () => {
      const found = arr.find(x => x > 10);
      expect(found.isNone()).toBe(true);
    });

    it('should find index', () => {
      const index = arr.findIndex(x => x === 3);
      expect(index.isSome()).toBe(true);
      if (index.isSome()) {
        expect(index.value).toBe(2);
      }
    });
  });

  describe('Combining', () => {
    it('should zip', () => {
      const arr1 = nea(1, 2, 3);
      const arr2 = nea('a', 'b', 'c');
      const zipped = arr1.zip(arr2);
      expect(zipped.toArray()).toEqual([[1, 'a'], [2, 'b'], [3, 'c']]);
    });

    it('should zipWith', () => {
      const arr1 = nea(1, 2, 3);
      const arr2 = nea(10, 20, 30);
      const zipped = arr1.zipWith(arr2, (a, b) => a + b);
      expect(zipped.toArray()).toEqual([11, 22, 33]);
    });

    it('should zip with different lengths', () => {
      const arr1 = nea(1, 2, 3, 4);
      const arr2 = nea('a', 'b');
      const zipped = arr1.zip(arr2);
      expect(zipped.toArray()).toEqual([[1, 'a'], [2, 'b']]);
    });
  });

  describe('Special operations', () => {
    it('should intersperse', () => {
      const arr = nea(1, 2, 3);
      expect(arr.intersperse(0).toArray()).toEqual([1, 0, 2, 0, 3]);
    });

    it('should not intersperse single element', () => {
      const arr = nea(1);
      expect(arr.intersperse(0).toArray()).toEqual([1]);
    });

    it('should group consecutive elements', () => {
      const arr = nea(1, 1, 2, 2, 2, 3, 1);
      const grouped = arr.group();
      expect(grouped.map(g => g.toArray()).toArray()).toEqual([
        [1, 1],
        [2, 2, 2],
        [3],
        [1],
      ]);
    });
  });

  describe('Iterator', () => {
    it('should be iterable', () => {
      const arr = nea(1, 2, 3);
      const result = [];
      for (const x of arr) {
        result.push(x);
      }
      expect(result).toEqual([1, 2, 3]);
    });

    it('should work with spread', () => {
      const arr = nea(1, 2, 3);
      expect([...arr]).toEqual([1, 2, 3]);
    });
  });

  describe('Type safety', () => {
    it('should guarantee head is never undefined', () => {
      const arr = nea(42);
      const head: number = arr.head(); // Type is number, not number | undefined
      expect(head).toBe(42);
    });

    it('should guarantee last is never undefined', () => {
      const arr = nea(1, 2, 42);
      const last: number = arr.last(); // Type is number, not number | undefined
      expect(last).toBe(42);
    });

    it('should guarantee reduce1 works without initial value', () => {
      const arr = nea(1, 2, 3);
      const sum: number = arr.reduce1((a, b) => a + b);
      expect(sum).toBe(6);
    });
  });
});
