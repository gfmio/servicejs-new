import type { HKTF } from '@servicejs/hkt-core';

export interface LengthArgs {
  tuple: readonly unknown[];
}

export type LengthResult<T extends LengthArgs> = T['tuple']["length"];

/**
 * Length HKTF - gets the length of a tuple
 */
export interface Length extends HKTF.Base {
  [HKTF.ArgsSymbol]: LengthArgs;
  [HKTF.ResultSymbol]: LengthResult<HKTF.Args<this>>;
}

export function length<const A extends readonly unknown[]>(tuple: A): HKTF.Apply<Length, {tuple: A}>;
export function length<const T extends LengthArgs>(args: T): HKTF.Apply<Length, T>;
export function length<const T extends LengthArgs>(...args: [T] | [T["tuple"]]): HKTF.Apply<Length, T> {
  const arr = Array.isArray(args[0]) ? (args[0] as T["tuple"]) : (args[0] as T)["tuple"];
  return arr.length as HKTF.Apply<Length, T>;
}
