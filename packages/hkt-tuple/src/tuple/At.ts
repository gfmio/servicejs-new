import * as Arithmetic from 'ts-arithmetic';
import type { HKTF } from '@servicejs/hkt-core';

export interface AtArgs {
  tuple: readonly unknown[];
  index: number;
}

// Helper to decrement
type Dec<N extends number> = Arithmetic.Subtract<N, 1>;

type AtHelper<T extends readonly unknown[], N extends number> =
  N extends 0
    ? T extends readonly [infer Head, ...any]
      ? Head
      : undefined
    : T extends readonly [any, ...infer Tail]
      ? AtHelper<Tail, Dec<N>>
      : undefined;

export type AtResult<T extends AtArgs> = AtHelper<T['tuple'], T['index']>;

/**
 * At HKTF - gets element at specific index (safer than direct indexing)
 * Returns undefined if index is out of bounds
 */
export interface At extends HKTF.Base {
  [HKTF.ArgsSymbol]: AtArgs;
  [HKTF.ResultSymbol]: AtResult<HKTF.Args<this>>;
}

export function at<const A extends readonly unknown[], const I extends number>(tuple: A, index: I): HKTF.Apply<At, {tuple: A, index: I}>;
export function at<const T extends AtArgs>(args: T): HKTF.Apply<At, T>;
export function at<const T extends AtArgs>(...args: [T] | [T["tuple"], T["index"]]): HKTF.Apply<At, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    return args[0].tuple[args[0].index] as HKTF.Apply<At, T>;
  }
  return (args[0] as T["tuple"])[args[1] as T["index"]] as HKTF.Apply<At, T>;
}
