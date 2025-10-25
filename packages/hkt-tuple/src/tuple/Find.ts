import type { FunctionHKTF } from '@servicejs/hkt-core';
import type { HKTF } from '@servicejs/hkt-core';

export interface FindArgs {
  tuple: readonly unknown[];
  predicate: FunctionHKTF.Predicate<unknown>;
}

export type FindResult<T extends FindArgs> = T['tuple'] extends readonly []
  ? never
  : T['tuple'] extends readonly [infer Head, ...infer Tail]
  ? T['predicate'] extends FunctionHKTF.Predicate<Head>
    ? Head
    : FindResult<{ tuple: Tail; predicate: T['predicate'] }>
  : never;

/**
 * Find HKTF - finds first element matching predicate
 */
export interface Find extends HKTF.Base {
  [HKTF.ArgsSymbol]: FindArgs;
  [HKTF.ResultSymbol]: FindResult<HKTF.Args<this>>;
}

export function find<const A extends readonly unknown[], const P extends FunctionHKTF.Predicate<unknown>>(tuple: A, predicate: P): HKTF.Apply<Find, {tuple: A, predicate: P}>;
export function find<const T extends FindArgs>(args: T): HKTF.Apply<Find, T>;
export function find<const T extends FindArgs>(...args: [T] | [T["tuple"], T["predicate"]]): HKTF.Apply<Find, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    return args[0].tuple.find(args[0].predicate as any) as HKTF.Apply<Find, T>;
  }
  return (args[0] as T["tuple"]).find(args[1] as any) as HKTF.Apply<Find, T>;
}
