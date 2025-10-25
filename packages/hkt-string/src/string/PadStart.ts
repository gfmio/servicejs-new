import type { HKTF } from '@servicejs/hkt-core';

export interface PadStartArgs {
  str: string;
  length: number;
  fill?: string;
}

// Type-level padding is complex, simplified
export type PadStartResult<_T extends PadStartArgs> = string;

/**
 * PadStart HKTF - pads string from start to target length
 */
export interface PadStart extends HKTF.Base {
  [HKTF.ArgsSymbol]: PadStartArgs;
  [HKTF.ResultSymbol]: PadStartResult<HKTF.Args<this>>;
}

export function padStart<const S extends string, const L extends number, const F extends string = ' '>(str: S, length: L, fill?: F): any;
export function padStart<const T extends PadStartArgs>(args: T): HKTF.Apply<PadStart, T>;
export function padStart<const T extends PadStartArgs>(...args: [T] | [T["str"], T["length"], T["fill"]?]): HKTF.Apply<PadStart, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return args[0].str.padStart(args[0].length, args[0].fill) as unknown as HKTF.Apply<PadStart, T>;
  }
  return (args[0] as string).padStart(args[1] as number, args[2] as string | undefined) as unknown as HKTF.Apply<PadStart, T>;
}
