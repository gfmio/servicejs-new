import type { HKTF } from '@servicejs/hkt-core';

export interface RemoveSuffixArgs {
  str: string;
  suffix: string;
}

export type RemoveSuffixResult<T extends RemoveSuffixArgs> = T['str'] extends `${infer Rest}${T['suffix']}`
  ? Rest
  : T['str'];

/**
 * RemoveSuffix HKTF - removes suffix if present
 */
export interface RemoveSuffix extends HKTF.Base {
  [HKTF.ArgsSymbol]: RemoveSuffixArgs;
  [HKTF.ResultSymbol]: RemoveSuffixResult<HKTF.Args<this>>;
}

export function removeSuffix<const S extends string, const Suf extends string>(str: S, suffix: Suf): HKTF.Apply<RemoveSuffix, {str: S, suffix: Suf}>;
export function removeSuffix<const T extends RemoveSuffixArgs>(args: T): HKTF.Apply<RemoveSuffix, T>;
export function removeSuffix<const T extends RemoveSuffixArgs>(...args: [T] | [T["str"], T["suffix"]]): HKTF.Apply<RemoveSuffix, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    if (args[0].str.endsWith(args[0].suffix)) {
      return args[0].str.slice(0, -args[0].suffix.length) as unknown as HKTF.Apply<RemoveSuffix, T>;
    }
    return args[0].str as unknown as HKTF.Apply<RemoveSuffix, T>;
  }
  const str = args[0] as string;
  const suffix = args[1] as string;
  if (str.endsWith(suffix)) {
    return str.slice(0, -suffix.length) as unknown as HKTF.Apply<RemoveSuffix, T>;
  }
  return str as unknown as HKTF.Apply<RemoveSuffix, T>;
}
