import type * as HKTF from '../hktf';

export interface DeepReadonlyArgs {
  obj: Record<string, unknown>;
}

export type DeepReadonlyResult<T extends DeepReadonlyArgs> = T['obj'] extends Record<string, unknown>
  ? {
      readonly [K in keyof T['obj']]: T['obj'][K] extends Record<string, unknown>
        ? DeepReadonlyResult<{ obj: T['obj'][K] }>
        : T['obj'][K];
    }
  : T['obj'];

/**
 * DeepReadonly HKTF - recursively makes all properties readonly
 */
export interface DeepReadonly extends HKTF.Base {
  [HKTF.ArgsSymbol]: DeepReadonlyArgs;
  [HKTF.ResultSymbol]: DeepReadonlyResult<HKTF.Args<this>>;
}

function deepReadonlyImpl(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return Object.freeze(obj.map(deepReadonlyImpl));
  }
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    result[key] = deepReadonlyImpl(obj[key]);
  }
  return Object.freeze(result);
}

export function deepReadonly<const O extends Record<string, unknown>>(obj: O): HKTF.Apply<DeepReadonly, {obj: O}>;
export function deepReadonly<const T extends DeepReadonlyArgs>(args: T): HKTF.Apply<DeepReadonly, T>;
export function deepReadonly<const T extends DeepReadonlyArgs>(...args: [T] | [T["obj"]]): HKTF.Apply<DeepReadonly, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    return deepReadonlyImpl(args[0].obj) as unknown as HKTF.Apply<DeepReadonly, T>;
  }
  return deepReadonlyImpl(args[0]) as unknown as HKTF.Apply<DeepReadonly, T>;
}
