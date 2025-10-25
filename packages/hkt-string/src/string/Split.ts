import type { HKTF } from '@servicejs/hkt-core';

export interface SplitArgs {
  str: string;
  delimiter: string;
}

export type SplitResult<T extends SplitArgs> = T['str'] extends `${infer Head}${T['delimiter']}${infer Tail}`
  ? readonly [Head, ...SplitResult<{ str: Tail; delimiter: T['delimiter'] }>]
  : readonly [T['str']];

/**
 * Split HKTF - splits string by delimiter into tuple
 */
export interface Split extends HKTF.Base {
  [HKTF.ArgsSymbol]: SplitArgs;
  [HKTF.ResultSymbol]: SplitResult<HKTF.Args<this>>;
}

// @ts-ignore Type instantiation is excessively deep and possibly infinite.ts(2589)
export function split<const S extends string, const D extends string>(str: S, delimiter: D): HKTF.Apply<Split, {str: S, delimiter: D}>;
export function split<const T extends SplitArgs>(args: T): HKTF.Apply<Split, T>;
export function split<const T extends SplitArgs>(...args: [T] | [T["str"], T["delimiter"]]): HKTF.Apply<Split, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return args[0].str.split(args[0].delimiter) as unknown as HKTF.Apply<Split, T>;
  }
  return (args[0] as string).split(args[1] as string) as unknown as HKTF.Apply<Split, T>;
}
