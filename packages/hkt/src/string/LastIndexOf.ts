import type * as HKTF from '../hktf';

export interface LastIndexOfArgs {
  str: string;
  substring: string;
}

// Type-level lastIndexOf is complex, simplified to return number
export type LastIndexOfResult<_T extends LastIndexOfArgs> = number;

/**
 * LastIndexOf HKTF - gets index of last occurrence of substring
 */
export interface LastIndexOf extends HKTF.Base {
  [HKTF.ArgsSymbol]: LastIndexOfArgs;
  [HKTF.ResultSymbol]: LastIndexOfResult<HKTF.Args<this>>;
}

export function lastIndexOf<const S extends string, const Sub extends string>(str: S, substring: Sub): HKTF.Apply<LastIndexOf, {str: S, substring: Sub}>;
export function lastIndexOf<const T extends LastIndexOfArgs>(args: T): HKTF.Apply<LastIndexOf, T>;
export function lastIndexOf<const T extends LastIndexOfArgs>(...args: [T] | [T["str"], T["substring"]]): HKTF.Apply<LastIndexOf, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return args[0].str.lastIndexOf(args[0].substring) as unknown as HKTF.Apply<LastIndexOf, T>;
  }
  return (args[0] as string).lastIndexOf(args[1] as string) as unknown as HKTF.Apply<LastIndexOf, T>;
}
