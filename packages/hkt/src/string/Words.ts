import type * as HKTF from '../hktf';

export interface WordsArgs {
  str: string;
}

// Type-level words is complex, simplified
export type WordsResult<_T extends WordsArgs> = readonly string[];

/**
 * Words HKTF - splits string into words by whitespace
 */
export interface Words extends HKTF.Base {
  [HKTF.ArgsSymbol]: WordsArgs;
  [HKTF.ResultSymbol]: WordsResult<HKTF.Args<this>>;
}

export function words<const S extends string>(str: S): HKTF.Apply<Words, {str: S}>;
export function words<const T extends WordsArgs>(args: T): HKTF.Apply<Words, T>;
export function words<const T extends WordsArgs>(...args: [T] | [T["str"]]): HKTF.Apply<Words, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return args[0].str.trim().split(/\s+/).filter(w => w.length > 0) as unknown as HKTF.Apply<Words, T>;
  }
  return (args[0] as string).trim().split(/\s+/).filter(w => w.length > 0) as unknown as HKTF.Apply<Words, T>;
}
