import type * as Arithmetic from "ts-arithmetic";
import type * as HKTF from "../hktf";

export interface GtOrEqArgs {
  a: number;
  b: number;
}

export interface GtOrEq extends HKTF.Base {
  [HKTF.ArgsSymbol]: GtOrEqArgs;
  [HKTF.ResultSymbol]: Arithmetic.GtOrEq<HKTF.Args<this>["a"], HKTF.Args<this>["b"]>;
};

export function gtOrEq<const A extends number, const B extends number>(a: A, b: B): HKTF.Apply<GtOrEq, {a: A, b: B}>;
export function gtOrEq<const T extends GtOrEqArgs>(args: T): HKTF.Apply<GtOrEq, T>;
export function gtOrEq<const T extends GtOrEqArgs>(...args: [T] | [T["a"], T["b"]]): HKTF.Apply<GtOrEq, T> {
  return args.length === 1 ? ((args[0].a >= args[0].b ? 1 : 0)) as HKTF.Apply<GtOrEq, T> : ((args[0] >= args[1] ? 1 : 0)) as HKTF.Apply<GtOrEq, T>;
}
