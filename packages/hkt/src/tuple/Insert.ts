import type * as Arithmetic from "ts-arithmetic";
import type * as HKTF from '../hktf';

export interface InsertArgs {
  tuple: readonly unknown[];
  index: number;
  element: unknown;
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

export type InsertResult<T extends InsertArgs> = readonly [
  ...TakeN<T['tuple'], T['index']>,
  T['element'],
  ...DropN<T['tuple'], T['index']>
];

/**
 * Insert HKTF - inserts an element at a specific index
 */
export interface Insert extends HKTF.Base {
  [HKTF.ArgsSymbol]: InsertArgs;
  [HKTF.ResultSymbol]: InsertResult<HKTF.Args<this>>;
}

export function insert<const A extends readonly unknown[], const I extends number, const E>(tuple: A, index: I, element: E): HKTF.Apply<Insert, {tuple: A, index: I, element: E}>;
export function insert<const T extends InsertArgs>(args: T): HKTF.Apply<Insert, T>;
export function insert<const T extends InsertArgs>(...args: [T] | [T["tuple"], T["index"], T["element"]]): HKTF.Apply<Insert, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    const result = [...args[0].tuple];
    result.splice(args[0].index, 0, args[0].element);
    return result as unknown as HKTF.Apply<Insert, T>;
  }
  const result = [...(args[0] as T["tuple"])];
  result.splice(args[1] as T["index"], 0, args[2] as T["element"]);
  return result as unknown as HKTF.Apply<Insert, T>;
}
