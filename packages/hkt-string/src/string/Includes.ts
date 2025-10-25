import type { HKTF } from '@servicejs/hkt-core';

export interface IncludesArgs {
  str: string;
  substring: string;
}

export type IncludesResult<T extends IncludesArgs> = T['str'] extends `${string}${T['substring']}${string}` ? true : false;

/**
 * Includes HKTF - checks if string contains substring
 */
export interface Includes extends HKTF.Base {
  [HKTF.ArgsSymbol]: IncludesArgs;
  [HKTF.ResultSymbol]: IncludesResult<HKTF.Args<this>>;
}

export function includes<const S extends string, const Sub extends string>(str: S, substring: Sub): HKTF.Apply<Includes, {str: S, substring: Sub}>;
export function includes<const T extends IncludesArgs>(args: T): HKTF.Apply<Includes, T>;
export function includes<const T extends IncludesArgs>(...args: [T] | [T["str"], T["substring"]]): HKTF.Apply<Includes, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return args[0].str.includes(args[0].substring) as unknown as HKTF.Apply<Includes, T>;
  }
  return (args[0] as string).includes(args[1] as string) as unknown as HKTF.Apply<Includes, T>;
}
