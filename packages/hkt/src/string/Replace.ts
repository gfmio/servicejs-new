import type * as HKTF from '../hktf';

export interface ReplaceArgs {
  str: string;
  search: string;
  replacement: string;
}

export type ReplaceResult<T extends ReplaceArgs> = T['str'] extends `${infer Before}${T['search']}${infer After}`
  ? `${Before}${T['replacement']}${After}`
  : T['str'];

/**
 * Replace HKTF - replaces first occurrence of substring
 */
export interface Replace extends HKTF.Base {
  [HKTF.ArgsSymbol]: ReplaceArgs;
  [HKTF.ResultSymbol]: ReplaceResult<HKTF.Args<this>>;
}

export function replace<const S extends string, const Search extends string, const R extends string>(str: S, search: Search, replacement: R): HKTF.Apply<Replace, {str: S, search: Search, replacement: R}>;
export function replace<const T extends ReplaceArgs>(args: T): HKTF.Apply<Replace, T>;
export function replace<const T extends ReplaceArgs>(...args: [T] | [T["str"], T["search"], T["replacement"]]): HKTF.Apply<Replace, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return args[0].str.replace(args[0].search, args[0].replacement) as unknown as HKTF.Apply<Replace, T>;
  }
  return (args[0] as string).replace(args[1] as string, args[2] as string) as unknown as HKTF.Apply<Replace, T>;
}
