import type { HKTF } from '@servicejs/hkt-core';

export interface UnflattenArgs {
  obj: Record<string, unknown>;
  separator?: string;
}

// Type-level unflatten is complex, we'll use a simplified version
export type UnflattenResult<_T extends UnflattenArgs> = Record<string, unknown>;

/**
 * Unflatten HKTF - converts flat object with dot notation to nested object
 * e.g., {"a.b": 1} becomes {a: {b: 1}}
 */
export interface Unflatten extends HKTF.Base {
  [HKTF.ArgsSymbol]: UnflattenArgs;
  [HKTF.ResultSymbol]: UnflattenResult<HKTF.Args<this>>;
}

function unflattenImpl(obj: Record<string, unknown>, separator: string): Record<string, unknown> {
  const result: Record<string, any> = {};

  for (const key in obj) {
    const keys = key.split(separator);
    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i]!;
      if (!(k in current)) {
        current[k] = {};
      }
      current = current[k];
    }

    const lastKey = keys[keys.length - 1]!;
    current[lastKey] = obj[key];
  }

  return result;
}

export function unflatten<const O extends Record<string, unknown>, const S extends string = '.'>(obj: O, separator?: S): HKTF.Apply<Unflatten, {obj: O, separator: S}>;
export function unflatten<const T extends UnflattenArgs>(args: T): HKTF.Apply<Unflatten, T>;
export function unflatten<const T extends UnflattenArgs>(...args: [T] | [T["obj"], T["separator"]?]): HKTF.Apply<Unflatten, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    const separator = (args[0].separator as string) || '.';
    return unflattenImpl(args[0].obj as Record<string, unknown>, separator) as unknown as HKTF.Apply<Unflatten, T>;
  }
  const separator = (args[1] as string) || '.';
  return unflattenImpl(args[0] as Record<string, unknown>, separator) as unknown as HKTF.Apply<Unflatten, T>;
}
