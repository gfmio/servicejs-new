import * as Arithmetic from 'ts-arithmetic';
import type { HKTF } from '@servicejs/hkt-core';

export interface RemoveArgs {
  tuple: readonly unknown[];
  index: number;
}

// Helper to decrement numbers
type Dec<N extends number> = Arithmetic.Subtract<N, 1>;

// Take first N elements
type TakeN<T extends readonly unknown[], N extends number, Acc extends readonly unknown[] = readonly []> =
  N extends 0
    ? Acc
    : T extends readonly [infer Head, ...infer Tail]
      ? TakeN<Tail, Dec<N>, readonly [...Acc, Head]>
      : Acc;

// Drop first N elements
type DropN<T extends readonly unknown[], N extends number> =
  N extends 0
    ? T
    : T extends readonly [any, ...infer Tail]
      ? DropN<Tail, Dec<N>>
      : readonly [];

export type RemoveResult<T extends RemoveArgs> = readonly [
  ...TakeN<T['tuple'], T['index']>,
  ...DropN<T['tuple'], Inc<T['index']>>
];

// Helper to increment numbers
type Inc<N extends number> = Arithmetic.Add<N, 1>;

/**
 * Remove HKTF - removes an element at a specific index
 */
export interface Remove extends HKTF.Base {
  [HKTF.ArgsSymbol]: RemoveArgs;
  [HKTF.ResultSymbol]: RemoveResult<HKTF.Args<this>>;
}

export function remove<const A extends readonly unknown[], const I extends number>(tuple: A, index: I): HKTF.Apply<Remove, {tuple: A, index: I}>;
export function remove<const T extends RemoveArgs>(args: T): HKTF.Apply<Remove, T>;
export function remove<const T extends RemoveArgs>(...args: [T] | [T["tuple"], T["index"]]): HKTF.Apply<Remove, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    const result = [...args[0].tuple];
    result.splice(args[0].index, 1);
    return result as unknown as HKTF.Apply<Remove, T>;
  }
  const result = [...(args[0] as T["tuple"])];
  result.splice(args[1] as T["index"], 1);
  return result as unknown as HKTF.Apply<Remove, T>;
}
