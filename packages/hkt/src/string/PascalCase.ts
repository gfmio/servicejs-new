import type * as HKTF from '../hktf';

export interface PascalCaseArgs {
  str: string;
}

// Type-level case conversion is complex, simplified
export type PascalCaseResult<_T extends PascalCaseArgs> = string;

/**
 * PascalCase HKTF - converts string to PascalCase
 */
export interface PascalCase extends HKTF.Base {
  [HKTF.ArgsSymbol]: PascalCaseArgs;
  [HKTF.ResultSymbol]: PascalCaseResult<HKTF.Args<this>>;
}

export function pascalCase<const S extends string>(str: S): HKTF.Apply<PascalCase, {str: S}>;
export function pascalCase<const T extends PascalCaseArgs>(args: T): HKTF.Apply<PascalCase, T>;
export function pascalCase<const T extends PascalCaseArgs>(...args: [T] | [T["str"]]): HKTF.Apply<PascalCase, T> {
  const convert = (s: string) =>
    s
      .toLowerCase()
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^(.)/, (c) => c.toUpperCase());

  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return convert(args[0].str) as unknown as HKTF.Apply<PascalCase, T>;
  }
  return convert(args[0] as string) as unknown as HKTF.Apply<PascalCase, T>;
}
