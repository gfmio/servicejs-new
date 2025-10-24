import type * as HKTF from '../hktf';

export interface UnshiftArgs {
  tuple: readonly unknown[];
  element: unknown;
}

export type UnshiftResult<T extends UnshiftArgs> = readonly [T['element'], ...T['tuple']];

/**
 * Unshift HKTF - prepends an element to the beginning of a tuple
 */
export interface Unshift extends HKTF.Base {
  [HKTF.ArgsSymbol]: UnshiftArgs;
  [HKTF.ResultSymbol]: UnshiftResult<HKTF.Args<this>>;
}

export function unshift<const A extends readonly unknown[], const E>(tuple: A, element: E): HKTF.Apply<Unshift, {tuple: A, element: E}>;
export function unshift<const T extends UnshiftArgs>(args: T): HKTF.Apply<Unshift, T>;
export function unshift<const T extends UnshiftArgs>(...args: [T] | [T["tuple"], T["element"]]): HKTF.Apply<Unshift, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    return [args[0].element, ...args[0].tuple] as unknown as HKTF.Apply<Unshift, T>;
  }
  return [args[1] as T["element"], ...(args[0] as T["tuple"])] as unknown as HKTF.Apply<Unshift, T>;
}
