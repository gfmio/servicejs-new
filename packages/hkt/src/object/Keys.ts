import type * as HKTF from '../hktf';

export interface KeysArgs {
  obj: Record<string, unknown>;
}

export type KeysResult<T extends KeysArgs> = readonly (keyof T['obj'])[];

/**
 * Keys HKTF - gets keys of object as tuple
 */
export interface Keys extends HKTF.Base {
  [HKTF.ArgsSymbol]: KeysArgs;
  [HKTF.ResultSymbol]: KeysResult<HKTF.Args<this>>;
}

export function keys<const O extends Record<string, unknown>>(obj: O): HKTF.Apply<Keys, {obj: O}>;
export function keys<const T extends KeysArgs>(args: T): HKTF.Apply<Keys, T>;
export function keys<const T extends KeysArgs>(...args: [T] | [T["obj"]]): HKTF.Apply<Keys, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    return Object.keys(args[0].obj as Record<string, unknown>) as unknown as HKTF.Apply<Keys, T>;
  }
  return Object.keys(args[0] as Record<string, unknown>) as unknown as HKTF.Apply<Keys, T>;
}
