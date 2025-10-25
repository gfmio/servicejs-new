import type { HKTF } from '@servicejs/hkt-core';

export interface ReplaceAllArgs {
  str: string;
  search: string;
  replacement: string;
}

export type ReplaceAllResult<T extends ReplaceAllArgs> = T['str'] extends `${infer Before}${T['search']}${infer After}`
  ? `${Before}${T['replacement']}${ReplaceAllResult<{ str: After; search: T['search']; replacement: T['replacement'] }>}`
  : T['str'];

/**
 * ReplaceAll HKTF - replaces all occurrences of substring
 */
export interface ReplaceAll extends HKTF.Base {
  [HKTF.ArgsSymbol]: ReplaceAllArgs;
  [HKTF.ResultSymbol]: ReplaceAllResult<HKTF.Args<this>>;
}

// @ts-ignore Type instantiation is excessively deep and possibly infinite.ts(2589)
export function replaceAll<const S extends string, const Search extends string, const R extends string>(str: S, search: Search, replacement: R): HKTF.Apply<ReplaceAll, {str: S, search: Search, replacement: R}>;
export function replaceAll<const T extends ReplaceAllArgs>(args: T): HKTF.Apply<ReplaceAll, T>;
export function replaceAll<const T extends ReplaceAllArgs>(...args: [T] | [T["str"], T["search"], T["replacement"]]): HKTF.Apply<ReplaceAll, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return args[0].str.replaceAll(args[0].search, args[0].replacement) as unknown as HKTF.Apply<ReplaceAll, T>;
  }
  return (args[0] as string).replaceAll(args[1] as string, args[2] as string) as unknown as HKTF.Apply<ReplaceAll, T>;
}
