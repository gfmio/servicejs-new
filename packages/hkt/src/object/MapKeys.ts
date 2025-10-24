import type * as FunctionHKTF from '../function';
import type * as HKTF from '../hktf';

export interface MapKeysArgs {
  obj: Record<string, unknown>;
  fn: FunctionHKTF.Fn1<string, string>;
}

export type MapKeysResult<T extends MapKeysArgs> = {
  [K in keyof T['obj'] as T['fn'] extends FunctionHKTF.Fn1<K, infer R>
    ? R extends string
      ? R
      : never
    : never]: T['obj'][K];
};

/**
 * MapKeys HKTF - transforms object keys
 * Note: Function must map string to string
 */
export interface MapKeys extends HKTF.Base {
  [HKTF.ArgsSymbol]: MapKeysArgs;
  [HKTF.ResultSymbol]: MapKeysResult<HKTF.Args<this>>;
}

export function mapKeys<const O extends Record<string, unknown>, const F extends FunctionHKTF.Fn1<string, string>>(obj: O, fn: F): HKTF.Apply<MapKeys, {obj: O, fn: F}>;
export function mapKeys<const T extends MapKeysArgs>(args: T): HKTF.Apply<MapKeys, T>;
export function mapKeys<const T extends MapKeysArgs>(...args: [T] | [T["obj"], T["fn"]]): HKTF.Apply<MapKeys, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    const result: Record<string, unknown> = {};
    const obj = args[0].obj as Record<string, unknown>;
    for (const key in obj) {
      const newKey = (args[0].fn as any)(key);
      result[newKey] = obj[key];
    }
    return result as unknown as HKTF.Apply<MapKeys, T>;
  }
  const result: Record<string, unknown> = {};
  const obj = args[0] as Record<string, unknown>;
  for (const key in obj) {
    const newKey = (args[1] as any)(key);
    result[newKey] = obj[key];
  }
  return result as unknown as HKTF.Apply<MapKeys, T>;
}
