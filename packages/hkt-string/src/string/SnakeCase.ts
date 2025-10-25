import type { HKTF } from '@servicejs/hkt-core';

export interface SnakeCaseArgs {
  str: string;
}

// Type-level case conversion is complex, simplified
export type SnakeCaseResult<_T extends SnakeCaseArgs> = string;

/**
 * SnakeCase HKTF - converts string to snake_case
 */
export interface SnakeCase extends HKTF.Base {
  [HKTF.ArgsSymbol]: SnakeCaseArgs;
  [HKTF.ResultSymbol]: SnakeCaseResult<HKTF.Args<this>>;
}

export function snakeCase<const S extends string>(str: S): HKTF.Apply<SnakeCase, {str: S}>;
export function snakeCase<const T extends SnakeCaseArgs>(args: T): HKTF.Apply<SnakeCase, T>;
export function snakeCase<const T extends SnakeCaseArgs>(...args: [T] | [T["str"]]): HKTF.Apply<SnakeCase, T> {
  const convert = (s: string) =>
    s
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s-]+/g, '_')
      .toLowerCase();

  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return convert(args[0].str) as unknown as HKTF.Apply<SnakeCase, T>;
  }
  return convert(args[0] as string) as unknown as HKTF.Apply<SnakeCase, T>;
}
