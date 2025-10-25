import type { HKTF } from '@servicejs/hkt-core';

export interface EntriesArgs {
  obj: Record<string, unknown>;
}

export type EntriesResult<T extends EntriesArgs> = readonly {
  [K in keyof T['obj']]: readonly [K, T['obj'][K]];
}[keyof T['obj']][];

/**
 * Entries HKTF - gets entries of object as tuple of [key, value] pairs
 */
export interface Entries extends HKTF.Base {
  [HKTF.ArgsSymbol]: EntriesArgs;
  [HKTF.ResultSymbol]: EntriesResult<HKTF.Args<this>>;
}

export function entries<const O extends Record<string, unknown>>(obj: O): HKTF.Apply<Entries, {obj: O}>;
export function entries<const T extends EntriesArgs>(args: T): HKTF.Apply<Entries, T>;
export function entries<const T extends EntriesArgs>(...args: [T] | [T["obj"]]): HKTF.Apply<Entries, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    return Object.entries(args[0].obj as Record<string, unknown>) as unknown as HKTF.Apply<Entries, T>;
  }
  return Object.entries(args[0] as Record<string, unknown>) as unknown as HKTF.Apply<Entries, T>;
}
