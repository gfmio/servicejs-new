import type { FunctionHKTF } from '@servicejs/hkt-core';
import type { HKTF } from '@servicejs/hkt-core';

export interface EveryArgs {
  tuple: readonly unknown[];
  predicate: FunctionHKTF.Predicate<unknown>;
}

export type EveryResult<T extends EveryArgs> = T['tuple'] extends readonly []
  ? true
  : T['tuple'] extends readonly [infer Head, ...infer Tail]
  ? T['predicate'] extends FunctionHKTF.Predicate<Head>
    ? EveryResult<{ tuple: Tail; predicate: T['predicate'] }>
    : false
  : true;

/**
 * Every HKTF - checks if all elements satisfy a predicate
 */
export interface Every extends HKTF.Base {
  [HKTF.ArgsSymbol]: EveryArgs;
  [HKTF.ResultSymbol]: EveryResult<HKTF.Args<this>>;
}

export function every<const A extends readonly unknown[], const P extends FunctionHKTF.Predicate<unknown>>(tuple: A, predicate: P): HKTF.Apply<Every, {tuple: A, predicate: P}>;
export function every<const T extends EveryArgs>(args: T): HKTF.Apply<Every, T>;
export function every<const T extends EveryArgs>(...args: [T] | [T["tuple"], T["predicate"]]): HKTF.Apply<Every, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    return args[0].tuple.every(args[0].predicate as any) as HKTF.Apply<Every, T>;
  }
  return (args[0] as T["tuple"]).every(args[1] as any) as HKTF.Apply<Every, T>;
}
