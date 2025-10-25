import type * as Arithmetic from "ts-arithmetic";
import type { HKTF } from "@servicejs/hkt-core";

export interface IsIntArgs {
  n: number;
}

export interface IsInt extends HKTF.Base {
  [HKTF.ArgsSymbol]: IsIntArgs;
  [HKTF.ResultSymbol]: Arithmetic.IsInt<HKTF.Args<this>["n"]>;
};

export function isInt<const A extends number>(n: A): HKTF.Apply<IsInt, {n: A}>;
export function isInt<const T extends IsIntArgs>(args: T): HKTF.Apply<IsInt, T>;
export function isInt<const T extends IsIntArgs>(...args: [T] | [T["n"]]): HKTF.Apply<IsInt, T> {
  return typeof args[0] === 'object' ? ((Number.isInteger(args[0].n) ? 1 : 0)) as HKTF.Apply<IsInt, T> : ((Number.isInteger(args[0]) ? 1 : 0)) as HKTF.Apply<IsInt, T>;
}
