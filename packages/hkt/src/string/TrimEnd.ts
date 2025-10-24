import type * as HKTF from '../hktf';

export interface TrimEndArgs {
  str: string;
}

export type TrimEndResult<T extends TrimEndArgs> = T['str'] extends `${infer Rest} ` | `${infer Rest}\t` | `${infer Rest}\n`
  ? TrimEndResult<{ str: Rest }>
  : T['str'];

/**
 * TrimEnd HKTF - trims whitespace from end
 */
export interface TrimEnd extends HKTF.Base {
  [HKTF.ArgsSymbol]: TrimEndArgs;
  [HKTF.ResultSymbol]: TrimEndResult<HKTF.Args<this>>;
}

export function trimEnd<const S extends string>(str: S): HKTF.Apply<TrimEnd, {str: S}>;
export function trimEnd<const T extends TrimEndArgs>(args: T): HKTF.Apply<TrimEnd, T>;
export function trimEnd<const T extends TrimEndArgs>(...args: [T] | [T["str"]]): HKTF.Apply<TrimEnd, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return args[0].str.trimEnd() as unknown as HKTF.Apply<TrimEnd, T>;
  }
  return (args[0] as string).trimEnd() as unknown as HKTF.Apply<TrimEnd, T>;
}
