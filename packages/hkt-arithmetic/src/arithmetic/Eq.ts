import type * as Arithmetic from "ts-arithmetic";
import type { HKTF } from "@servicejs/hkt-core";

export interface EqArgs {
  a: number;
  b: number;
}

export interface Eq extends HKTF.Base {
  [HKTF.ArgsSymbol]: EqArgs;
  [HKTF.ResultSymbol]: Arithmetic.Eq<HKTF.Args<this>["a"], HKTF.Args<this>["b"]>;
};

export function eq<const A extends number, const B extends number>(a: A, b: B): HKTF.Apply<Eq, {a: A, b: B}>;
export function eq<const T extends EqArgs>(args: T): HKTF.Apply<Eq, T>;
export function eq<const T extends EqArgs>(...args: [T] | [T["a"], T["b"]]): HKTF.Apply<Eq, T> {
  return args.length === 1 ? ((args[0].a === args[0].b ? 1 : 0)) as HKTF.Apply<Eq, T> : ((args[0] === args[1] ? 1 : 0)) as HKTF.Apply<Eq, T>;
}
