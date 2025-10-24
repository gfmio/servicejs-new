import type * as HKTF from '../hktf';

export interface PopArgs {
  tuple: readonly unknown[];
}

export type PopResult<T extends PopArgs> = T['tuple'] extends readonly [...infer Init, any]
  ? Init
  : readonly [];

/**
 * Pop HKTF - removes the last element from a tuple
 */
export interface Pop extends HKTF.Base {
  [HKTF.ArgsSymbol]: PopArgs;
  [HKTF.ResultSymbol]: PopResult<HKTF.Args<this>>;
}

export function pop<const A extends readonly unknown[]>(tuple: A): HKTF.Apply<Pop, {tuple: A}>;
export function pop<const T extends PopArgs>(args: T): HKTF.Apply<Pop, T>;
export function pop<const T extends PopArgs>(...args: [T] | [T["tuple"]]): HKTF.Apply<Pop, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    return args[0].tuple.slice(0, -1) as HKTF.Apply<Pop, T>;
  }
  return (args[0] as T["tuple"]).slice(0, -1) as HKTF.Apply<Pop, T>;
}
