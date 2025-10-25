import type { HKTF } from '@servicejs/hkt-core';

export interface TailArgs {
  tuple: readonly unknown[];
}

export type TailResult<T extends TailArgs> = T['tuple'] extends readonly [any, ...infer Tail]
  ? Tail
  : readonly [];

/**
 * Tail HKTF - gets all elements except the first
 */
export interface Tail extends HKTF.Base {
  [HKTF.ArgsSymbol]: TailArgs;
  [HKTF.ResultSymbol]: TailResult<HKTF.Args<this>>;
}

export function tail<const A extends readonly unknown[]>(tuple: A): HKTF.Apply<Tail, {tuple: A}>;
export function tail<const T extends TailArgs>(args: T): HKTF.Apply<Tail, T>;
export function tail<const T extends TailArgs>(...args: [T] | [T["tuple"]]): HKTF.Apply<Tail, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    return args[0].tuple.slice(1) as unknown as HKTF.Apply<Tail, T>;
  }
  return (args[0] as T["tuple"]).slice(1) as unknown as HKTF.Apply<Tail, T>;
}
