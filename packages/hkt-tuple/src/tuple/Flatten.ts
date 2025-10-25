import type { HKTF } from '@servicejs/hkt-core';

export interface FlattenArgs {
  tuple: readonly (readonly unknown[])[];
}

export type FlattenResult<T extends FlattenArgs> = T['tuple'] extends readonly []
  ? readonly []
  : T['tuple'] extends readonly [infer Head, ...infer Tail]
  ? Head extends readonly unknown[]
    ? Tail extends readonly (readonly unknown[])[]
      ? readonly [...Head, ...FlattenResult<{ tuple: Tail }>]
      : readonly [...Head]
    : never
  : readonly [];

/**
 * Flatten HKTF - flattens a nested tuple one level
 */
export interface Flatten extends HKTF.Base {
  [HKTF.ArgsSymbol]: FlattenArgs;
  [HKTF.ResultSymbol]: FlattenResult<HKTF.Args<this>>;
}

export function flatten<const A extends readonly (readonly unknown[])[]>(tuple: A): HKTF.Apply<Flatten, {tuple: A}>;
export function flatten<const T extends FlattenArgs>(args: T): HKTF.Apply<Flatten, T>;
export function flatten<const T extends FlattenArgs>(...args: [T] | [T["tuple"]]): HKTF.Apply<Flatten, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    return args[0].tuple.flat() as unknown as HKTF.Apply<Flatten, T>;
  }
  return (args[0] as T["tuple"]).flat() as unknown as HKTF.Apply<Flatten, T>;
}
