import type * as FunctionHKTF from '../function';
import type * as HKTF from '../hktf';

export interface ObjectMapArgs {
  obj: Record<string, unknown>;
  mapper: FunctionHKTF.Fn1<readonly [string, unknown], readonly [string, unknown]>;
}

// Type-level ObjectMap is complex, simplified version
export type ObjectMapResult<_T extends ObjectMapArgs> = Record<string, unknown>;

/**
 * ObjectMap HKTF - maps over entries, transforming both keys and values
 */
export interface ObjectMap extends HKTF.Base {
  [HKTF.ArgsSymbol]: ObjectMapArgs;
  [HKTF.ResultSymbol]: ObjectMapResult<HKTF.Args<this>>;
}

export function objectMap<const O extends Record<string, unknown>, const M extends FunctionHKTF.Fn1<readonly [string, unknown], readonly [string, unknown]>>(obj: O, mapper: M): HKTF.Apply<ObjectMap, {obj: O, mapper: M}>;
export function objectMap<const T extends ObjectMapArgs>(args: T): HKTF.Apply<ObjectMap, T>;
export function objectMap<const T extends ObjectMapArgs>(...args: [T] | [T["obj"], T["mapper"]]): HKTF.Apply<ObjectMap, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    const obj = args[0].obj as Record<string, unknown>;
    const mapper = args[0].mapper as any;
    const result: Record<string, unknown> = {};

    for (const key in obj) {
      const [newKey, newValue] = mapper([key, obj[key]]);
      result[newKey as string] = newValue;
    }

    return result as unknown as HKTF.Apply<ObjectMap, T>;
  }
  const obj = args[0] as Record<string, unknown>;
  const mapper = args[1] as any;
  const result: Record<string, unknown> = {};

  for (const key in obj) {
    const [newKey, newValue] = mapper([key, obj[key]]);
    result[newKey as string] = newValue;
  }

  return result as unknown as HKTF.Apply<ObjectMap, T>;
}
