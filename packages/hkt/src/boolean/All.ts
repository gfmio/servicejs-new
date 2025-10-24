import type * as HKTF from "../hktf";

export interface AllArgs {
  values: readonly boolean[];
}

export type AllResult<T extends AllArgs> = T['values'][number] extends true
  ? true
  : T['values'] extends readonly true[]
  ? true
  : false;


/**
 * All - returns true if all elements in the array are true
 */
export interface All extends HKTF.Base {
  [HKTF.ArgsSymbol]: AllArgs;
  [HKTF.ResultSymbol]: AllResult<HKTF.Args<this>>;
}

export function all<const A extends readonly boolean[]>(values: A): HKTF.Apply<All, {values: A}>;
export function all<const T extends AllArgs>(args: T): HKTF.Apply<All, T>;
export function all<const T extends AllArgs>(...args: [T] | [T["values"]]): HKTF.Apply<All, T> {
  const items = Array.isArray(args[0]) ? (args[0] as T["values"]) : args[0].values as T["values"];
  
  for (const item of items) {
    if (!item) {
      return false as HKTF.Apply<All, T> ;
    }
  }

  return true as HKTF.Apply<All, T> ;
}
