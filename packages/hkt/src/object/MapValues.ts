import type * as FunctionHKTF from '../function';
import type * as HKTF from '../hktf';

export interface MapValuesArgs {
  obj: Record<string, unknown>;
  fn: FunctionHKTF.Fn1<unknown, unknown>;
}

export type MapValuesResult<T extends MapValuesArgs> = {
  [K in keyof T['obj']]: T['fn'] extends FunctionHKTF.Fn1<T['obj'][K], infer R>
    ? R
    : never;
};

/**
 * MapValues HKTF - maps a function over object values
 */
export interface MapValues extends HKTF.Base {
  [HKTF.ArgsSymbol]: MapValuesArgs;
  [HKTF.ResultSymbol]: MapValuesResult<HKTF.Args<this>>;
}

export function mapValues<const O extends Record<string, unknown>, const F extends FunctionHKTF.Fn1<unknown, unknown>>(obj: O, fn: F): HKTF.Apply<MapValues, {obj: O, fn: F}>;
export function mapValues<const T extends MapValuesArgs>(args: T): HKTF.Apply<MapValues, T>;
export function mapValues<const T extends MapValuesArgs>(...args: [T] | [T["obj"], T["fn"]]): HKTF.Apply<MapValues, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    const result: Record<string, unknown> = {};
    const obj = args[0].obj as Record<string, unknown>;
    for (const key in obj) {
      result[key] = (args[0].fn as any)(obj[key]);
    }
    return result as unknown as HKTF.Apply<MapValues, T>;
  }
  const result: Record<string, unknown> = {};
  const obj = args[0] as Record<string, unknown>;
  for (const key in obj) {
    result[key] = (args[1] as any)(obj[key]);
  }
  return result as unknown as HKTF.Apply<MapValues, T>;
}
