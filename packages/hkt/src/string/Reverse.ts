import type * as HKTF from '../hktf';

export interface ReverseArgs {
  str: string;
}

// Type-level reverse is complex, simplified
export type ReverseResult<_T extends ReverseArgs> = string;

/**
 * Reverse HKTF - reverses character order
 */
export interface Reverse extends HKTF.Base {
  [HKTF.ArgsSymbol]: ReverseArgs;
  [HKTF.ResultSymbol]: ReverseResult<HKTF.Args<this>>;
}

export function reverse<const S extends string>(str: S): HKTF.Apply<Reverse, {str: S}>;
export function reverse<const T extends ReverseArgs>(args: T): HKTF.Apply<Reverse, T>;
export function reverse<const T extends ReverseArgs>(...args: [T] | [T["str"]]): HKTF.Apply<Reverse, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return args[0].str.split('').reverse().join('') as unknown as HKTF.Apply<Reverse, T>;
  }
  return (args[0] as string).split('').reverse().join('') as unknown as HKTF.Apply<Reverse, T>;
}
