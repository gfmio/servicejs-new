import type * as Arithmetic from "ts-arithmetic";
import type { HKTF } from "@servicejs/hkt-core";

export interface NegateArgs {
  n: number;
}

export interface Negate extends HKTF.Base {
  [HKTF.ArgsSymbol]: NegateArgs;
  [HKTF.ResultSymbol]: Arithmetic.Negate<HKTF.Args<this>["n"]>;
};

export function negate<const A extends number>(n: A): HKTF.Apply<Negate, {n: A}>;
export function negate<const T extends NegateArgs>(args: T): HKTF.Apply<Negate, T>;
export function negate<const T extends NegateArgs>(...args: [T] | [T["n"]]): HKTF.Apply<Negate, T> {
  return typeof args[0] === 'object' ? (-args[0].n) as HKTF.Apply<Negate, T> : (-args[0]) as HKTF.Apply<Negate, T>;
}
