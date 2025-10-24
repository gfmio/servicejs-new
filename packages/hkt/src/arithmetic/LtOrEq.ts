import type * as Arithmetic from "ts-arithmetic";
import type * as HKTF from "../hktf";

export interface LtOrEqArgs {
  a: number;
  b: number;
}

export interface LtOrEq extends HKTF.Base {
  [HKTF.ArgsSymbol]: LtOrEqArgs;
  [HKTF.ResultSymbol]: Arithmetic.LtOrEq<HKTF.Args<this>["a"], HKTF.Args<this>["b"]>;
};

export function ltOrEq<const A extends number, const B extends number>(a: A, b: B): HKTF.Apply<LtOrEq, {a: A, b: B}>;
export function ltOrEq<const T extends LtOrEqArgs>(args: T): HKTF.Apply<LtOrEq, T>;
export function ltOrEq<const T extends LtOrEqArgs>(...args: [T] | [T["a"], T["b"]]): HKTF.Apply<LtOrEq, T> {
  return args.length === 1 ? ((args[0].a <= args[0].b ? 1 : 0)) as HKTF.Apply<LtOrEq, T> : ((args[0] <= args[1] ? 1 : 0)) as HKTF.Apply<LtOrEq, T>;
}
