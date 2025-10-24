import type * as Arithmetic from "ts-arithmetic";
import type * as HKTF from "../hktf";

export interface IsEvenArgs {
  n: number;
}

export interface IsEven extends HKTF.Base {
  [HKTF.ArgsSymbol]: IsEvenArgs;
  [HKTF.ResultSymbol]: Arithmetic.IsEven<HKTF.Args<this>["n"]>;
};

export function isEven<const A extends number>(n: A): HKTF.Apply<IsEven, {n: A}>;
export function isEven<const T extends IsEvenArgs>(args: T): HKTF.Apply<IsEven, T>;
export function isEven<const T extends IsEvenArgs>(...args: [T] | [T["n"]]): HKTF.Apply<IsEven, T> {
  return typeof args[0] === 'object' ? ((args[0].n % 2 === 0 ? 1 : 0)) as HKTF.Apply<IsEven, T> : ((args[0] % 2 === 0 ? 1 : 0)) as HKTF.Apply<IsEven, T>;
}
