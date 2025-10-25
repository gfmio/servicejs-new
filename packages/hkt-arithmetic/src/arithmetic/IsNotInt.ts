import type * as Arithmetic from "ts-arithmetic";
import type { HKTF } from "@servicejs/hkt-core";

export interface IsNotIntArgs {
  n: number;
}

export interface IsNotInt extends HKTF.Base {
  [HKTF.ArgsSymbol]: IsNotIntArgs;
  [HKTF.ResultSymbol]: Arithmetic.IsNotInt<HKTF.Args<this>["n"]>;
};

export function isNotInt<const A extends number>(n: A): HKTF.Apply<IsNotInt, {n: A}>;
export function isNotInt<const T extends IsNotIntArgs>(args: T): HKTF.Apply<IsNotInt, T>;
export function isNotInt<const T extends IsNotIntArgs>(...args: [T] | [T["n"]]): HKTF.Apply<IsNotInt, T> {
  return typeof args[0] === 'object' ? ((!Number.isInteger(args[0].n) ? 1 : 0)) as HKTF.Apply<IsNotInt, T> : ((!Number.isInteger(args[0]) ? 1 : 0)) as HKTF.Apply<IsNotInt, T>;
}
