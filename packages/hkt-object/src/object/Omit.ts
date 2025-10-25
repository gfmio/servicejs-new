import type { HKTF } from '@servicejs/hkt-core';

export interface OmitArgs {
  obj: Record<string, unknown>;
  keys: readonly string[];
}

export type OmitResult<T extends OmitArgs> = globalThis.Omit<T['obj'], Extract<keyof T['obj'], T['keys'][number]>>;

/**
 * Omit HKTF - omits subset of keys from object
 */
export interface Omit extends HKTF.Base {
  [HKTF.ArgsSymbol]: OmitArgs;
  [HKTF.ResultSymbol]: OmitResult<HKTF.Args<this>>;
}

export function omit<const O extends Record<string, unknown>, const K extends readonly (keyof O)[]>(obj: O, keys: K): any;
export function omit<const T extends OmitArgs>(args: T): HKTF.Apply<Omit, T>;
export function omit<const T extends OmitArgs>(...args: [T] | [T["obj"], T["keys"]]): HKTF.Apply<Omit, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    const result: Record<string, unknown> = { ...(args[0].obj as Record<string, unknown>) };
    const keys = args[0].keys as readonly string[];
    for (const key of keys) {
      delete result[key];
    }
    return result as unknown as HKTF.Apply<Omit, T>;
  }
  const result: Record<string, unknown> = { ...(args[0] as Record<string, unknown>) };
  const keys = args[1] as readonly string[];
  for (const key of keys) {
    delete result[key];
  }
  return result as unknown as HKTF.Apply<Omit, T>;
}
