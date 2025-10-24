import type * as HKTF from '../hktf';

export interface CountArgs {
  str: string;
  substring: string;
}

// Type-level count is complex, simplified to return number
export type CountResult<_T extends CountArgs> = number;

/**
 * Count HKTF - counts occurrences of substring
 */
export interface Count extends HKTF.Base {
  [HKTF.ArgsSymbol]: CountArgs;
  [HKTF.ResultSymbol]: CountResult<HKTF.Args<this>>;
}

export function count<const S extends string, const Sub extends string>(str: S, substring: Sub): HKTF.Apply<Count, {str: S, substring: Sub}>;
export function count<const T extends CountArgs>(args: T): HKTF.Apply<Count, T>;
export function count<const T extends CountArgs>(...args: [T] | [T["str"], T["substring"]]): HKTF.Apply<Count, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    if (args[0].substring.length === 0) return 0 as unknown as HKTF.Apply<Count, T>;
    const matches = args[0].str.match(new RegExp(args[0].substring.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
    return (matches ? matches.length : 0) as unknown as HKTF.Apply<Count, T>;
  }
  const str = args[0] as string;
  const substring = args[1] as string;
  if (substring.length === 0) return 0 as unknown as HKTF.Apply<Count, T>;
  const matches = str.match(new RegExp(substring.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
  return (matches ? matches.length : 0) as unknown as HKTF.Apply<Count, T>;
}
