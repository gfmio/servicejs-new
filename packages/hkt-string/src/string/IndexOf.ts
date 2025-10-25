import type { HKTF } from '@servicejs/hkt-core';

export interface IndexOfArgs {
  str: string;
  substring: string;
}

// Type-level indexOf is complex, simplified to return number
export type IndexOfResult<_T extends IndexOfArgs> = number;

/**
 * IndexOf HKTF - gets index of first occurrence of substring
 */
export interface IndexOf extends HKTF.Base {
  [HKTF.ArgsSymbol]: IndexOfArgs;
  [HKTF.ResultSymbol]: IndexOfResult<HKTF.Args<this>>;
}

export function indexOf<const S extends string, const Sub extends string>(str: S, substring: Sub): HKTF.Apply<IndexOf, {str: S, substring: Sub}>;
export function indexOf<const T extends IndexOfArgs>(args: T): HKTF.Apply<IndexOf, T>;
export function indexOf<const T extends IndexOfArgs>(...args: [T] | [T["str"], T["substring"]]): HKTF.Apply<IndexOf, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return args[0].str.indexOf(args[0].substring) as unknown as HKTF.Apply<IndexOf, T>;
  }
  return (args[0] as string).indexOf(args[1] as string) as unknown as HKTF.Apply<IndexOf, T>;
}
