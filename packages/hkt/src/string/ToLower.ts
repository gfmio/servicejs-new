import type * as HKTF from '../hktf';

export interface ToLowerArgs {
  str: string;
}

export type ToLowerResult<T extends ToLowerArgs> = Lowercase<T['str']>;

/**
 * ToLower HKTF - converts string to lowercase
 */
export interface ToLower extends HKTF.Base {
  [HKTF.ArgsSymbol]: ToLowerArgs;
  [HKTF.ResultSymbol]: ToLowerResult<HKTF.Args<this>>;
}

export function toLower<const S extends string>(str: S): HKTF.Apply<ToLower, {str: S}>;
export function toLower<const T extends ToLowerArgs>(args: T): HKTF.Apply<ToLower, T>;
export function toLower<const T extends ToLowerArgs>(...args: [T] | [T["str"]]): HKTF.Apply<ToLower, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return args[0].str.toLowerCase() as unknown as HKTF.Apply<ToLower, T>;
  }
  return (args[0] as string).toLowerCase() as unknown as HKTF.Apply<ToLower, T>;
}
