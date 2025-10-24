import type * as HKTF from '../hktf';

export interface MatchArgs {
  str: string;
  pattern: string;
}

// Type-level match is complex, returns nullable string array
export type MatchResult<_T extends MatchArgs> = readonly string[] | null;

/**
 * Match HKTF - matches string against pattern
 */
export interface Match extends HKTF.Base {
  [HKTF.ArgsSymbol]: MatchArgs;
  [HKTF.ResultSymbol]: MatchResult<HKTF.Args<this>>;
}

export function match<const S extends string, const P extends string>(str: S, pattern: P): HKTF.Apply<Match, {str: S, pattern: P}>;
export function match<const T extends MatchArgs>(args: T): HKTF.Apply<Match, T>;
export function match<const T extends MatchArgs>(...args: [T] | [T["str"], T["pattern"]]): HKTF.Apply<Match, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    const result = args[0].str.match(args[0].pattern);
    return (result ? Array.from(result) : null) as unknown as HKTF.Apply<Match, T>;
  }
  const result = (args[0] as string).match(args[1] as string);
  return (result ? Array.from(result) : null) as unknown as HKTF.Apply<Match, T>;
}
