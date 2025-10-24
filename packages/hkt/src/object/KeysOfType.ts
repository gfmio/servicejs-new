import type * as HKTF from '../hktf';

export interface KeysOfTypeArgs {
  obj: Record<string, unknown>;
  type: unknown;
}

export type KeysOfTypeResult<T extends KeysOfTypeArgs> = readonly {
  [K in keyof T['obj']]: T['obj'][K] extends T['type'] ? K : never;
}[keyof T['obj']][];

/**
 * KeysOfType HKTF - gets keys where value matches a specific type
 */
export interface KeysOfType extends HKTF.Base {
  [HKTF.ArgsSymbol]: KeysOfTypeArgs;
  [HKTF.ResultSymbol]: KeysOfTypeResult<HKTF.Args<this>>;
}

export function keysOfType<const O extends Record<string, unknown>, const Type>(obj: O, type: Type): any;
export function keysOfType<const T extends KeysOfTypeArgs>(args: T): HKTF.Apply<KeysOfType, T>;
export function keysOfType<const T extends KeysOfTypeArgs>(...args: [T] | [T["obj"], T["type"]]): HKTF.Apply<KeysOfType, T> {
  // Runtime: filter keys by typeof check (limited but practical)
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    const obj = args[0].obj as Record<string, unknown>;
    const typeExample = args[0].type;
    const targetType = typeof typeExample;
    return Object.keys(obj).filter(key => typeof obj[key] === targetType) as unknown as HKTF.Apply<KeysOfType, T>;
  }
  const obj = args[0] as Record<string, unknown>;
  const typeExample = args[1];
  const targetType = typeof typeExample;
  return Object.keys(obj).filter(key => typeof obj[key] === targetType) as unknown as HKTF.Apply<KeysOfType, T>;
}
