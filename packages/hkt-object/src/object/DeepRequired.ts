import type { HKTF } from '@servicejs/hkt-core';

export interface DeepRequiredArgs {
  obj: Record<string, unknown>;
}

export type DeepRequiredResult<T extends DeepRequiredArgs> = T['obj'] extends Record<string, unknown>
  ? {
      [K in keyof T['obj']]-?: T['obj'][K] extends Record<string, unknown>
        ? DeepRequiredResult<{ obj: T['obj'][K] }>
        : T['obj'][K];
    }
  : T['obj'];

/**
 * DeepRequired HKTF - recursively makes all properties required
 */
export interface DeepRequired extends HKTF.Base {
  [HKTF.ArgsSymbol]: DeepRequiredArgs;
  [HKTF.ResultSymbol]: DeepRequiredResult<HKTF.Args<this>>;
}

function deepRequiredImpl(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(deepRequiredImpl);
  }
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    result[key] = deepRequiredImpl(obj[key]);
  }
  return result;
}

export function deepRequired<const O extends Record<string, unknown>>(obj: O): HKTF.Apply<DeepRequired, {obj: O}>;
export function deepRequired<const T extends DeepRequiredArgs>(args: T): HKTF.Apply<DeepRequired, T>;
export function deepRequired<const T extends DeepRequiredArgs>(...args: [T] | [T["obj"]]): HKTF.Apply<DeepRequired, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    return deepRequiredImpl(args[0].obj) as unknown as HKTF.Apply<DeepRequired, T>;
  }
  return deepRequiredImpl(args[0]) as unknown as HKTF.Apply<DeepRequired, T>;
}
