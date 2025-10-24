import type * as Arithmetic from "ts-arithmetic";
import type * as HKTF from '../hktf';

export interface SplitArgs {
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

export type SplitResult<T extends SplitArgs> = readonly [
  TakeN<T['tuple'], T['index']>,
  DropN<T['tuple'], T['index']>
];

/**
 * Split HKTF - splits a tuple at a specific index into two tuples
 */
export interface Split extends HKTF.Base {
  [HKTF.ArgsSymbol]: SplitArgs;
  [HKTF.ResultSymbol]: SplitResult<HKTF.Args<this>>;
}

export function split<const A extends readonly unknown[], const I extends number>(tuple: A, index: I): HKTF.Apply<Split, {tuple: A, index: I}>;
export function split<const T extends SplitArgs>(args: T): HKTF.Apply<Split, T>;
export function split<const T extends SplitArgs>(...args: [T] | [T["tuple"], T["index"]]): HKTF.Apply<Split, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    return [args[0].tuple.slice(0, args[0].index), args[0].tuple.slice(args[0].index)] as unknown as HKTF.Apply<Split, T>;
  }
  return [(args[0] as T["tuple"]).slice(0, args[1] as T["index"]), (args[0] as T["tuple"]).slice(args[1] as T["index"])] as unknown as HKTF.Apply<Split, T>;
}
