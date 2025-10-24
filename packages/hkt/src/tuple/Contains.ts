import type * as HKTF from '../hktf';

export interface ContainsArgs {
  tuple: readonly unknown[];
  element: unknown;
}

export type ContainsResult<T extends ContainsArgs> = T['tuple'] extends readonly []
  ? false
  : T['tuple'] extends readonly [infer Head, ...infer Tail]
  ? T['element'] extends Head
    ? Head extends T['element']
      ? true
      : ContainsResult<{ tuple: Tail; element: T['element'] }>
    : ContainsResult<{ tuple: Tail; element: T['element'] }>
  : false;

/**
 * Contains HKTF - checks if tuple contains an element
 * Note: Uses structural type equality
 */
export interface Contains extends HKTF.Base {
  [HKTF.ArgsSymbol]: ContainsArgs;
  [HKTF.ResultSymbol]: ContainsResult<HKTF.Args<this>>;
}

export function contains<const A extends readonly unknown[], const E>(tuple: A, element: E): HKTF.Apply<Contains, {tuple: A, element: E}>;
export function contains<const T extends ContainsArgs>(args: T): HKTF.Apply<Contains, T>;
export function contains<const T extends ContainsArgs>(...args: [T] | [T["tuple"], T["element"]]): HKTF.Apply<Contains, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    return args[0].tuple.includes(args[0].element) as HKTF.Apply<Contains, T>;
  }
  return (args[0] as T["tuple"]).includes(args[1] as T["element"]) as HKTF.Apply<Contains, T>;
}
