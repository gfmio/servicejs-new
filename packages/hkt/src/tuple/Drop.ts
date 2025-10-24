import type * as HKTF from '../hktf';

export interface DropArgs {
  tuple: readonly unknown[];
  n: number;
}

// Helper type for decrementing numbers (limited range)
type SubtractOne<N extends number> =
  N extends 20 ? 19 :
  N extends 19 ? 18 :
  N extends 18 ? 17 :
  N extends 17 ? 16 :
  N extends 16 ? 15 :
  N extends 15 ? 14 :
  N extends 14 ? 13 :
  N extends 13 ? 12 :
  N extends 12 ? 11 :
  N extends 11 ? 10 :
  N extends 10 ? 9 :
  N extends 9 ? 8 :
  N extends 8 ? 7 :
  N extends 7 ? 6 :
  N extends 6 ? 5 :
  N extends 5 ? 4 :
  N extends 4 ? 3 :
  N extends 3 ? 2 :
  N extends 2 ? 1 :
  N extends 1 ? 0 :
  0;

export type DropResult<T extends DropArgs> = T['n'] extends 0
  ? T['tuple']
  : T['tuple'] extends readonly [any, ...infer Tail]
  ? T['n'] extends number
    ? SubtractOne<T['n']> extends infer N extends number
      ? DropResult<{ tuple: Tail; n: N }>
      : Tail
    : Tail
  : readonly [];

/**
 * Drop HKTF - drops first N elements
 */
export interface Drop extends HKTF.Base {
  [HKTF.ArgsSymbol]: DropArgs;
  [HKTF.ResultSymbol]: DropResult<HKTF.Args<this>>;
}

export function drop<const A extends readonly unknown[], const N extends number>(tuple: A, n: N): HKTF.Apply<Drop, {tuple: A, n: N}>;
export function drop<const T extends DropArgs>(args: T): HKTF.Apply<Drop, T>;
export function drop<const T extends DropArgs>(...args: [T] | [T["tuple"], T["n"]]): HKTF.Apply<Drop, T> {
  return typeof args[0] === 'object' && 'tuple' in args[0]
    ? args[0].tuple.slice(args[0].n) as HKTF.Apply<Drop, T>
    : (args[0] as T["tuple"]).slice(args[1] as T["n"]) as HKTF.Apply<Drop, T>;
}
