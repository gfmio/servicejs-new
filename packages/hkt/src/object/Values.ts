import type * as HKTF from '../hktf';

export interface ValuesArgs {
  obj: Record<string, unknown>;
}

export type ValuesResult<T extends ValuesArgs> = readonly T['obj'][keyof T['obj']][];

/**
 * Values HKTF - gets values of object as tuple
 */
export interface Values extends HKTF.Base {
  [HKTF.ArgsSymbol]: ValuesArgs;
  [HKTF.ResultSymbol]: ValuesResult<HKTF.Args<this>>;
}

export function values<const O extends Record<string, unknown>>(obj: O): HKTF.Apply<Values, {obj: O}>;
export function values<const T extends ValuesArgs>(args: T): HKTF.Apply<Values, T>;
export function values<const T extends ValuesArgs>(...args: [T] | [T["obj"]]): HKTF.Apply<Values, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    return Object.values(args[0].obj as Record<string, unknown>) as unknown as HKTF.Apply<Values, T>;
  }
  return Object.values(args[0] as Record<string, unknown>) as unknown as HKTF.Apply<Values, T>;
}
