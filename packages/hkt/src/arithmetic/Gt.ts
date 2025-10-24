import type * as Arithmetic from "ts-arithmetic";
import type * as HKTF from "../hktf";

export interface GtArgs {
  a: number;
  b: number;
}

export interface Gt extends HKTF.Base {
  [HKTF.ArgsSymbol]: GtArgs;
  [HKTF.ResultSymbol]: Arithmetic.Gt<HKTF.Args<this>["a"], HKTF.Args<this>["b"]>;
};

export function gt<const A extends number, const B extends number>(a: A, b: B): HKTF.Apply<Gt, {a: A, b: B}>;
export function gt<const T extends GtArgs>(args: T): HKTF.Apply<Gt, T>;
export function gt<const T extends GtArgs>(...args: [T] | [T["a"], T["b"]]): HKTF.Apply<Gt, T> {
  return args.length === 1 ? ((args[0].a > args[0].b ? 1 : 0)) as HKTF.Apply<Gt, T> : ((args[0] > args[1] ? 1 : 0)) as HKTF.Apply<Gt, T>;
}
