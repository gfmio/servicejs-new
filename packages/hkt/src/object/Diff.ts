import type * as HKTF from '../hktf';

export interface DiffArgs {
  obj1: Record<string, unknown>;
  obj2: Record<string, unknown>;
}

// Returns keys that differ between two objects
export type DiffResult<_T extends DiffArgs> = readonly string[];

/**
 * Diff HKTF - returns keys where values differ between two objects
 */
export interface Diff extends HKTF.Base {
  [HKTF.ArgsSymbol]: DiffArgs;
  [HKTF.ResultSymbol]: DiffResult<HKTF.Args<this>>;
}

export function diff<const O1 extends Record<string, unknown>, const O2 extends Record<string, unknown>>(obj1: O1, obj2: O2): HKTF.Apply<Diff, {obj1: O1, obj2: O2}>;
export function diff<const T extends DiffArgs>(args: T): HKTF.Apply<Diff, T>;
export function diff<const T extends DiffArgs>(...args: [T] | [T["obj1"], T["obj2"]]): HKTF.Apply<Diff, T> {
  if (typeof args[0] === 'object' && 'obj1' in args[0]) {
    const obj1 = args[0].obj1 as Record<string, unknown>;
    const obj2 = args[0].obj2 as Record<string, unknown>;
    const result: string[] = [];
    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    for (const key of allKeys) {
      if (obj1[key] !== obj2[key]) {
        result.push(key);
      }
    }

    return result as unknown as HKTF.Apply<Diff, T>;
  }
  const obj1 = args[0] as Record<string, unknown>;
  const obj2 = args[1] as Record<string, unknown>;
  const result: string[] = [];
  const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

  for (const key of allKeys) {
    if (obj1[key] !== obj2[key]) {
      result.push(key);
    }
  }

  return result as unknown as HKTF.Apply<Diff, T>;
}
