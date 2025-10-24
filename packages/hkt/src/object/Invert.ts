import type * as HKTF from '../hktf';

export interface InvertArgs {
  obj: Record<PropertyKey, PropertyKey>;
}

export type InvertResult<T extends InvertArgs> = {
  [K in keyof T['obj'] as T['obj'][K] extends PropertyKey ? T['obj'][K] : never]:
    K extends PropertyKey ? K : never;
};

/**
 * Invert HKTF - swaps keys and values (values must be PropertyKeys)
 */
export interface Invert extends HKTF.Base {
  [HKTF.ArgsSymbol]: InvertArgs;
  [HKTF.ResultSymbol]: InvertResult<HKTF.Args<this>>;
}

export function invert<const O extends Record<PropertyKey, PropertyKey>>(obj: O): HKTF.Apply<Invert, {obj: O}>;
export function invert<const T extends InvertArgs>(args: T): HKTF.Apply<Invert, T>;
export function invert<const T extends InvertArgs>(...args: [T] | [T["obj"]]): HKTF.Apply<Invert, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    const obj = args[0].obj as Record<PropertyKey, PropertyKey>;
    const result: Record<PropertyKey, PropertyKey> = {};
    for (const key in obj) {
      const value = obj[key];
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'symbol') {
        result[value] = key;
      }
    }
    return result as unknown as HKTF.Apply<Invert, T>;
  }
  const obj = args[0] as Record<PropertyKey, PropertyKey>;
  const result: Record<PropertyKey, PropertyKey> = {};
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'symbol') {
      result[value] = key;
    }
  }
  return result as unknown as HKTF.Apply<Invert, T>;
}
