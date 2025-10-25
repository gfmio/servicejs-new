import type { HKTF } from '@servicejs/hkt-core';

export interface UncapitalizeArgs {
  str: string;
}

export type UncapitalizeResult<T extends UncapitalizeArgs> = globalThis.Uncapitalize<T['str']>;

/**
 * Uncapitalize HKTF - uncapitalizes first letter
 */
export interface Uncapitalize extends HKTF.Base {
  [HKTF.ArgsSymbol]: UncapitalizeArgs;
  [HKTF.ResultSymbol]: UncapitalizeResult<HKTF.Args<this>>;
}

export function uncapitalize<const S extends string>(str: S): HKTF.Apply<Uncapitalize, {str: S}>;
export function uncapitalize<const T extends UncapitalizeArgs>(args: T): HKTF.Apply<Uncapitalize, T>;
export function uncapitalize<const T extends UncapitalizeArgs>(...args: [T] | [T["str"]]): HKTF.Apply<Uncapitalize, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    const s = args[0].str;
    return (s.charAt(0).toLowerCase() + s.slice(1)) as unknown as HKTF.Apply<Uncapitalize, T>;
  }
  const s = args[0] as string;
  return (s.charAt(0).toLowerCase() + s.slice(1)) as unknown as HKTF.Apply<Uncapitalize, T>;
}
