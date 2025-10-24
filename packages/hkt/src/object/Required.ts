import type * as HKTF from '../hktf';

export interface RequiredArgs {
  obj: Record<string, unknown>;
}

export type RequiredResult<T extends RequiredArgs> = globalThis.Required<T['obj']>;

/**
 * Required HKTF - makes all properties required
 */
export interface Required extends HKTF.Base {
  [HKTF.ArgsSymbol]: RequiredArgs;
  [HKTF.ResultSymbol]: RequiredResult<HKTF.Args<this>>;
}

export function required<const O extends Record<string, unknown>>(obj: O): HKTF.Apply<Required, {obj: O}>;
export function required<const T extends RequiredArgs>(args: T): HKTF.Apply<Required, T>;
export function required<const T extends RequiredArgs>(...args: [T] | [T["obj"]]): HKTF.Apply<Required, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    return { ...(args[0].obj as Record<string, unknown>) } as unknown as HKTF.Apply<Required, T>;
  }
  return { ...(args[0] as Record<string, unknown>) } as unknown as HKTF.Apply<Required, T>;
}
