import type * as HKTF from '../hktf';

export interface JoinArgs {
  strings: readonly string[];
  delimiter: string;
}

export type JoinResult<T extends JoinArgs> = T['strings'] extends readonly []
  ? ''
  : T['strings'] extends readonly [infer Head extends string]
  ? Head
  : T['strings'] extends readonly [
      infer Head extends string,
      ...infer Tail extends readonly string[]
    ]
  ? `${Head}${T['delimiter']}${JoinResult<{ strings: Tail; delimiter: T['delimiter'] }>}`
  : '';

/**
 * Join HKTF - joins tuple of strings with delimiter
 */
export interface Join extends HKTF.Base {
  [HKTF.ArgsSymbol]: JoinArgs;
  [HKTF.ResultSymbol]: JoinResult<HKTF.Args<this>>;
}

export function join<const S extends readonly string[], const D extends string>(strings: S, delimiter: D): HKTF.Apply<Join, {strings: S, delimiter: D}>;
export function join<const T extends JoinArgs>(args: T): HKTF.Apply<Join, T>;
export function join<const T extends JoinArgs>(...args: [T] | [T["strings"], T["delimiter"]]): HKTF.Apply<Join, T> {
  if (typeof args[0] === 'object' && 'strings' in args[0]) {
    return (args[0].strings as readonly string[]).join(args[0].delimiter) as unknown as HKTF.Apply<Join, T>;
  }
  return (args[0] as readonly string[]).join(args[1] as string) as unknown as HKTF.Apply<Join, T>;
}
