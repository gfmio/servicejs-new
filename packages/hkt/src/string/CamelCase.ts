import type * as HKTF from '../hktf';

export interface CamelCaseArgs {
  str: string;
}

// Type-level case conversion is complex, simplified
export type CamelCaseResult<_T extends CamelCaseArgs> = string;

/**
 * CamelCase HKTF - converts string to camelCase
 */
export interface CamelCase extends HKTF.Base {
  [HKTF.ArgsSymbol]: CamelCaseArgs;
  [HKTF.ResultSymbol]: CamelCaseResult<HKTF.Args<this>>;
}

export function camelCase<const S extends string>(str: S): HKTF.Apply<CamelCase, {str: S}>;
export function camelCase<const T extends CamelCaseArgs>(args: T): HKTF.Apply<CamelCase, T>;
export function camelCase<const T extends CamelCaseArgs>(...args: [T] | [T["str"]]): HKTF.Apply<CamelCase, T> {
  const convert = (s: string) =>
    s
      .toLowerCase()
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));

  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return convert(args[0].str) as unknown as HKTF.Apply<CamelCase, T>;
  }
  return convert(args[0] as string) as unknown as HKTF.Apply<CamelCase, T>;
}
