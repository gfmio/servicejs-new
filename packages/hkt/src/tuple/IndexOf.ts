import * as Arithmetic from 'ts-arithmetic';
import type * as HKTF from '../hktf';

export interface IndexOfArgs {
  tuple: readonly unknown[];
  element: unknown;
}

// Helper to increment (for tracking index)
type Inc<N extends number> = Arithmetic.Add<N, 1>;

type IndexOfHelper<T extends readonly unknown[], E, Index extends number = 0> =
  T extends readonly []
    ? -1
    : T extends readonly [infer Head, ...infer Tail]
    ? E extends Head
      ? Head extends E
        ? Index
        : IndexOfHelper<Tail, E, Inc<Index>>
      : IndexOfHelper<Tail, E, Inc<Index>>
    : -1;

export type IndexOfResult<T extends IndexOfArgs> = IndexOfHelper<T['tuple'], T['element']>;

/**
 * IndexOf HKTF - finds the index of the first occurrence of an element
 * Returns -1 if not found
 */
export interface IndexOf extends HKTF.Base {
  [HKTF.ArgsSymbol]: IndexOfArgs;
  [HKTF.ResultSymbol]: IndexOfResult<HKTF.Args<this>>;
}

export function indexOf<const A extends readonly unknown[], const E>(tuple: A, element: E): HKTF.Apply<IndexOf, {tuple: A, element: E}>;
export function indexOf<const T extends IndexOfArgs>(args: T): HKTF.Apply<IndexOf, T>;
export function indexOf<const T extends IndexOfArgs>(...args: [T] | [T["tuple"], T["element"]]): HKTF.Apply<IndexOf, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    return args[0].tuple.indexOf(args[0].element) as HKTF.Apply<IndexOf, T>;
  }
  return (args[0] as T["tuple"]).indexOf(args[1] as T["element"]) as HKTF.Apply<IndexOf, T>;
}
