import type * as Arithmetic from "ts-arithmetic";
import type { HKTF } from "@servicejs/hkt-core";

export interface AndArgs {
  a: 0 | 1;
  b: 0 | 1;
}

export interface And extends HKTF.Base {
  [HKTF.ArgsSymbol]: AndArgs;
  [HKTF.ResultSymbol]: Arithmetic.And<HKTF.Args<this>["a"], HKTF.Args<this>["b"]>;
};

export function and<const A extends 0 | 1, const B extends 0 | 1>(a: A, b: B): HKTF.Apply<And, {a: A, b: B}>;
export function and<const T extends AndArgs>(args: T): HKTF.Apply<And, T>;
export function and<const T extends AndArgs>(...args: [T] | [T["a"], T["b"]]): HKTF.Apply<And, T> {
  return args.length === 1 ? ((args[0].a & args[0].b)) as HKTF.Apply<And, T> : ((args[0] & args[1])) as HKTF.Apply<And, T>;
}
