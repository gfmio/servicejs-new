import * as Arithmetic from 'ts-arithmetic';
import type { HKTF } from '@servicejs/hkt-core';

export interface SliceArgs {
  tuple: readonly unknown[];
  start: number;
  end?: number;
}

// Helper type for building range (simplified - handles small ranges)
type BuildRange<
  T extends readonly unknown[],
  Start extends number,
  End extends number | undefined,
  Acc extends readonly unknown[] = readonly [],
  Current extends number = 0
> = Current extends Start
  ? End extends number
    ? Current extends End
      ? Acc
      : T extends readonly [infer Head, ...infer Tail]
        ? BuildRange<Tail, Start, End, readonly [...Acc, Head], Inc<Current>>
        : Acc
    : T extends readonly [infer Head, ...infer Tail]
      ? BuildRange<Tail, Start, End, readonly [...Acc, Head], Inc<Current>>
      : Acc
  : T extends readonly [any, ...infer Tail]
    ? BuildRange<Tail, Start, End, Acc, Inc<Current>>
    : readonly [];

// Helper to increment numbers (limited range)
type Inc<N extends number> = Arithmetic.Add<N, 1>;

export type SliceResult<T extends SliceArgs> = BuildRange<T['tuple'], T['start'], T['end']>;

/**
 * Slice HKTF - extracts a section of a tuple
 */
export interface Slice extends HKTF.Base {
  [HKTF.ArgsSymbol]: SliceArgs;
  [HKTF.ResultSymbol]: SliceResult<HKTF.Args<this>>;
}

export function slice<const A extends readonly unknown[], const S extends number, const E extends number | undefined = undefined>(tuple: A, start: S, end?: E): any;
export function slice<const T extends SliceArgs>(args: T): HKTF.Apply<Slice, T>;
export function slice<const T extends SliceArgs>(...args: [T] | [T["tuple"], T["start"], T["end"]?]): HKTF.Apply<Slice, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    return args[0].tuple.slice(args[0].start, args[0].end) as unknown as HKTF.Apply<Slice, T>;
  }
  return (args[0] as T["tuple"]).slice(args[1] as T["start"], args[2] as T["end"]) as unknown as HKTF.Apply<Slice, T>;
}
