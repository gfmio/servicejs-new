import type * as HKTF from '../hktf';

export interface ReadonlyArgs {
  obj: Record<string, unknown>;
}

export type ReadonlyResult<T extends ReadonlyArgs> = globalThis.Readonly<T['obj']>;

/**
 * Readonly HKTF - makes all properties readonly
 */
export interface Readonly extends HKTF.Base {
  [HKTF.ArgsSymbol]: ReadonlyArgs;
  [HKTF.ResultSymbol]: ReadonlyResult<HKTF.Args<this>>;
}

export function readonly<const O extends Record<string, unknown>>(obj: O): HKTF.Apply<Readonly, {obj: O}>;
export function readonly<const T extends ReadonlyArgs>(args: T): HKTF.Apply<Readonly, T>;
export function readonly<const T extends ReadonlyArgs>(...args: [T] | [T["obj"]]): HKTF.Apply<Readonly, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    return { ...(args[0].obj as Record<string, unknown>) } as unknown as HKTF.Apply<Readonly, T>;
  }
  return { ...(args[0] as Record<string, unknown>) } as unknown as HKTF.Apply<Readonly, T>;
}
