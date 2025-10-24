import type * as HKTF from '../hktf';

export interface PickByTypeArgs {
  obj: Record<string, unknown>;
  type: unknown;
}

export type PickByTypeResult<T extends PickByTypeArgs> = globalThis.Pick<
  T['obj'],
  {
    [K in keyof T['obj']]: T['obj'][K] extends T['type'] ? K : never;
  }[keyof T['obj']]
>;

/**
 * PickByType HKTF - picks properties where value matches a specific type
 */
export interface PickByType extends HKTF.Base {
  [HKTF.ArgsSymbol]: PickByTypeArgs;
  [HKTF.ResultSymbol]: PickByTypeResult<HKTF.Args<this>>;
}

export function pickByType<const O extends Record<string, unknown>, const Type>(obj: O, type: Type): any;
export function pickByType<const T extends PickByTypeArgs>(args: T): HKTF.Apply<PickByType, T>;
export function pickByType<const T extends PickByTypeArgs>(...args: [T] | [T["obj"], T["type"]]): HKTF.Apply<PickByType, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    const obj = args[0].obj as Record<string, unknown>;
    const typeExample = args[0].type;
    const targetType = typeof typeExample;
    const result: Record<string, unknown> = {};
    for (const key in obj) {
      if (typeof obj[key] === targetType) {
        result[key] = obj[key];
      }
    }
    return result as unknown as HKTF.Apply<PickByType, T>;
  }
  const obj = args[0] as Record<string, unknown>;
  const typeExample = args[1];
  const targetType = typeof typeExample;
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    if (typeof obj[key] === targetType) {
      result[key] = obj[key];
    }
  }
  return result as unknown as HKTF.Apply<PickByType, T>;
}
