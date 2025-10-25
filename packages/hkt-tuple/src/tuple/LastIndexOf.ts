import * as Arithmetic from 'ts-arithmetic';
import type { HKTF } from '@servicejs/hkt-core';

export interface LastIndexOfArgs {
  tuple: readonly unknown[];
  element: unknown;
}

// Helper to increment
type Inc<N extends number> = Arithmetic.Add<N, 1>;

type LastIndexOfHelper<T extends readonly unknown[], E, Index extends number = 0, LastFound extends number = -1> =
  T extends readonly []
    ? LastFound
    : T extends readonly [infer Head, ...infer Tail]
    ? E extends Head
      ? Head extends E
        ? LastIndexOfHelper<Tail, E, Inc<Index>, Index>
        : LastIndexOfHelper<Tail, E, Inc<Index>, LastFound>
      : LastIndexOfHelper<Tail, E, Inc<Index>, LastFound>
    : LastFound;

export type LastIndexOfResult<T extends LastIndexOfArgs> = LastIndexOfHelper<T['tuple'], T['element']>;

/**
 * LastIndexOf HKTF - finds the index of the last occurrence of an element
 * Returns -1 if not found
 */
export interface LastIndexOf extends HKTF.Base {
  [HKTF.ArgsSymbol]: LastIndexOfArgs;
  [HKTF.ResultSymbol]: LastIndexOfResult<HKTF.Args<this>>;
}

export function lastIndexOf<const A extends readonly unknown[], const E>(tuple: A, element: E): HKTF.Apply<LastIndexOf, {tuple: A, element: E}>;
export function lastIndexOf<const T extends LastIndexOfArgs>(args: T): HKTF.Apply<LastIndexOf, T>;
export function lastIndexOf<const T extends LastIndexOfArgs>(...args: [T] | [T["tuple"], T["element"]]): HKTF.Apply<LastIndexOf, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    return args[0].tuple.lastIndexOf(args[0].element) as HKTF.Apply<LastIndexOf, T>;
  }
  return (args[0] as T["tuple"]).lastIndexOf(args[1] as T["element"]) as HKTF.Apply<LastIndexOf, T>;
}
