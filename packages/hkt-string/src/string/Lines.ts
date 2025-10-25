import type { HKTF } from '@servicejs/hkt-core';

export interface LinesArgs {
  str: string;
}

// Type-level lines is complex, simplified
export type LinesResult<_T extends LinesArgs> = readonly string[];

/**
 * Lines HKTF - splits string into lines
 */
export interface Lines extends HKTF.Base {
  [HKTF.ArgsSymbol]: LinesArgs;
  [HKTF.ResultSymbol]: LinesResult<HKTF.Args<this>>;
}

export function lines<const S extends string>(str: S): HKTF.Apply<Lines, {str: S}>;
export function lines<const T extends LinesArgs>(args: T): HKTF.Apply<Lines, T>;
export function lines<const T extends LinesArgs>(...args: [T] | [T["str"]]): HKTF.Apply<Lines, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return args[0].str.split(/\r?\n/) as unknown as HKTF.Apply<Lines, T>;
  }
  return (args[0] as string).split(/\r?\n/) as unknown as HKTF.Apply<Lines, T>;
}
