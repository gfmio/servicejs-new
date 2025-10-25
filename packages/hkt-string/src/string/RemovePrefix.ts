import type { HKTF } from '@servicejs/hkt-core';

export interface RemovePrefixArgs {
  str: string;
  prefix: string;
}

export type RemovePrefixResult<T extends RemovePrefixArgs> = T['str'] extends `${T['prefix']}${infer Rest}`
  ? Rest
  : T['str'];

/**
 * RemovePrefix HKTF - removes prefix if present
 */
export interface RemovePrefix extends HKTF.Base {
  [HKTF.ArgsSymbol]: RemovePrefixArgs;
  [HKTF.ResultSymbol]: RemovePrefixResult<HKTF.Args<this>>;
}

export function removePrefix<const S extends string, const P extends string>(str: S, prefix: P): HKTF.Apply<RemovePrefix, {str: S, prefix: P}>;
export function removePrefix<const T extends RemovePrefixArgs>(args: T): HKTF.Apply<RemovePrefix, T>;
export function removePrefix<const T extends RemovePrefixArgs>(...args: [T] | [T["str"], T["prefix"]]): HKTF.Apply<RemovePrefix, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    if (args[0].str.startsWith(args[0].prefix)) {
      return args[0].str.slice(args[0].prefix.length) as unknown as HKTF.Apply<RemovePrefix, T>;
    }
    return args[0].str as unknown as HKTF.Apply<RemovePrefix, T>;
  }
  const str = args[0] as string;
  const prefix = args[1] as string;
  if (str.startsWith(prefix)) {
    return str.slice(prefix.length) as unknown as HKTF.Apply<RemovePrefix, T>;
  }
  return str as unknown as HKTF.Apply<RemovePrefix, T>;
}
