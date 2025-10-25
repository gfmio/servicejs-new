import type { HKTF } from '@servicejs/hkt-core';

export interface ReverseArgs {
  tuple: readonly unknown[];
}

export type ReverseResult<T extends ReverseArgs> = T['tuple'] extends readonly []
  ? readonly []
  : T['tuple'] extends readonly [infer Head, ...infer Tail]
  ? readonly [...ReverseResult<{ tuple: Tail }>, Head]
  : readonly [];

/**
 * Reverse HKTF - reverses a tuple
 */
export interface Reverse extends HKTF.Base {
  [HKTF.ArgsSymbol]: ReverseArgs;
  [HKTF.ResultSymbol]: ReverseResult<HKTF.Args<this>>;
}

export function reverse<const A extends readonly unknown[]>(tuple: A): HKTF.Apply<Reverse, {tuple: A}>;
export function reverse<const T extends ReverseArgs>(args: T): HKTF.Apply<Reverse, T>;
export function reverse<const T extends ReverseArgs>(...args: [T] | [T["tuple"]]): HKTF.Apply<Reverse, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    return [...args[0].tuple].reverse() as unknown as HKTF.Apply<Reverse, T>;
  }
  return [...(args[0] as T["tuple"])].reverse() as unknown as HKTF.Apply<Reverse, T>;
}
