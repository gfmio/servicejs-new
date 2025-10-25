import type { HKTF } from '@servicejs/hkt-core';

export interface TruncateArgs {
  str: string;
  length: number;
  ellipsis?: string;
}

// Type-level truncate is complex, simplified
export type TruncateResult<_T extends TruncateArgs> = string;

/**
 * Truncate HKTF - limits string length and adds ellipsis
 */
export interface Truncate extends HKTF.Base {
  [HKTF.ArgsSymbol]: TruncateArgs;
  [HKTF.ResultSymbol]: TruncateResult<HKTF.Args<this>>;
}

export function truncate<const S extends string, const L extends number, const E extends string = '...'>(str: S, length: L, ellipsis?: E): any;
export function truncate<const T extends TruncateArgs>(args: T): HKTF.Apply<Truncate, T>;
export function truncate<const T extends TruncateArgs>(...args: [T] | [T["str"], T["length"], T["ellipsis"]?]): HKTF.Apply<Truncate, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    const ellipsis = args[0].ellipsis ?? '...';
    if (args[0].str.length <= args[0].length) {
      return args[0].str as unknown as HKTF.Apply<Truncate, T>;
    }
    return (args[0].str.slice(0, args[0].length - ellipsis.length) + ellipsis) as unknown as HKTF.Apply<Truncate, T>;
  }
  const ellipsis = (args[2] as string | undefined) ?? '...';
  const str = args[0] as string;
  const length = args[1] as number;
  if (str.length <= length) {
    return str as unknown as HKTF.Apply<Truncate, T>;
  }
  return (str.slice(0, length - ellipsis.length) + ellipsis) as unknown as HKTF.Apply<Truncate, T>;
}
