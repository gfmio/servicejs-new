import * as Arithmetic from 'ts-arithmetic';
import type { HKTF } from '@servicejs/hkt-core';

export interface FillArgs {
  tuple: readonly unknown[];
  value: unknown;
  start?: number;
  end?: number;
}

// Helper to build filled tuple
type FillHelper<
  T extends readonly unknown[],
  V,
  Start extends number,
  End extends number | undefined,
  Index extends number = 0,
  Acc extends readonly unknown[] = readonly []
> = T extends readonly []
  ? Acc
  : T extends readonly [infer Head, ...infer Tail]
  ? Index extends Start
    ? End extends number
      ? Index extends End
        ? FillHelper<Tail, V, Start, End, Inc<Index>, readonly [...Acc, Head]>
        : FillHelper<Tail, V, Start, End, Inc<Index>, readonly [...Acc, V]>
      : FillHelper<Tail, V, Start, End, Inc<Index>, readonly [...Acc, V]>
    : Index extends number
      ? End extends number
        ? Index extends End
          ? FillHelper<Tail, V, Start, End, Inc<Index>, readonly [...Acc, Head]>
          : Inc<Index> extends number
            ? Inc<Index> extends Start
              ? FillHelper<Tail, V, Start, End, Inc<Index>, readonly [...Acc, V]>
              : FillHelper<Tail, V, Start, End, Inc<Index>, readonly [...Acc, Head]>
            : FillHelper<Tail, V, Start, End, Inc<Index>, readonly [...Acc, Head]>
        : Inc<Index> extends number
          ? Inc<Index> extends Start
            ? FillHelper<Tail, V, Start, End, Inc<Index>, readonly [...Acc, V]>
            : FillHelper<Tail, V, Start, End, Inc<Index>, readonly [...Acc, Head]>
          : FillHelper<Tail, V, Start, End, Inc<Index>, readonly [...Acc, Head]>
      : FillHelper<Tail, V, Start, End, Inc<Index>, readonly [...Acc, Head]>
  : Acc;

// Helper to increment
type Inc<N extends number> = Arithmetic.Add<N, 1>;

// Simplified: just fill entire tuple with value
type SimpleFill<T extends readonly unknown[], V> =
  T extends readonly []
    ? readonly []
    : T extends readonly [any, ...infer Tail]
      ? readonly [V, ...SimpleFill<Tail, V>]
      : readonly [];

export type FillResult<T extends FillArgs> =
  T['start'] extends number
    ? T['end'] extends number
      ? FillHelper<T['tuple'], T['value'], T['start'], T['end']>
      : FillHelper<T['tuple'], T['value'], T['start'], undefined>
    : SimpleFill<T['tuple'], T['value']>;

/**
 * Fill HKTF - fills all or part of a tuple with a static value
 */
export interface Fill extends HKTF.Base {
  [HKTF.ArgsSymbol]: FillArgs;
  [HKTF.ResultSymbol]: FillResult<HKTF.Args<this>>;
}

export function fill<const A extends readonly unknown[], const V, const S extends number | undefined = undefined, const E extends number | undefined = undefined>(tuple: A, value: V, start?: S, end?: E): any;
export function fill<const T extends FillArgs>(args: T): HKTF.Apply<Fill, T>;
export function fill<const T extends FillArgs>(...args: [T] | [T["tuple"], T["value"], T["start"]?, T["end"]?]): HKTF.Apply<Fill, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    const arr = [...args[0].tuple];
    return arr.fill(args[0].value, args[0].start, args[0].end) as unknown as HKTF.Apply<Fill, T>;
  }
  const arr = [...(args[0] as T["tuple"])];
  return arr.fill(args[1] as T["value"], args[2] as T["start"], args[3] as T["end"]) as unknown as HKTF.Apply<Fill, T>;
}
