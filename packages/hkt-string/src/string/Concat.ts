import type { HKTF } from '@servicejs/hkt-core';

export interface ConcatArgs {
  str1: string;
  str2: string;
}

export type ConcatResult<T extends ConcatArgs> = `${T['str1']}${T['str2']}`;

/**
 * Concat HKTF - concatenates two strings
 */
export interface Concat extends HKTF.Base {
  [HKTF.ArgsSymbol]: ConcatArgs;
  [HKTF.ResultSymbol]: ConcatResult<HKTF.Args<this>>;
}

export function concat<const S1 extends string, const S2 extends string>(str1: S1, str2: S2): HKTF.Apply<Concat, {str1: S1, str2: S2}>;
export function concat<const T extends ConcatArgs>(args: T): HKTF.Apply<Concat, T>;
export function concat<const T extends ConcatArgs>(...args: [T] | [T["str1"], T["str2"]]): HKTF.Apply<Concat, T> {
  if (typeof args[0] === 'object' && 'str1' in args[0]) {
    return (args[0].str1 + args[0].str2) as unknown as HKTF.Apply<Concat, T>;
  }
  return ((args[0] as T["str1"]) + (args[1] as T["str2"])) as unknown as HKTF.Apply<Concat, T>;
}
