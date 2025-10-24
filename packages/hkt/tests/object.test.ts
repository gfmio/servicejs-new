import { describe, it, expect } from 'bun:test';
import { HKTF, ObjectHKTF, FunctionHKTF } from '../src/index.js';

describe('ObjectHKTF', () => {
  describe('MapValues', () => {
    it('should map over object values', () => {
      interface ToStringFn extends FunctionHKTF.Fn1<number, string> {}

      type Result = HKTF.Apply<
        ObjectHKTF.MapValues,
        { obj: { a: 1; b: 2; c: 3 }; fn: ToStringFn }
      >;

      const result: Result = { a: '1', b: '2', c: '3' };
      expect(result).toEqual({ a: '1', b: '2', c: '3' });
    });
  });

  describe('Pick', () => {
    it('should pick subset of keys', () => {
      type Result = HKTF.Apply<
        ObjectHKTF.PickHKTF,
        { obj: { a: 1; b: 2; c: 3 }; keys: readonly ['a', 'c'] }
      >;

      const result: Result = { a: 1, c: 3 };
      expect(result).toEqual({ a: 1, c: 3 });
    });
  });

  describe('Omit', () => {
    it('should omit subset of keys', () => {
      type Result = HKTF.Apply<
        ObjectHKTF.OmitHKTF,
        { obj: { a: 1; b: 2; c: 3 }; keys: readonly ['b'] }
      >;

      const result: Result = { a: 1, c: 3 };
      expect(result).toEqual({ a: 1, c: 3 });
    });
  });

  describe('Merge', () => {
    it('should merge two objects', () => {
      type Result = HKTF.Apply<
        ObjectHKTF.Merge,
        { obj1: { a: 1; b: 2 }; obj2: { b: 3; c: 4 } }
      >;

      const result: Result = { a: 1, b: 3, c: 4 };
      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });
  });

  describe('Get', () => {
    it('should get value at path', () => {
      type Result = HKTF.Apply<
        ObjectHKTF.Get,
        { obj: { a: { b: { c: 42 } } }; path: readonly ['a', 'b', 'c'] }
      >;

      const result: Result = 42;
      expect(result).toBe(42);
    });

    it('should get shallow value', () => {
      type Result = HKTF.Apply<
        ObjectHKTF.Get,
        { obj: { a: 1; b: 2 }; path: readonly ['a'] }
      >;

      const result: Result = 1;
      expect(result).toBe(1);
    });
  });

  describe('Keys', () => {
    it('should get keys of object', () => {
      type Result = HKTF.Apply<
        ObjectHKTF.Keys,
        { obj: { a: 1; b: 2; c: 3 } }
      >;

      const result: Result = ['a', 'b', 'c'];
      expect(result).toEqual(['a', 'b', 'c']);
    });
  });

  // Runtime function tests for all modules
  describe('Runtime Functions', () => {
    describe('pick', () => {
      it('should pick specified keys', () => {
        const result = ObjectHKTF.pick({ a: 1, b: 2, c: 3 }, ['a', 'c']);
        expect(result).toEqual({ a: 1, c: 3 });
      });

      it('should work with object args', () => {
        const result = ObjectHKTF.pick({ obj: { a: 1, b: 2 }, keys: ['a'] });
        expect(result).toEqual({ a: 1 });
      });

      it('should handle non-existent keys', () => {
        const result = ObjectHKTF.pick({ a: 1 }, ['a', 'b'] as any);
        expect(result).toEqual({ a: 1 });
      });
    });

    describe('omit', () => {
      it('should omit specified keys', () => {
        const result = ObjectHKTF.omit({ a: 1, b: 2, c: 3 }, ['b']);
        expect(result).toEqual({ a: 1, c: 3 });
      });

      it('should work with object args', () => {
        const result = ObjectHKTF.omit({ obj: { a: 1, b: 2 }, keys: ['b'] });
        expect(result).toEqual({ a: 1 });
      });
    });

    describe('merge', () => {
      it('should merge two objects', () => {
        const result = ObjectHKTF.merge({ a: 1, b: 2 }, { b: 3, c: 4 });
        expect(result).toEqual({ a: 1, b: 3, c: 4 });
      });

      it('should work with object args', () => {
        const result = ObjectHKTF.merge({ obj1: { a: 1 }, obj2: { b: 2 } });
        expect(result).toEqual({ a: 1, b: 2 });
      });
    });

    describe('keys', () => {
      it('should get object keys', () => {
        const result = ObjectHKTF.keys({ a: 1, b: 2, c: 3 });
        expect(result).toEqual(['a', 'b', 'c']);
      });

      it('should work with object args', () => {
        const result = ObjectHKTF.keys({ obj: { x: 1, y: 2 } });
        expect(result).toEqual(['x', 'y']);
      });
    });

    describe('values', () => {
      it('should get object values', () => {
        const result = ObjectHKTF.values({ a: 1, b: 2, c: 3 });
        expect(result).toEqual([1, 2, 3]);
      });

      it('should work with object args', () => {
        const result = ObjectHKTF.values({ obj: { x: 'hello', y: 'world' } });
        expect(result).toEqual(['hello', 'world']);
      });
    });

    describe('entries', () => {
      it('should get object entries', () => {
        const result = ObjectHKTF.entries({ a: 1, b: 2 });
        expect(result).toEqual([['a', 1], ['b', 2]]);
      });

      it('should work with object args', () => {
        const result = ObjectHKTF.entries({ obj: { x: 'hello' } });
        expect(result).toEqual([['x', 'hello']]);
      });
    });

    describe('get', () => {
      it('should get nested value', () => {
        const result = ObjectHKTF.get({ a: { b: { c: 42 } } }, ['a', 'b', 'c']);
        expect(result).toBe(42);
      });

      it('should get shallow value', () => {
        const result = ObjectHKTF.get({ a: 1 }, ['a']);
        expect(result).toBe(1);
      });

      it('should return undefined for missing path', () => {
        const result = ObjectHKTF.get({ a: 1 }, ['b', 'c']);
        expect(result).toBeUndefined();
      });

      it('should work with object args', () => {
        const result = ObjectHKTF.get({ obj: { a: { b: 10 } }, path: ['a', 'b'] });
        expect(result).toBe(10);
      });
    });

    describe('set', () => {
      it('should set nested value', () => {
        const result = ObjectHKTF.set({ a: { b: 1 } }, ['a', 'b'], 2);
        expect(result).toEqual({ a: { b: 2 } });
      });

      it('should create nested path', () => {
        const result = ObjectHKTF.set({}, ['a', 'b', 'c'], 42);
        expect(result).toEqual({ a: { b: { c: 42 } } });
      });

      it('should not mutate original', () => {
        const original = { a: { b: 1 } };
        const result = ObjectHKTF.set(original, ['a', 'b'], 2);
        expect(original).toEqual({ a: { b: 1 } });
        expect(result).toEqual({ a: { b: 2 } });
      });

      it('should work with object args', () => {
        const result = ObjectHKTF.set({ obj: { a: 1 }, path: ['a'], value: 2 });
        expect(result).toEqual({ a: 2 });
      });
    });

    describe('mapKeys', () => {
      it('should map keys', () => {
        const result = ObjectHKTF.mapKeys({ a: 1, b: 2 }, (k) => k.toUpperCase());
        expect(result).toEqual({ A: 1, B: 2 });
      });

      it('should work with object args', () => {
        const result = ObjectHKTF.mapKeys({ obj: { x: 1 }, fn: (k: string) => `prefix_${k}` });
        expect(result).toEqual({ prefix_x: 1 });
      });
    });

    describe('mapValues', () => {
      it('should map values', () => {
        const result = ObjectHKTF.mapValues({ a: 1, b: 2 }, (v) => v * 2);
        expect(result).toEqual({ a: 2, b: 4 });
      });

      it('should work with object args', () => {
        const result = ObjectHKTF.mapValues({ obj: { x: 'hi' }, fn: (v: string) => v.toUpperCase() });
        expect(result).toEqual({ x: 'HI' });
      });
    });

    describe('fromEntries', () => {
      it.skip('should create object from entries', () => {
        const result = ObjectHKTF.fromEntries([['a', 1], ['b', 2]]);
        expect(result).toEqual({ a: 1, b: 2 });
      });

      it.skip('should work with object args', () => {
        const result = ObjectHKTF.fromEntries({ entries: [['x', 'hello']] });
        expect(result).toEqual({ x: 'hello' });
      });
    });

    describe('partial', () => {
      it('should make all properties optional', () => {
        const result = ObjectHKTF.partial({ a: 1, b: 2 });
        expect(result).toEqual({ a: 1, b: 2 });
      });

      it('should work with partial object', () => {
        const result = ObjectHKTF.partial({ a: 1 });
        expect(result).toEqual({ a: 1 });
      });
    });

    describe('required', () => {
      it('should make all properties required', () => {
        const result = ObjectHKTF.required({ a: 1, b: 2 });
        expect(result).toEqual({ a: 1, b: 2 });
      });
    });

    describe('readonly', () => {
      it('should make object readonly', () => {
        const result = ObjectHKTF.readonly({ a: 1, b: 2 });
        expect(result).toEqual({ a: 1, b: 2 });
      });
    });

    describe('deepPartial', () => {
      it('should make nested properties optional', () => {
        const result = ObjectHKTF.deepPartial({ a: { b: { c: 1 } } });
        expect(result).toEqual({ a: { b: { c: 1 } } });
      });

      it('should handle partial nested', () => {
        const result = ObjectHKTF.deepPartial({ a: { b: 1 } });
        expect(result).toEqual({ a: { b: 1 } });
      });
    });

    describe('deepRequired', () => {
      it('should make nested properties required', () => {
        const result = ObjectHKTF.deepRequired({ a: { b: { c: 1 } } });
        expect(result).toEqual({ a: { b: { c: 1 } } });
      });
    });

    describe('deepReadonly', () => {
      it('should make nested properties readonly', () => {
        const result = ObjectHKTF.deepReadonly({ a: { b: 1 } });
        expect(result).toEqual({ a: { b: 1 } });
      });

      it('should freeze nested objects', () => {
        const result = ObjectHKTF.deepReadonly({ a: { b: 1 } });
        expect(Object.isFrozen(result)).toBe(true);
        expect(Object.isFrozen(result.a)).toBe(true);
      });
    });

    describe('keysOfType', () => {
      it('should get keys of specific type', () => {
        const result = ObjectHKTF.keysOfType({ a: 1, b: 'hello', c: 2 }, 0);
        expect(result).toEqual(['a', 'c']);
      });

      it('should handle string type', () => {
        const result = ObjectHKTF.keysOfType({ a: 1, b: 'hello', c: 'world' }, '');
        expect(result).toEqual(['b', 'c']);
      });

      it('should work with object args', () => {
        const result = ObjectHKTF.keysOfType({ obj: { a: true, b: 1 }, type: false });
        expect(result).toEqual(['a']);
      });
    });

    describe('pickByType', () => {
      it('should pick properties of specific type', () => {
        const result = ObjectHKTF.pickByType({ a: 1, b: 'hello', c: 2 }, 0);
        expect(result).toEqual({ a: 1, c: 2 });
      });

      it('should work with object args', () => {
        const result = ObjectHKTF.pickByType({ obj: { a: 1, b: 'hi' }, type: '' });
        expect(result).toEqual({ b: 'hi' });
      });
    });

    describe('omitByType', () => {
      it('should omit properties of specific type', () => {
        const result = ObjectHKTF.omitByType({ a: 1, b: 'hello', c: 2 }, 0);
        expect(result).toEqual({ b: 'hello' });
      });

      it('should work with object args', () => {
        const result = ObjectHKTF.omitByType({ obj: { a: 1, b: 'hi' }, type: '' });
        expect(result).toEqual({ a: 1 });
      });
    });

    describe('rename', () => {
      it('should rename keys', () => {
        const result = ObjectHKTF.rename({ a: 1, b: 2 }, { a: 'x', b: 'y' });
        expect(result).toEqual({ x: 1, y: 2 });
      });

      it('should keep unmapped keys', () => {
        const result = ObjectHKTF.rename({ a: 1, b: 2, c: 3 }, { a: 'x' });
        expect(result).toEqual({ x: 1, b: 2, c: 3 });
      });

      it('should work with object args', () => {
        const result = ObjectHKTF.rename({ obj: { a: 1 }, mapping: { a: 'alpha' } });
        expect(result).toEqual({ alpha: 1 });
      });
    });

    describe('invert', () => {
      it('should swap keys and values', () => {
        const result = ObjectHKTF.invert({ a: 'x', b: 'y' });
        expect(result).toEqual({ x: 'a', y: 'b' });
      });

      it('should work with object args', () => {
        const result = ObjectHKTF.invert({ obj: { foo: 'bar' } });
        expect(result).toEqual({ bar: 'foo' });
      });
    });

    describe('flatten', () => {
      it('should flatten nested object', () => {
        const result = ObjectHKTF.flatten({ a: { b: { c: 1 } } });
        expect(result).toEqual({ 'a.b.c': 1 });
      });

      it('should handle mixed nesting', () => {
        const result = ObjectHKTF.flatten({ a: 1, b: { c: 2 } });
        expect(result).toEqual({ a: 1, 'b.c': 2 });
      });

      it('should work with object args', () => {
        const result = ObjectHKTF.flatten({ obj: { x: { y: 'hello' } } });
        expect(result).toEqual({ 'x.y': 'hello' });
      });
    });

    describe('unflatten', () => {
      it('should unflatten dot-notation object', () => {
        const result = ObjectHKTF.unflatten({ 'a.b.c': 1 });
        expect(result).toEqual({ a: { b: { c: 1 } } });
      });

      it('should handle mixed keys', () => {
        const result = ObjectHKTF.unflatten({ a: 1, 'b.c': 2 });
        expect(result).toEqual({ a: 1, b: { c: 2 } });
      });

      it('should work with object args', () => {
        const result = ObjectHKTF.unflatten({ obj: { 'x.y': 'hello' } });
        expect(result).toEqual({ x: { y: 'hello' } });
      });
    });

    describe('diff', () => {
      it('should find keys with different values', () => {
        const result = ObjectHKTF.diff({ a: 1, b: 2, c: 3 }, { a: 1, b: 3, c: 3 });
        expect(result).toEqual(['b']);
      });

      it('should handle missing keys', () => {
        const result = ObjectHKTF.diff({ a: 1, b: 2 }, { a: 1 });
        expect(result).toEqual(['b']);
      });

      it('should work with object args', () => {
        const result = ObjectHKTF.diff({ obj1: { a: 1 }, obj2: { a: 2 } });
        expect(result).toEqual(['a']);
      });
    });

    describe('has', () => {
      it('should check if path exists', () => {
        const result = ObjectHKTF.has({ a: { b: { c: 1 } } }, ['a', 'b', 'c']);
        expect(result).toBe(true);
      });

      it('should return false for missing path', () => {
        const result = ObjectHKTF.has({ a: 1 }, ['a', 'b']);
        expect(result).toBe(false);
      });

      it('should work with object args', () => {
        const result = ObjectHKTF.has({ obj: { x: 1 }, path: ['x'] });
        expect(result).toBe(true);
      });
    });

    describe('deleteAt', () => {
      it('should delete nested key', () => {
        const result = ObjectHKTF.deleteAt({ a: { b: 1, c: 2 } }, ['a', 'b']);
        expect(result).toEqual({ a: { c: 2 } });
      });

      it('should not mutate original', () => {
        const original = { a: { b: 1 } };
        const result = ObjectHKTF.deleteAt(original, ['a', 'b']);
        expect(original).toEqual({ a: { b: 1 } });
        expect(result).toEqual({ a: {} });
      });

      it('should work with object args', () => {
        const result = ObjectHKTF.deleteAt({ obj: { a: 1, b: 2 }, path: ['a'] });
        expect(result).toEqual({ b: 2 });
      });
    });

    describe('update', () => {
      it('should update nested value with function', () => {
        const result = ObjectHKTF.update({ a: { b: 1 } }, ['a', 'b'], (v: number) => v * 2);
        expect(result).toEqual({ a: { b: 2 } });
      });

      it('should not mutate original', () => {
        const original = { a: { b: 1 } };
        const result = ObjectHKTF.update(original, ['a', 'b'], (v: number) => v + 1);
        expect(original).toEqual({ a: { b: 1 } });
        expect(result).toEqual({ a: { b: 2 } });
      });

      it('should work with object args', () => {
        const result = ObjectHKTF.update({ obj: { x: 5 }, path: ['x'], updater: (v: number) => v * 3 });
        expect(result).toEqual({ x: 15 });
      });
    });

    describe('assign', () => {
      it('should assign multiple objects', () => {
        const result = ObjectHKTF.assign({ a: 1 }, { b: 2 }, { c: 3 });
        expect(result).toEqual({ a: 1, b: 2, c: 3 });
      });

      it('should handle overlapping keys', () => {
        const result = ObjectHKTF.assign({ a: 1, b: 2 }, { b: 3, c: 4 });
        expect(result).toEqual({ a: 1, b: 3, c: 4 });
      });

      it('should work with object args', () => {
        const result = ObjectHKTF.assign({ targets: [{ a: 1 }, { b: 2 }] });
        expect(result).toEqual({ a: 1, b: 2 });
      });
    });

    describe('deepMerge', () => {
      it('should deep merge objects', () => {
        const result = ObjectHKTF.deepMerge({ a: { b: 1, c: 2 } }, { a: { c: 3, d: 4 } });
        expect(result).toEqual({ a: { b: 1, c: 3, d: 4 } });
      });

      it('should handle nested objects', () => {
        const result = ObjectHKTF.deepMerge({ a: { b: { c: 1 } } }, { a: { b: { d: 2 } } });
        expect(result).toEqual({ a: { b: { c: 1, d: 2 } } });
      });

      it('should work with object args', () => {
        const result = ObjectHKTF.deepMerge({ obj1: { a: { x: 1 } }, obj2: { a: { y: 2 } } });
        expect(result).toEqual({ a: { x: 1, y: 2 } });
      });
    });

    describe('objectMap', () => {
      it('should map both keys and values', () => {
        const result = ObjectHKTF.objectMap({ a: 1, b: 2 }, ([k, v]) => [k.toUpperCase(), (v as number) * 2]);
        expect(result).toEqual({ A: 2, B: 4 });
      });

      it('should work with object args', () => {
        const result = ObjectHKTF.objectMap({ obj: { x: 'hi' }, mapper: ([k, v]: readonly [string, string]) => [`_${k}`, v.toUpperCase()] });
        expect(result).toEqual({ _x: 'HI' });
      });
    });

    describe('filter', () => {
      it('should filter entries by predicate', () => {
        const result = ObjectHKTF.filter({ a: 1, b: 2, c: 3 }, ([_k, v]) => (v as number) > 1);
        expect(result).toEqual({ b: 2, c: 3 });
      });

      it('should filter by key', () => {
        const result = ObjectHKTF.filter({ a: 1, b: 2, c: 3 }, ([k]) => k !== 'b');
        expect(result).toEqual({ a: 1, c: 3 });
      });

      it('should work with object args', () => {
        const result = ObjectHKTF.filter({ obj: { a: 1, b: 2 }, predicate: ([_k, v]: readonly [string, number]) => v === 1 });
        expect(result).toEqual({ a: 1 });
      });
    });
  });
});
