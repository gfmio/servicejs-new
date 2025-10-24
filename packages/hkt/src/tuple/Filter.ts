import type * as FunctionHKTF from '../function';
import type * as HKTF from '../hktf';

export interface FilterArgs {
  tuple: readonly unknown[];
  predicate: FunctionHKTF.Predicate<unknown>;
}

export type FilterResult<T extends FilterArgs> = T['tuple'] extends readonly []
  ? readonly []
  : T['tuple'] extends readonly [infer Head, ...infer Tail]
  ? T['predicate'] extends FunctionHKTF.Predicate<Head>
    ? readonly [
        Head,
        ...FilterResult<{ tuple: Tail; predicate: T['predicate'] }>
      ]
    : FilterResult<{ tuple: Tail; predicate: T['predicate'] }>
  : readonly [];

/**
 * Filter HKTF - keeps only elements that satisfy a predicate
 */
export interface Filter extends HKTF.Base {
  [HKTF.ArgsSymbol]: FilterArgs;
  [HKTF.ResultSymbol]: FilterResult<HKTF.Args<this>>;
}

export function filter<const A extends readonly unknown[], const P extends FunctionHKTF.Predicate<unknown>>(tuple: A, predicate: P): HKTF.Apply<Filter, {tuple: A, predicate: P}>;
export function filter<const T extends FilterArgs>(args: T): HKTF.Apply<Filter, T>;
export function filter<const T extends FilterArgs>(...args: [T] | [T["tuple"], T["predicate"]]): HKTF.Apply<Filter, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    return args[0].tuple.filter(args[0].predicate as any) as unknown as HKTF.Apply<Filter, T>;
  }
  return (args[0] as T["tuple"]).filter(args[1] as any) as unknown as HKTF.Apply<Filter, T>;
}
