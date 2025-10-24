import type * as FunctionHKTF from '../function';
import type * as HKTF from '../hktf';

export interface FlatMapArgs {
  tuple: readonly unknown[];
  fn: FunctionHKTF.Fn1<unknown, readonly unknown[]>;
}

export type FlatMapResult<T extends FlatMapArgs> = T['tuple'] extends readonly []
  ? readonly []
  : T['tuple'] extends readonly [infer Head, ...infer Tail]
  ? T['fn'] extends FunctionHKTF.Fn1<Head, infer R extends readonly unknown[]>
    ? readonly [...R, ...FlatMapResult<{ tuple: Tail; fn: T['fn'] }>]
    : FlatMapResult<{ tuple: Tail; fn: T['fn'] }>
  : readonly [];

/**
 * FlatMap HKTF - maps a function over tuple elements and flattens the result one level
 */
export interface FlatMap extends HKTF.Base {
  [HKTF.ArgsSymbol]: FlatMapArgs;
  [HKTF.ResultSymbol]: FlatMapResult<HKTF.Args<this>>;
}

export function flatMap<const A extends readonly unknown[], const F extends FunctionHKTF.Fn1<unknown, readonly unknown[]>>(tuple: A, fn: F): HKTF.Apply<FlatMap, {tuple: A, fn: F}>;
export function flatMap<const T extends FlatMapArgs>(args: T): HKTF.Apply<FlatMap, T>;
export function flatMap<const T extends FlatMapArgs>(...args: [T] | [T["tuple"], T["fn"]]): HKTF.Apply<FlatMap, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    return args[0].tuple.flatMap(args[0].fn as any) as unknown as HKTF.Apply<FlatMap, T>;
  }
  return (args[0] as T["tuple"]).flatMap(args[1] as any) as unknown as HKTF.Apply<FlatMap, T>;
}
