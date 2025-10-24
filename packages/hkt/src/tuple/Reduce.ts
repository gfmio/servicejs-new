import type * as FunctionHKTF from '../function';
import type * as HKTF from '../hktf';

export interface ReduceArgs {
  tuple: readonly unknown[];
  reducer: FunctionHKTF.Reducer<unknown, unknown>;
  initial: unknown;
}

export type ReduceResult<T extends ReduceArgs> = T['tuple'] extends readonly []
  ? T['initial']
  : T['tuple'] extends readonly [infer Head, ...infer Tail]
  ? ReduceResult<{
      tuple: Tail;
      reducer: T['reducer'];
      initial: T['reducer'] extends FunctionHKTF.Reducer<infer Acc, Head>
        ? Acc
        : never;
    }>
  : T['initial'];

/**
 * Reduce HKTF - reduces a tuple to a single value using a reducer function
 */
export interface Reduce extends HKTF.Base {
  [HKTF.ArgsSymbol]: ReduceArgs;
  [HKTF.ResultSymbol]: ReduceResult<HKTF.Args<this>>;
}

export function reduce<const A extends readonly unknown[], const R extends FunctionHKTF.Reducer<unknown, unknown>, const I>(tuple: A, reducer: R, initial: I): HKTF.Apply<Reduce, {tuple: A, reducer: R, initial: I}>;
export function reduce<const T extends ReduceArgs>(args: T): HKTF.Apply<Reduce, T>;
export function reduce<const T extends ReduceArgs>(...args: [T] | [T["tuple"], T["reducer"], T["initial"]]): HKTF.Apply<Reduce, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    return args[0].tuple.reduce(args[0].reducer as any, args[0].initial) as HKTF.Apply<Reduce, T>;
  }
  return (args[0] as T["tuple"]).reduce(args[1] as any, args[2] as T["initial"]) as HKTF.Apply<Reduce, T>;
}