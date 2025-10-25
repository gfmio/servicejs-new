import type * as Arithmetic from "ts-arithmetic";
import type { HKTF } from "@servicejs/hkt-core";

export interface IsOddArgs {
  n: number;
}

export interface IsOdd extends HKTF.Base {
  [HKTF.ArgsSymbol]: IsOddArgs;
  [HKTF.ResultSymbol]: Arithmetic.IsOdd<HKTF.Args<this>["n"]>;
};

export function isOdd<const A extends number>(n: A): HKTF.Apply<IsOdd, {n: A}>;
export function isOdd<const T extends IsOddArgs>(args: T): HKTF.Apply<IsOdd, T>;
export function isOdd<const T extends IsOddArgs>(...args: [T] | [T["n"]]): HKTF.Apply<IsOdd, T> {
  return typeof args[0] === 'object' ? ((args[0].n % 2 !== 0 ? 1 : 0)) as HKTF.Apply<IsOdd, T> : ((args[0] % 2 !== 0 ? 1 : 0)) as HKTF.Apply<IsOdd, T>;
}
