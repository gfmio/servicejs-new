import type { HKTF } from '@servicejs/hkt-core';

export interface PadEndArgs {
  str: string;
  length: number;
  fill?: string;
}

// Type-level padding is complex, simplified
export type PadEndResult<_T extends PadEndArgs> = string;

/**
 * PadEnd HKTF - pads string from end to target length
 */
export interface PadEnd extends HKTF.Base {
  [HKTF.ArgsSymbol]: PadEndArgs;
  [HKTF.ResultSymbol]: PadEndResult<HKTF.Args<this>>;
}

export function padEnd<const S extends string, const L extends number, const F extends string = ' '>(str: S, length: L, fill?: F): any;
export function padEnd<const T extends PadEndArgs>(args: T): HKTF.Apply<PadEnd, T>;
export function padEnd<const T extends PadEndArgs>(...args: [T] | [T["str"], T["length"], T["fill"]?]): HKTF.Apply<PadEnd, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return args[0].str.padEnd(args[0].length, args[0].fill) as unknown as HKTF.Apply<PadEnd, T>;
  }
  return (args[0] as string).padEnd(args[1] as number, args[2] as string | undefined) as unknown as HKTF.Apply<PadEnd, T>;
}
