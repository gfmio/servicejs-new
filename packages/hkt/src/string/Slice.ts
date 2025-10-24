import type * as HKTF from '../hktf';

export interface SliceArgs {
  str: string;
  start: number;
  end?: number;
}

// Type-level slice is complex, simplified
export type SliceResult<_T extends SliceArgs> = string;

/**
 * Slice HKTF - extracts section of string
 */
export interface Slice extends HKTF.Base {
  [HKTF.ArgsSymbol]: SliceArgs;
  [HKTF.ResultSymbol]: SliceResult<HKTF.Args<this>>;
}

export function slice<const S extends string, const Start extends number, const End extends number | undefined = undefined>(str: S, start: Start, end?: End): any;
export function slice<const T extends SliceArgs>(args: T): HKTF.Apply<Slice, T>;
export function slice<const T extends SliceArgs>(...args: [T] | [T["str"], T["start"], T["end"]?]): HKTF.Apply<Slice, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return args[0].str.slice(args[0].start, args[0].end) as unknown as HKTF.Apply<Slice, T>;
  }
  return (args[0] as string).slice(args[1] as number, args[2] as number | undefined) as unknown as HKTF.Apply<Slice, T>;
}
