import type { HKTF } from '@servicejs/hkt-core';

export interface LengthArgs {
  str: string;
}

// Helper: Convert string to character tuple
type StringToTuple<S extends string, Acc extends string[] = []> =
  S extends `${infer Char}${infer Rest}`
    ? StringToTuple<Rest, [...Acc, Char]>
    : Acc;

export type LengthResult<T extends LengthArgs> = StringToTuple<T['str']>['length'];

/**
 * Length HKTF - gets the length of a string
 */
export interface Length extends HKTF.Base {
  [HKTF.ArgsSymbol]: LengthArgs;
  [HKTF.ResultSymbol]: LengthResult<HKTF.Args<this>>;
}

export function length<const S extends string>(str: S): HKTF.Apply<Length, {str: S}>;
export function length<const T extends LengthArgs>(args: T): HKTF.Apply<Length, T>;
export function length<const T extends LengthArgs>(...args: [T] | [T["str"]]): HKTF.Apply<Length, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return args[0].str.length as unknown as HKTF.Apply<Length, T>;
  }
  return (args[0] as string).length as unknown as HKTF.Apply<Length, T>;
}
