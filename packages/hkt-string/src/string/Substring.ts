import type { HKTF } from '@servicejs/hkt-core';

export interface SubstringArgs {
  str: string;
  start: number;
  end?: number;
}

// Type-level substring is complex, simplified
export type SubstringResult<_T extends SubstringArgs> = string;

/**
 * Substring HKTF - extracts substring from start to end
 */
export interface Substring extends HKTF.Base {
  [HKTF.ArgsSymbol]: SubstringArgs;
  [HKTF.ResultSymbol]: SubstringResult<HKTF.Args<this>>;
}

export function substring<const S extends string, const Start extends number, const End extends number | undefined = undefined>(str: S, start: Start, end?: End): any;
export function substring<const T extends SubstringArgs>(args: T): HKTF.Apply<Substring, T>;
export function substring<const T extends SubstringArgs>(...args: [T] | [T["str"], T["start"], T["end"]?]): HKTF.Apply<Substring, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return args[0].str.substring(args[0].start, args[0].end) as unknown as HKTF.Apply<Substring, T>;
  }
  return (args[0] as string).substring(args[1] as number, args[2] as number | undefined) as unknown as HKTF.Apply<Substring, T>;
}
