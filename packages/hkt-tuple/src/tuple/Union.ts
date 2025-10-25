import type { HKTF } from '@servicejs/hkt-core';

export interface UnionArgs {
  tuple1: readonly unknown[];
  tuple2: readonly unknown[];
}

// Helper to check if element is already in accumulator
type IsInAcc<E, Acc extends readonly unknown[]> =
  Acc extends readonly []
    ? false
    : Acc extends readonly [infer Head, ...infer Tail]
    ? E extends Head
      ? Head extends E
        ? true
        : IsInAcc<E, Tail>
      : IsInAcc<E, Tail>
    : false;

// Process first tuple
type ProcessTuple1<T extends readonly unknown[], Acc extends readonly unknown[] = readonly []> =
  T extends readonly []
    ? Acc
    : T extends readonly [infer Head, ...infer Tail]
    ? IsInAcc<Head, Acc> extends true
      ? ProcessTuple1<Tail, Acc>
      : ProcessTuple1<Tail, readonly [...Acc, Head]>
    : Acc;

// Process second tuple
type ProcessTuple2<T extends readonly unknown[], Acc extends readonly unknown[]> =
  T extends readonly []
    ? Acc
    : T extends readonly [infer Head, ...infer Tail]
    ? IsInAcc<Head, Acc> extends true
      ? ProcessTuple2<Tail, Acc>
      : ProcessTuple2<Tail, readonly [...Acc, Head]>
    : Acc;

export type UnionResult<T extends UnionArgs> = ProcessTuple2<T['tuple2'], ProcessTuple1<T['tuple1']>>;

/**
 * Union HKTF - combines two tuples and removes duplicates
 */
export interface Union extends HKTF.Base {
  [HKTF.ArgsSymbol]: UnionArgs;
  [HKTF.ResultSymbol]: UnionResult<HKTF.Args<this>>;
}

export function union<const A extends readonly unknown[], const B extends readonly unknown[]>(tuple1: A, tuple2: B): HKTF.Apply<Union, {tuple1: A, tuple2: B}>;
export function union<const T extends UnionArgs>(args: T): HKTF.Apply<Union, T>;
export function union<const T extends UnionArgs>(...args: [T] | [T["tuple1"], T["tuple2"]]): HKTF.Apply<Union, T> {
  if (typeof args[0] === 'object' && 'tuple1' in args[0]) {
    return Array.from(new Set([...args[0].tuple1, ...args[0].tuple2])) as unknown as HKTF.Apply<Union, T>;
  }
  return Array.from(new Set([...(args[0] as T["tuple1"]), ...(args[1] as T["tuple2"])])) as unknown as HKTF.Apply<Union, T>;
}
