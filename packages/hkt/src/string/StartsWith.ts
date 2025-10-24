import type * as HKTF from '../hktf';

export interface StartsWithArgs {
  str: string;
  prefix: string;
}

export type StartsWithResult<T extends StartsWithArgs> = T['str'] extends `${T['prefix']}${string}` ? true : false;

/**
 * StartsWith HKTF - checks if string starts with prefix
 */
export interface StartsWith extends HKTF.Base {
  [HKTF.ArgsSymbol]: StartsWithArgs;
  [HKTF.ResultSymbol]: StartsWithResult<HKTF.Args<this>>;
}

export function startsWith<const S extends string, const P extends string>(str: S, prefix: P): HKTF.Apply<StartsWith, {str: S, prefix: P}>;
export function startsWith<const T extends StartsWithArgs>(args: T): HKTF.Apply<StartsWith, T>;
export function startsWith<const T extends StartsWithArgs>(...args: [T] | [T["str"], T["prefix"]]): HKTF.Apply<StartsWith, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return args[0].str.startsWith(args[0].prefix) as unknown as HKTF.Apply<StartsWith, T>;
  }
  return (args[0] as string).startsWith(args[1] as string) as unknown as HKTF.Apply<StartsWith, T>;
}
