import type * as HKTF from '../hktf';

export interface KebabCaseArgs {
  str: string;
}

// Type-level case conversion is complex, simplified
export type KebabCaseResult<_T extends KebabCaseArgs> = string;

/**
 * KebabCase HKTF - converts string to kebab-case
 */
export interface KebabCase extends HKTF.Base {
  [HKTF.ArgsSymbol]: KebabCaseArgs;
  [HKTF.ResultSymbol]: KebabCaseResult<HKTF.Args<this>>;
}

export function kebabCase<const S extends string>(str: S): HKTF.Apply<KebabCase, {str: S}>;
export function kebabCase<const T extends KebabCaseArgs>(args: T): HKTF.Apply<KebabCase, T>;
export function kebabCase<const T extends KebabCaseArgs>(...args: [T] | [T["str"]]): HKTF.Apply<KebabCase, T> {
  const convert = (s: string) =>
    s
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();

  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return convert(args[0].str) as unknown as HKTF.Apply<KebabCase, T>;
  }
  return convert(args[0] as string) as unknown as HKTF.Apply<KebabCase, T>;
}
