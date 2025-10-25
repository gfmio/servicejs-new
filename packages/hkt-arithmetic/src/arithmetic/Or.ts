import type * as Arithmetic from "ts-arithmetic";
import type { HKTF } from "@servicejs/hkt-core";

export interface OrArgs {
  a: 0 | 1;
  b: 0 | 1;
}

export interface Or extends HKTF.Base {
  [HKTF.ArgsSymbol]: OrArgs;
  [HKTF.ResultSymbol]: Arithmetic.Or<HKTF.Args<this>["a"], HKTF.Args<this>["b"]>;
};

export function or<const A extends 0 | 1, const B extends 0 | 1>(a: A, b: B): HKTF.Apply<Or, {a: A, b: B}>;
export function or<const T extends OrArgs>(args: T): HKTF.Apply<Or, T>;
export function or<const T extends OrArgs>(...args: [T] | [T["a"], T["b"]]): HKTF.Apply<Or, T> {
  return args.length === 1 ? ((args[0].a | args[0].b)) as HKTF.Apply<Or, T> : ((args[0] | args[1])) as HKTF.Apply<Or, T>;
}
