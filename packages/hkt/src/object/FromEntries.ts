import type * as HKTF from '../hktf';

export interface FromEntriesArgs {
  entries: readonly (readonly [PropertyKey, unknown])[];
}

export type FromEntriesResult<T extends FromEntriesArgs> = {
  [E in T['entries'][number] as E extends readonly [infer K extends PropertyKey, any] ? K : never]:
    E extends readonly [any, infer V] ? V : never;
};

/**
 * FromEntries HKTF - converts array of key-value pairs into an object
 * Inverse of Entries
 */
export interface FromEntries extends HKTF.Base {
  [HKTF.ArgsSymbol]: FromEntriesArgs;
  [HKTF.ResultSymbol]: FromEntriesResult<HKTF.Args<this>>;
}

export function fromEntries<const E extends readonly (readonly [PropertyKey, unknown])[]>(entries: E): HKTF.Apply<FromEntries, {entries: E}>;
export function fromEntries<const T extends FromEntriesArgs>(args: T): HKTF.Apply<FromEntries, T>;
export function fromEntries<const T extends FromEntriesArgs>(...args: [T] | [T["entries"]]): HKTF.Apply<FromEntries, T> {
  if (typeof args[0] === 'object' && 'entries' in args[0]) {
    return globalThis.Object.fromEntries(args[0].entries as readonly [PropertyKey, unknown][]) as unknown as HKTF.Apply<FromEntries, T>;
  }
  return globalThis.Object.fromEntries(args[0] as readonly [PropertyKey, unknown][]) as unknown as HKTF.Apply<FromEntries, T>;
}
