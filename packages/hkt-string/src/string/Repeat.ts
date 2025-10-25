import type { HKTF } from '@servicejs/hkt-core';

export interface RepeatArgs {
  str: string;
  count: number;
}

// Type-level repeat is complex, simplified
export type RepeatResult<_T extends RepeatArgs> = string;

/**
 * Repeat HKTF - repeats string n times
 */
export interface Repeat extends HKTF.Base {
  [HKTF.ArgsSymbol]: RepeatArgs;
  [HKTF.ResultSymbol]: RepeatResult<HKTF.Args<this>>;
}

export function repeat<const S extends string, const C extends number>(str: S, count: C): HKTF.Apply<Repeat, {str: S, count: C}>;
export function repeat<const T extends RepeatArgs>(args: T): HKTF.Apply<Repeat, T>;
export function repeat<const T extends RepeatArgs>(...args: [T] | [T["str"], T["count"]]): HKTF.Apply<Repeat, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return args[0].str.repeat(args[0].count) as unknown as HKTF.Apply<Repeat, T>;
  }
  return (args[0] as string).repeat(args[1] as number) as unknown as HKTF.Apply<Repeat, T>;
}
