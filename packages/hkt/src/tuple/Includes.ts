import type * as HKTF from '../hktf';

export interface IncludesArgs {
  tuple: readonly unknown[];
  element: unknown;
}

export type IncludesResult<T extends IncludesArgs> = T['tuple'] extends readonly []
  ? false
  : T['tuple'] extends readonly [infer Head, ...infer Tail]
  ? T['element'] extends Head
    ? Head extends T['element']
      ? true
      : IncludesResult<{ tuple: Tail; element: T['element'] }>
    : IncludesResult<{ tuple: Tail; element: T['element'] }>
  : false;

/**
 * Includes HKTF - checks if tuple includes an element
 * Returns boolean
 */
export interface Includes extends HKTF.Base {
  [HKTF.ArgsSymbol]: IncludesArgs;
  [HKTF.ResultSymbol]: IncludesResult<HKTF.Args<this>>;
}

export function includes<const A extends readonly unknown[], const E>(tuple: A, element: E): HKTF.Apply<Includes, {tuple: A, element: E}>;
export function includes<const T extends IncludesArgs>(args: T): HKTF.Apply<Includes, T>;
export function includes<const T extends IncludesArgs>(...args: [T] | [T["tuple"], T["element"]]): HKTF.Apply<Includes, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    return args[0].tuple.includes(args[0].element) as HKTF.Apply<Includes, T>;
  }
  return (args[0] as T["tuple"]).includes(args[1] as T["element"]) as HKTF.Apply<Includes, T>;
}
