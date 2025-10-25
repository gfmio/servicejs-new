import type { HKTF } from '@servicejs/hkt-core';

export interface FlattenArgs {
  obj: Record<string, unknown>;
  separator?: string;
}

// Type-level flatten is complex, we'll use a simplified version
export type FlattenResult<_T extends FlattenArgs> = Record<string, unknown>;

/**
 * Flatten HKTF - converts nested object to flat object with dot notation
 * e.g., {a: {b: 1}} becomes {"a.b": 1}
 */
export interface Flatten extends HKTF.Base {
  [HKTF.ArgsSymbol]: FlattenArgs;
  [HKTF.ResultSymbol]: FlattenResult<HKTF.Args<this>>;
}

function flattenImpl(obj: any, separator: string, prefix: string = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}${separator}${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenImpl(value, separator, newKey));
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

export function flatten<const O extends Record<string, unknown>, const S extends string = '.'>(obj: O, separator?: S): HKTF.Apply<Flatten, {obj: O, separator: S}>;
export function flatten<const T extends FlattenArgs>(args: T): HKTF.Apply<Flatten, T>;
export function flatten<const T extends FlattenArgs>(...args: [T] | [T["obj"], T["separator"]?]): HKTF.Apply<Flatten, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    const separator = (args[0].separator as string) || '.';
    return flattenImpl(args[0].obj, separator) as unknown as HKTF.Apply<Flatten, T>;
  }
  const separator = (args[1] as string) || '.';
  return flattenImpl(args[0], separator) as unknown as HKTF.Apply<Flatten, T>;
}
