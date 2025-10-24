import type * as FunctionHKTF from '../function';
import type * as HKTF from '../hktf';

export interface SomeArgs {
  tuple: readonly unknown[];
  predicate: FunctionHKTF.Predicate<unknown>;
}

export type SomeResult<T extends SomeArgs> = T['tuple'] extends readonly []
  ? false
  : T['tuple'] extends readonly [infer Head, ...infer Tail]
  ? T['predicate'] extends FunctionHKTF.Predicate<Head>
    ? true
    : SomeResult<{ tuple: Tail; predicate: T['predicate'] }>
  : false;

/**
 * Some HKTF - checks if any element satisfies a predicate
 */
export interface Some extends HKTF.Base {
  [HKTF.ArgsSymbol]: SomeArgs;
  [HKTF.ResultSymbol]: SomeResult<HKTF.Args<this>>;
}

export function some<const A extends readonly unknown[], const P extends FunctionHKTF.Predicate<unknown>>(tuple: A, predicate: P): HKTF.Apply<Some, {tuple: A, predicate: P}>;
export function some<const T extends SomeArgs>(args: T): HKTF.Apply<Some, T>;
export function some<const T extends SomeArgs>(...args: [T] | [T["tuple"], T["predicate"]]): HKTF.Apply<Some, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    return args[0].tuple.some(args[0].predicate as any) as HKTF.Apply<Some, T>;
  }
  return (args[0] as T["tuple"]).some(args[1] as any) as HKTF.Apply<Some, T>;
}
