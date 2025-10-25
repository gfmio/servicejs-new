import type { HKTF } from '@servicejs/hkt-core';

export interface TrimStartArgs {
  str: string;
}

export type TrimStartResult<T extends TrimStartArgs> = T['str'] extends ` ${infer Rest}` | `\t${infer Rest}` | `\n${infer Rest}`
  ? TrimStartResult<{ str: Rest }>
  : T['str'];

/**
 * TrimStart HKTF - trims whitespace from start
 */
export interface TrimStart extends HKTF.Base {
  [HKTF.ArgsSymbol]: TrimStartArgs;
  [HKTF.ResultSymbol]: TrimStartResult<HKTF.Args<this>>;
}

export function trimStart<const S extends string>(str: S): HKTF.Apply<TrimStart, {str: S}>;
export function trimStart<const T extends TrimStartArgs>(args: T): HKTF.Apply<TrimStart, T>;
export function trimStart<const T extends TrimStartArgs>(...args: [T] | [T["str"]]): HKTF.Apply<TrimStart, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return args[0].str.trimStart() as unknown as HKTF.Apply<TrimStart, T>;
  }
  return (args[0] as string).trimStart() as unknown as HKTF.Apply<TrimStart, T>;
}
