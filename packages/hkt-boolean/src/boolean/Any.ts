import type { HKTF } from "@servicejs/hkt-core";

export interface AnyArgs {
  values: readonly boolean[];
}

export type AnyResult<T extends AnyArgs> = T['values'][number] extends true
  ? true
  : T['values'] extends readonly false[]
  ? false
  : boolean;

/**
 * Any - returns true if any element in the array is true
 */
export interface Any extends HKTF.Base {
  [HKTF.ArgsSymbol]: AnyArgs;
  [HKTF.ResultSymbol]: AnyResult<HKTF.Args<this>>;
}

export function any<const A extends readonly boolean[]>(values: A): HKTF.Apply<Any, {values: A}>;
export function any<const T extends AnyArgs>(args: T): HKTF.Apply<Any, T>;
export function any<const T extends AnyArgs>(...args: [T] | [T["values"]]): HKTF.Apply<Any, T> {
  const items = Array.isArray(args[0]) ? (args[0] as T["values"]) : args[0].values as T["values"];
  
  for (const item of items) {
    if (item) {
      return true as HKTF.Apply<Any, T> ;
    }
  }

  return false as HKTF.Apply<Any, T> ;
}
