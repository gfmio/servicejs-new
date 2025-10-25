import type { HKTF } from '@servicejs/hkt-core';

export interface RenameArgs {
  obj: Record<string, unknown>;
  mapping: Record<string, string>;
}

export type RenameResult<T extends RenameArgs> = {
  [K in keyof T['obj'] as K extends keyof T['mapping']
    ? T['mapping'][K] extends string
      ? T['mapping'][K]
      : K
    : K]: T['obj'][K];
};

/**
 * Rename HKTF - renames object keys based on a mapping
 */
export interface Rename extends HKTF.Base {
  [HKTF.ArgsSymbol]: RenameArgs;
  [HKTF.ResultSymbol]: RenameResult<HKTF.Args<this>>;
}

export function rename<const O extends Record<string, unknown>, const M extends Record<string, string>>(obj: O, mapping: M): HKTF.Apply<Rename, {obj: O, mapping: M}>;
export function rename<const T extends RenameArgs>(args: T): HKTF.Apply<Rename, T>;
export function rename<const T extends RenameArgs>(...args: [T] | [T["obj"], T["mapping"]]): HKTF.Apply<Rename, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    const obj = args[0].obj as Record<string, unknown>;
    const mapping = args[0].mapping as Record<string, string>;
    const result: Record<string, unknown> = {};
    for (const key in obj) {
      const newKey = mapping[key] || key;
      result[newKey] = obj[key];
    }
    return result as unknown as HKTF.Apply<Rename, T>;
  }
  const obj = args[0] as Record<string, unknown>;
  const mapping = args[1] as Record<string, string>;
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    const newKey = mapping[key] || key;
    result[newKey] = obj[key];
  }
  return result as unknown as HKTF.Apply<Rename, T>;
}
