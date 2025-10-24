import type * as HKTF from '../hktf';

export interface MergeArgs {
  obj1: Record<string, unknown>;
  obj2: Record<string, unknown>;
}

export type MergeResult<T extends MergeArgs> = {
  [K in keyof T['obj1'] | keyof T['obj2']]: K extends keyof T['obj2']
    ? T['obj2'][K]
    : K extends keyof T['obj1']
    ? T['obj1'][K]
    : never;
};

/**
 * Merge HKTF - merges two objects (obj2 overwrites obj1)
 */
export interface Merge extends HKTF.Base {
  [HKTF.ArgsSymbol]: MergeArgs;
  [HKTF.ResultSymbol]: MergeResult<HKTF.Args<this>>;
}

export function merge<const O1 extends Record<string, unknown>, const O2 extends Record<string, unknown>>(obj1: O1, obj2: O2): HKTF.Apply<Merge, {obj1: O1, obj2: O2}>;
export function merge<const T extends MergeArgs>(args: T): HKTF.Apply<Merge, T>;
export function merge<const T extends MergeArgs>(...args: [T] | [T["obj1"], T["obj2"]]): HKTF.Apply<Merge, T> {
  if (typeof args[0] === 'object' && 'obj1' in args[0]) {
    return { ...(args[0].obj1 as Record<string, unknown>), ...(args[0].obj2 as Record<string, unknown>) } as unknown as HKTF.Apply<Merge, T>;
  }
  return { ...(args[0] as Record<string, unknown>), ...(args[1] as Record<string, unknown>) } as unknown as HKTF.Apply<Merge, T>;
}
