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
  const convert = (s: string) => {
    // Handle camelCase, PascalCase, kebab-case, snake_case, spaces
    const result = s
      // Insert space before uppercase letters
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // Replace non-alphanumeric with spaces
      .replace(/[-_\s]+/g, ' ')
      .trim()
      .toLowerCase()
      // Capitalize first letter of each word
      .replace(/(?:^|\s+)(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
    return result;
  };

  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return convert(args[0].str) as unknown as HKTF.Apply<PascalCase, T>;
  }
  return convert(args[0] as string) as unknown as HKTF.Apply<PascalCase, T>;
}
