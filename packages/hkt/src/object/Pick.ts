import type * as HKTF from '../hktf';

export interface PickArgs {
  obj: Record<string, unknown>;
  keys: readonly string[];
}

export type PickResult<T extends PickArgs> = globalThis.Pick<T['obj'], Extract<keyof T['obj'], T['keys'][number]>>;

/**
 * Pick HKTF - picks subset of keys from object
 */
export interface Pick extends HKTF.Base {
  [HKTF.ArgsSymbol]: PickArgs;
  [HKTF.ResultSymbol]: PickResult<HKTF.Args<this>>;
}

export function pick<const O extends Record<string, unknown>, const K extends readonly (keyof O)[]>(obj: O, keys: K): any;
export function pick<const T extends PickArgs>(args: T): HKTF.Apply<Pick, T>;
export function pick<const T extends PickArgs>(...args: [T] | [T["obj"], T["keys"]]): HKTF.Apply<Pick, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    const result: Record<string, unknown> = {};
    const obj = args[0].obj as Record<string, unknown>;
    const keys = args[0].keys as readonly string[];
    for (const key of keys) {
      if (key in obj) {
        result[key] = obj[key];
      }
    }
    return result as unknown as HKTF.Apply<Pick, T>;
  }
  const result: Record<string, unknown> = {};
  const obj = args[0] as Record<string, unknown>;
  const keys = args[1] as readonly string[];
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result as unknown as HKTF.Apply<Pick, T>;
}
