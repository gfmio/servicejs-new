import type { HKTF } from '@servicejs/hkt-core';

export interface ConcatArgs {
  tuple1: readonly unknown[];
  tuple2: readonly unknown[];
}

export type ConcatResult<T extends ConcatArgs> = readonly [...T['tuple1'], ...T['tuple2']];

/**
 * Concat HKTF - concatenates two tuples
 */
export interface Concat extends HKTF.Base {
  [HKTF.ArgsSymbol]: ConcatArgs;
  [HKTF.ResultSymbol]: ConcatResult<HKTF.Args<this>>;
}

export function concat<const A extends readonly unknown[], const B extends readonly unknown[]>(
  tuple1: A,
  tuple2: B
): HKTF.Apply<Concat, {tuple1: A, tuple2: B}>;
export function concat<const T extends ConcatArgs>(args: T): HKTF.Apply<Concat, T>;
export function concat<const T extends ConcatArgs>(...args: [T] | [T["tuple1"], T["tuple2"]]): HKTF.Apply<Concat, T> {
  return args.length === 1
    ? [...args[0].tuple1, ...args[0].tuple2] as HKTF.Apply<Concat, T>
    : [...args[0], ...args[1]] as HKTF.Apply<Concat, T>;
}
