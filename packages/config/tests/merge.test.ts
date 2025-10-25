import { describe, test, expect } from 'bun:test';
import { merge, deepClone, extend, mergeWithEnvironment } from '../src/merge.js';

describe('merge', () => {
  test('returns empty object for empty array', () => {
    expect(merge([])).toEqual({});
  });

  test('returns single config unchanged', () => {
    const config = { name: 'test' };
    expect(merge([config])).toEqual(config);
  });

  test('merges two objects with replace strategy', () => {
    const base = { a: 1, b: 2 };
    const override = { b: 3, c: 4 };
    const result = merge([base, override], { strategy: 'replace' });
    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  test('deep merges nested objects with merge strategy', () => {
    const base = { a: 1, nested: { x: 1, y: 2 } };
    const override = { nested: { y: 3, z: 4 } };
    const result = merge([base, override], { strategy: 'merge' });
    expect(result).toEqual({ a: 1, nested: { x: 1, y: 3, z: 4 } });
  });

  test('replaces arrays by default', () => {
    const base = { items: [1, 2, 3] };
    const override = { items: [4, 5] };
    const result = merge([base, override]);
    expect(result).toEqual({ items: [4, 5] });
  });

  test('appends arrays with append strategy', () => {
    const base = { items: [1, 2, 3] };
    const override = { items: [4, 5] };
    const result = merge([base, override], { strategy: 'append' });
    expect(result).toEqual({ items: [1, 2, 3, 4, 5] });
  });

  test('merges arrays element-wise with mergeArrays option', () => {
    const base = { items: [{ a: 1 }, { b: 2 }] };
    const override = { items: [{ a: 2 }, { c: 3 }] };
    const result = merge([base, override], { mergeArrays: true });
    expect(result).toEqual({ items: [{ a: 2 }, { b: 2, c: 3 }] });
  });

  test('uses custom merge function for specific keys', () => {
    const base = { count: 5 };
    const override = { count: 3 };
    const result = merge([base, override], {
      customMerge: {
        count: (a, b) => (a as number) + (b as number),
      },
    });
    expect(result).toEqual({ count: 8 });
  });

  test('merges multiple configs in order', () => {
    const base = { a: 1 };
    const override1 = { b: 2 };
    const override2 = { c: 3 };
    const result = merge([base, override1, override2]);
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  test('later configs override earlier ones', () => {
    const config1 = { value: 1 };
    const config2 = { value: 2 };
    const config3 = { value: 3 };
    const result = merge([config1, config2, config3]);
    expect(result).toEqual({ value: 3 });
  });

  test('handles null and undefined values', () => {
    const base = { a: 1, b: null };
    const override = { b: 2, c: undefined };
    const result = merge([base, override]);
    expect(result).toEqual({ a: 1, b: 2, c: undefined });
  });
});

describe('deepClone', () => {
  test('clones primitives', () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone('test')).toBe('test');
    expect(deepClone(true)).toBe(true);
    expect(deepClone(null)).toBe(null);
    expect(deepClone(undefined)).toBe(undefined);
  });

  test('clones arrays', () => {
    const arr = [1, 2, 3];
    const cloned = deepClone(arr);
    expect(cloned).toEqual(arr);
    expect(cloned).not.toBe(arr);
  });

  test('clones nested arrays', () => {
    const arr = [[1, 2], [3, 4]];
    const cloned = deepClone(arr);
    expect(cloned).toEqual(arr);
    expect(cloned[0]).not.toBe(arr[0]);
  });

  test('clones objects', () => {
    const obj = { a: 1, b: 2 };
    const cloned = deepClone(obj);
    expect(cloned).toEqual(obj);
    expect(cloned).not.toBe(obj);
  });

  test('clones nested objects', () => {
    const obj = { a: 1, nested: { b: 2, c: 3 } };
    const cloned = deepClone(obj);
    expect(cloned).toEqual(obj);
    expect(cloned.nested).not.toBe(obj.nested);
  });

  test('clones complex structures', () => {
    const complex = {
      name: 'test',
      items: [1, 2, { x: 3 }],
      nested: { deep: { value: 42 } },
    };
    const cloned = deepClone(complex);
    expect(cloned).toEqual(complex);
    expect(cloned).not.toBe(complex);
    expect(cloned.items).not.toBe(complex.items);
    expect(cloned.nested).not.toBe(complex.nested);
  });
});

describe('extend', () => {
  test('creates new object without modifying base', () => {
    const base = { a: 1, b: 2 };
    const override = { b: 3, c: 4 };
    const result = extend(base, override);

    expect(result).toEqual({ a: 1, b: 3, c: 4 });
    expect(base).toEqual({ a: 1, b: 2 }); // Unchanged
  });

  test('deeply extends nested objects', () => {
    const base = { nested: { a: 1, b: 2 } };
    const override = { nested: { b: 3, c: 4 } };
    const result = extend(base, override);

    expect(result).toEqual({ nested: { a: 1, b: 3, c: 4 } });
    expect(base).toEqual({ nested: { a: 1, b: 2 } }); // Unchanged
  });

  test('supports merge options', () => {
    const base = { items: [1, 2] };
    const override = { items: [3, 4] };
    const result = extend(base, override, { strategy: 'append' });

    expect(result).toEqual({ items: [1, 2, 3, 4] });
  });
});

describe('mergeWithEnvironment', () => {
  test('merges base, environment, and local configs', () => {
    const base = { a: 1, b: 2 };
    const env = { b: 3, c: 4 };
    const local = { c: 5, d: 6 };
    const result = mergeWithEnvironment(base, env, local);

    expect(result).toEqual({ a: 1, b: 3, c: 5, d: 6 });
  });

  test('works with only base config', () => {
    const base = { a: 1, b: 2 };
    const result = mergeWithEnvironment(base);

    expect(result).toEqual(base);
  });

  test('works with base and environment', () => {
    const base = { a: 1, b: 2 };
    const env = { b: 3, c: 4 };
    const result = mergeWithEnvironment(base, env);

    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  test('skips undefined configs', () => {
    const base = { a: 1 };
    const result = mergeWithEnvironment(base, undefined, undefined);

    expect(result).toEqual(base);
  });

  test('supports merge options', () => {
    const base = { items: [1] };
    const env = { items: [2] };
    const local = { items: [3] };
    const result = mergeWithEnvironment(base, env, local, { strategy: 'append' });

    expect(result).toEqual({ items: [1, 2, 3] });
  });
});
