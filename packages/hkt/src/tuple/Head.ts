import type * as HKTF from '../hktf';

export interface HeadArgs {
  tuple: readonly unknown[];
}

export type HeadResult<T extends HeadArgs> = T['tuple'] extends readonly [infer Head, ...any]
  ? Head
  : never;

/**
 * Head HKTF - gets the first element of a tuple
 */
export interface Head extends HKTF.Base {
  [HKTF.ArgsSymbol]: HeadArgs;
  [HKTF.ResultSymbol]: HeadResult<HKTF.Args<this>>;
}

export function head<const A extends readonly unknown[]>(tuple: A): HKTF.Apply<Head, {tuple: A}>;
export function head<const T extends HeadArgs>(args: T): HKTF.Apply<Head, T>;
export function head<const T extends HeadArgs>(...args: [T] | [T["tuple"]]): HKTF.Apply<Head, T> {
  return typeof args[0] === 'object' && 'tuple' in args[0]
    ? args[0].tuple[0] as HKTF.Apply<Head, T>
    : args[0][0] as HKTF.Apply<Head, T>;
}
