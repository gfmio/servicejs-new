import type { HKTF } from '@servicejs/hkt-core';

export interface EndsWithArgs {
  str: string;
  suffix: string;
}

export type EndsWithResult<T extends EndsWithArgs> = T['str'] extends `${string}${T['suffix']}` ? true : false;

/**
 * EndsWith HKTF - checks if string ends with suffix
 */
export interface EndsWith extends HKTF.Base {
  [HKTF.ArgsSymbol]: EndsWithArgs;
  [HKTF.ResultSymbol]: EndsWithResult<HKTF.Args<this>>;
}

export function endsWith<const S extends string, const Suf extends string>(str: S, suffix: Suf): HKTF.Apply<EndsWith, {str: S, suffix: Suf}>;
export function endsWith<const T extends EndsWithArgs>(args: T): HKTF.Apply<EndsWith, T>;
export function endsWith<const T extends EndsWithArgs>(...args: [T] | [T["str"], T["suffix"]]): HKTF.Apply<EndsWith, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return args[0].str.endsWith(args[0].suffix) as unknown as HKTF.Apply<EndsWith, T>;
  }
  return (args[0] as string).endsWith(args[1] as string) as unknown as HKTF.Apply<EndsWith, T>;
}
