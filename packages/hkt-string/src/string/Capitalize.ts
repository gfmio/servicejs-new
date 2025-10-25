import type { HKTF } from '@servicejs/hkt-core';

export interface CapitalizeArgs {
  str: string;
}

export type CapitalizeResult<T extends CapitalizeArgs> = globalThis.Capitalize<T['str']>;

/**
 * Capitalize HKTF - capitalizes first letter
 */
export interface Capitalize extends HKTF.Base {
  [HKTF.ArgsSymbol]: CapitalizeArgs;
  [HKTF.ResultSymbol]: CapitalizeResult<HKTF.Args<this>>;
}

export function capitalize<const S extends string>(str: S): HKTF.Apply<Capitalize, {str: S}>;
export function capitalize<const T extends CapitalizeArgs>(args: T): HKTF.Apply<Capitalize, T>;
export function capitalize<const T extends CapitalizeArgs>(...args: [T] | [T["str"]]): HKTF.Apply<Capitalize, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    const s = args[0].str;
    return (s.charAt(0).toUpperCase() + s.slice(1)) as unknown as HKTF.Apply<Capitalize, T>;
  }
  const s = args[0] as string;
  return (s.charAt(0).toUpperCase() + s.slice(1)) as unknown as HKTF.Apply<Capitalize, T>;
}
