import type { HKTF } from '@servicejs/hkt-core';

export interface DeepMergeArgs {
  obj1: Record<string, unknown>;
  obj2: Record<string, unknown>;
}

// Type-level deep merge is very complex, simplified version
export type DeepMergeResult<_T extends DeepMergeArgs> = Record<string, unknown>;

/**
 * DeepMerge HKTF - recursively merges two objects
 */
export interface DeepMerge extends HKTF.Base {
  [HKTF.ArgsSymbol]: DeepMergeArgs;
  [HKTF.ResultSymbol]: DeepMergeResult<HKTF.Args<this>>;
}

function deepMergeImpl(obj1: any, obj2: any): any {
  if (obj2 === null || typeof obj2 !== 'object' || Array.isArray(obj2)) {
    return obj2;
  }
  if (obj1 === null || typeof obj1 !== 'object' || Array.isArray(obj1)) {
    return obj2;
  }

  const result: Record<string, unknown> = { ...obj1 };

  for (const key in obj2) {
    if (key in obj1) {
      result[key] = deepMergeImpl(obj1[key], obj2[key]);
    } else {
      result[key] = obj2[key];
    }
  }

  return result;
}

export function deepMerge<const O1 extends Record<string, unknown>, const O2 extends Record<string, unknown>>(obj1: O1, obj2: O2): HKTF.Apply<DeepMerge, {obj1: O1, obj2: O2}>;
export function deepMerge<const T extends DeepMergeArgs>(args: T): HKTF.Apply<DeepMerge, T>;
export function deepMerge<const T extends DeepMergeArgs>(...args: [T] | [T["obj1"], T["obj2"]]): HKTF.Apply<DeepMerge, T> {
  if (typeof args[0] === 'object' && 'obj1' in args[0]) {
    return deepMergeImpl(args[0].obj1, args[0].obj2) as unknown as HKTF.Apply<DeepMerge, T>;
  }
  return deepMergeImpl(args[0], args[1]) as unknown as HKTF.Apply<DeepMerge, T>;
}
