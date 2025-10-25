import type * as Arithmetic from "ts-arithmetic";
import type { HKTF } from "@servicejs/hkt-core";

export interface IsNegativeArgs {
  n: number;
}

export interface IsNegative extends HKTF.Base {
  [HKTF.ArgsSymbol]: IsNegativeArgs;
  [HKTF.ResultSymbol]: Arithmetic.IsNegative<HKTF.Args<this>["n"]>;
};

export function isNegative<const A extends number>(n: A): HKTF.Apply<IsNegative, {n: A}>;
export function isNegative<const T extends IsNegativeArgs>(args: T): HKTF.Apply<IsNegative, T>;
export function isNegative<const T extends IsNegativeArgs>(...args: [T] | [T["n"]]): HKTF.Apply<IsNegative, T> {
  return typeof args[0] === 'object' ? ((args[0].n < 0 ? 1 : 0)) as HKTF.Apply<IsNegative, T> : ((args[0] < 0 ? 1 : 0)) as HKTF.Apply<IsNegative, T>;
}
