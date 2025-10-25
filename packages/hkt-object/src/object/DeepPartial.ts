import type { HKTF } from '@servicejs/hkt-core';

export interface DeepPartialArgs {
  obj: Record<string, unknown>;
}

export type DeepPartialResult<T extends DeepPartialArgs> = T['obj'] extends Record<string, unknown>
  ? {
      [K in keyof T['obj']]?: T['obj'][K] extends Record<string, unknown>
        ? DeepPartialResult<{ obj: T['obj'][K] }>
        : T['obj'][K];
    }
  : T['obj'];

/**
 * DeepPartial HKTF - recursively makes all properties optional
 */
export interface DeepPartial extends HKTF.Base {
  [HKTF.ArgsSymbol]: DeepPartialArgs;
  [HKTF.ResultSymbol]: DeepPartialResult<HKTF.Args<this>>;
}

function deepPartialImpl(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(deepPartialImpl);
  }
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    result[key] = deepPartialImpl(obj[key]);
  }
  return result;
}

export function deepPartial<const O extends Record<string, unknown>>(obj: O): HKTF.Apply<DeepPartial, {obj: O}>;
export function deepPartial<const T extends DeepPartialArgs>(args: T): HKTF.Apply<DeepPartial, T>;
export function deepPartial<const T extends DeepPartialArgs>(...args: [T] | [T["obj"]]): HKTF.Apply<DeepPartial, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    return deepPartialImpl(args[0].obj) as unknown as HKTF.Apply<DeepPartial, T>;
  }
  return deepPartialImpl(args[0]) as unknown as HKTF.Apply<DeepPartial, T>;
}
