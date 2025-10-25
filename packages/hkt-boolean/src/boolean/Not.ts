import type { HKTF } from "@servicejs/hkt-core";

export interface NotArgs {
  value: boolean;
}

export type NotResult<T extends NotArgs> = T['value'] extends true ? false : true;

export interface Not extends HKTF.Base {
  [HKTF.ArgsSymbol]: NotArgs;
  [HKTF.ResultSymbol]: NotResult<HKTF.Args<this>>;
}

/**
 * Not - logical NOT
 */
export function not<const A extends boolean>(value: A): HKTF.Apply<Not, {value: A}>;
export function not<const T extends NotArgs>(args: T): HKTF.Apply<Not, T>;
export function not<const T extends NotArgs>(...args: [T] | [T["value"]]): HKTF.Apply<Not, T> {
  return typeof args[0] === 'object' ? (!args[0].value) as HKTF.Apply<Not, T> : (!args[0]) as HKTF.Apply<Not, T>;
}
