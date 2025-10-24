import type * as HKTF from "../hktf";

export interface OrArgs {
  a: boolean;
  b: boolean;
}

export type OrResult<T extends OrArgs> = T['a'] extends true
  ? true
  : T['b'] extends true
  ? true
  : false;


/**
 * Or - logical OR
 */
export interface Or extends HKTF.Base {
  [HKTF.ArgsSymbol]: OrArgs;
  [HKTF.ResultSymbol]: OrResult<HKTF.Args<this>>;
}

export function or<const A extends boolean, const B extends boolean>(a: A, b: B): HKTF.Apply<Or, {a: A, b: B}>;
export function or<const T extends OrArgs>(args: T): HKTF.Apply<Or, T>;
export function or<const T extends OrArgs>(...args: [T] | [T["a"], T["b"]]): HKTF.Apply<Or, T> {
  return args.length === 1 ? (args[0].a || args[0].b) as HKTF.Apply<Or, T> : (args[0] || args[1]) as HKTF.Apply<Or, T>;
}
