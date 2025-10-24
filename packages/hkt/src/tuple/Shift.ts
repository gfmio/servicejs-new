import type * as HKTF from '../hktf';

export interface ShiftArgs {
  tuple: readonly unknown[];
}

export type ShiftResult<T extends ShiftArgs> = T['tuple'] extends readonly [any, ...infer Tail]
  ? Tail
  : readonly [];

/**
 * Shift HKTF - removes the first element from a tuple
 */
export interface Shift extends HKTF.Base {
  [HKTF.ArgsSymbol]: ShiftArgs;
  [HKTF.ResultSymbol]: ShiftResult<HKTF.Args<this>>;
}

export function shift<const A extends readonly unknown[]>(tuple: A): HKTF.Apply<Shift, {tuple: A}>;
export function shift<const T extends ShiftArgs>(args: T): HKTF.Apply<Shift, T>;
export function shift<const T extends ShiftArgs>(...args: [T] | [T["tuple"]]): HKTF.Apply<Shift, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    return args[0].tuple.slice(1) as HKTF.Apply<Shift, T>;
  }
  return (args[0] as T["tuple"]).slice(1) as HKTF.Apply<Shift, T>;
}
