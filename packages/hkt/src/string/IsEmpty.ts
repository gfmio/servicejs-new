import type * as HKTF from '../hktf';

export interface IsEmptyArgs {
  str: string;
}

export type IsEmptyResult<T extends IsEmptyArgs> = T['str'] extends '' ? true : false;

/**
 * IsEmpty HKTF - checks if string is empty
 */
export interface IsEmpty extends HKTF.Base {
  [HKTF.ArgsSymbol]: IsEmptyArgs;
  [HKTF.ResultSymbol]: IsEmptyResult<HKTF.Args<this>>;
}

export function isEmpty<const S extends string>(str: S): HKTF.Apply<IsEmpty, {str: S}>;
export function isEmpty<const T extends IsEmptyArgs>(args: T): HKTF.Apply<IsEmpty, T>;
export function isEmpty<const T extends IsEmptyArgs>(...args: [T] | [T["str"]]): HKTF.Apply<IsEmpty, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return (args[0].str.length === 0) as unknown as HKTF.Apply<IsEmpty, T>;
  }
  return ((args[0] as string).length === 0) as unknown as HKTF.Apply<IsEmpty, T>;
}
