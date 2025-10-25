import type { HKTF } from '@servicejs/hkt-core';

export interface OmitByTypeArgs {
  obj: Record<string, unknown>;
  type: unknown;
}

export type OmitByTypeResult<T extends OmitByTypeArgs> = globalThis.Omit<
  T['obj'],
  {
    [K in keyof T['obj']]: T['obj'][K] extends T['type'] ? K : never;
  }[keyof T['obj']]
>;

/**
 * OmitByType HKTF - omits properties where value matches a specific type
 */
export interface OmitByType extends HKTF.Base {
  [HKTF.ArgsSymbol]: OmitByTypeArgs;
  [HKTF.ResultSymbol]: OmitByTypeResult<HKTF.Args<this>>;
}

export function omitByType<const O extends Record<string, unknown>, const Type>(obj: O, type: Type): any;
export function omitByType<const T extends OmitByTypeArgs>(args: T): HKTF.Apply<OmitByType, T>;
export function omitByType<const T extends OmitByTypeArgs>(...args: [T] | [T["obj"], T["type"]]): HKTF.Apply<OmitByType, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    const obj = args[0].obj as Record<string, unknown>;
    const typeExample = args[0].type;
    const targetType = typeof typeExample;
    const result: Record<string, unknown> = {};
    for (const key in obj) {
      if (typeof obj[key] !== targetType) {
        result[key] = obj[key];
      }
    }
    return result as unknown as HKTF.Apply<OmitByType, T>;
  }
  const obj = args[0] as Record<string, unknown>;
  const typeExample = args[1];
  const targetType = typeof typeExample;
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    if (typeof obj[key] !== targetType) {
      result[key] = obj[key];
    }
  }
  return result as unknown as HKTF.Apply<OmitByType, T>;
}
