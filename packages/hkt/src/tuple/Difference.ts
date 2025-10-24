import type * as HKTF from '../hktf';

export interface DifferenceArgs {
  tuple1: readonly unknown[];
  tuple2: readonly unknown[];
}

// Helper to check if element is in a tuple
type IsInTuple<E, T extends readonly unknown[]> =
  T extends readonly []
    ? false
    : T extends readonly [infer Head, ...infer Tail]
    ? E extends Head
      ? Head extends E
        ? true
        : IsInTuple<E, Tail>
      : IsInTuple<E, Tail>
    : false;

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

export type DifferenceResult<T extends DifferenceArgs, Acc extends readonly unknown[] = readonly []> =
  T['tuple1'] extends readonly []
    ? Acc
    : T['tuple1'] extends readonly [infer Head, ...infer Tail]
    ? IsInTuple<Head, T['tuple2']> extends true
      ? DifferenceResult<{ tuple1: Tail; tuple2: T['tuple2'] }, Acc>
      : IsInAcc<Head, Acc> extends true
        ? DifferenceResult<{ tuple1: Tail; tuple2: T['tuple2'] }, Acc>
        : DifferenceResult<{ tuple1: Tail; tuple2: T['tuple2'] }, readonly [...Acc, Head]>
    : Acc;

/**
 * Difference HKTF - elements in first tuple but not in second
 */
export interface Difference extends HKTF.Base {
  [HKTF.ArgsSymbol]: DifferenceArgs;
  [HKTF.ResultSymbol]: DifferenceResult<HKTF.Args<this>>;
}

export function difference<const A extends readonly unknown[], const B extends readonly unknown[]>(tuple1: A, tuple2: B): HKTF.Apply<Difference, {tuple1: A, tuple2: B}>;
export function difference<const T extends DifferenceArgs>(args: T): HKTF.Apply<Difference, T>;
export function difference<const T extends DifferenceArgs>(...args: [T] | [T["tuple1"], T["tuple2"]]): HKTF.Apply<Difference, T> {
  if (typeof args[0] === 'object' && 'tuple1' in args[0]) {
    const set2 = new Set(args[0].tuple2);
    const result = Array.from(new Set(args[0].tuple1.filter(item => !set2.has(item))));
    return result as unknown as HKTF.Apply<Difference, T>;
  }
  const set2 = new Set(args[1] as T["tuple2"]);
  const result = Array.from(new Set((args[0] as T["tuple1"]).filter(item => !set2.has(item))));
  return result as unknown as HKTF.Apply<Difference, T>;
}
