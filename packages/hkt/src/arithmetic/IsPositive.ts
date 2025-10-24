import type * as Arithmetic from "ts-arithmetic";
import type * as HKTF from "../hktf";

export interface IsPositiveArgs {
  n: number;
}

export interface IsPositive extends HKTF.Base {
  [HKTF.ArgsSymbol]: IsPositiveArgs;
  [HKTF.ResultSymbol]: Arithmetic.IsPositive<HKTF.Args<this>["n"]>;
};

export function isPositive<const A extends number>(n: A): HKTF.Apply<IsPositive, {n: A}>;
export function isPositive<const T extends IsPositiveArgs>(args: T): HKTF.Apply<IsPositive, T>;
export function isPositive<const T extends IsPositiveArgs>(...args: [T] | [T["n"]]): HKTF.Apply<IsPositive, T> {
  return typeof args[0] === 'object' ? ((args[0].n >= 0 ? 1 : 0)) as HKTF.Apply<IsPositive, T> : ((args[0] >= 0 ? 1 : 0)) as HKTF.Apply<IsPositive, T>;
}
