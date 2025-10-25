import type { HKTF } from '@servicejs/hkt-core';

export interface ToUpperArgs {
  str: string;
}

export type ToUpperResult<T extends ToUpperArgs> = Uppercase<T['str']>;

/**
 * ToUpper HKTF - converts string to uppercase
 */
export interface ToUpper extends HKTF.Base {
  [HKTF.ArgsSymbol]: ToUpperArgs;
  [HKTF.ResultSymbol]: ToUpperResult<HKTF.Args<this>>;
}

export function toUpper<const S extends string>(str: S): HKTF.Apply<ToUpper, {str: S}>;
export function toUpper<const T extends ToUpperArgs>(args: T): HKTF.Apply<ToUpper, T>;
export function toUpper<const T extends ToUpperArgs>(...args: [T] | [T["str"]]): HKTF.Apply<ToUpper, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return args[0].str.toUpperCase() as unknown as HKTF.Apply<ToUpper, T>;
  }
  return (args[0] as string).toUpperCase() as unknown as HKTF.Apply<ToUpper, T>;
}
