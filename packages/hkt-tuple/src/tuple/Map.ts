import type { FunctionHKTF } from '@servicejs/hkt-core';
import type { HKTF } from '@servicejs/hkt-core';

export interface MapArgs {
  tuple: readonly unknown[];
  fn: FunctionHKTF.Fn1<unknown, unknown>;
}

export type MapResult<T extends MapArgs> = T['tuple'] extends readonly []
  ? readonly []
  : T['tuple'] extends readonly [infer Head, ...infer Tail]
  ? readonly [
      T['fn'] extends FunctionHKTF.Fn1<Head, infer R> ? R : never,
      ...MapResult<{ tuple: Tail; fn: T['fn'] }>
    ]
  : readonly [];

/**
 * Map HKTF - applies a function to each element of a tuple
 */
export interface Map extends HKTF.Base {
  [HKTF.ArgsSymbol]: MapArgs;
  [HKTF.ResultSymbol]: MapResult<HKTF.Args<this>>;
}

export function map<const A extends readonly unknown[], const F extends FunctionHKTF.Fn1<unknown, unknown>>(tuple: A, fn: F): HKTF.Apply<Map, {tuple: A, fn: F}>;
export function map<const T extends MapArgs>(args: T): HKTF.Apply<Map, T>;
export function map<const T extends MapArgs>(...args: [T] | [T["tuple"], T["fn"]]): HKTF.Apply<Map, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    return args[0].tuple.map(args[0].fn as any) as unknown as HKTF.Apply<Map, T>;
  }
  return (args[0] as T["tuple"]).map(args[1] as any) as unknown as HKTF.Apply<Map, T>;
}
