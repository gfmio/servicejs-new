import type { HKTF } from '@servicejs/hkt-core';

export interface CharAtArgs {
  str: string;
  index: number;
}

// Type-level charAt is complex, simplified
export type CharAtResult<_T extends CharAtArgs> = string;

/**
 * CharAt HKTF - gets character at specific index
 */
export interface CharAt extends HKTF.Base {
  [HKTF.ArgsSymbol]: CharAtArgs;
  [HKTF.ResultSymbol]: CharAtResult<HKTF.Args<this>>;
}

export function charAt<const S extends string, const I extends number>(str: S, index: I): HKTF.Apply<CharAt, {str: S, index: I}>;
export function charAt<const T extends CharAtArgs>(args: T): HKTF.Apply<CharAt, T>;
export function charAt<const T extends CharAtArgs>(...args: [T] | [T["str"], T["index"]]): HKTF.Apply<CharAt, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return args[0].str.charAt(args[0].index) as unknown as HKTF.Apply<CharAt, T>;
  }
  return (args[0] as string).charAt(args[1] as number) as unknown as HKTF.Apply<CharAt, T>;
}
