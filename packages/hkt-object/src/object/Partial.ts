import type { HKTF } from '@servicejs/hkt-core';

export interface PartialArgs {
  obj: Record<string, unknown>;
}

export type PartialResult<T extends PartialArgs> = globalThis.Partial<T['obj']>;

/**
 * Partial HKTF - makes all properties optional
 */
export interface Partial extends HKTF.Base {
  [HKTF.ArgsSymbol]: PartialArgs;
  [HKTF.ResultSymbol]: PartialResult<HKTF.Args<this>>;
}

export function partial<const O extends Record<string, unknown>>(obj: O): HKTF.Apply<Partial, {obj: O}>;
export function partial<const T extends PartialArgs>(args: T): HKTF.Apply<Partial, T>;
export function partial<const T extends PartialArgs>(...args: [T] | [T["obj"]]): HKTF.Apply<Partial, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    return { ...(args[0].obj as Record<string, unknown>) } as unknown as HKTF.Apply<Partial, T>;
  }
  return { ...(args[0] as Record<string, unknown>) } as unknown as HKTF.Apply<Partial, T>;
}
