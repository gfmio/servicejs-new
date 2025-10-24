import type * as Arithmetic from "ts-arithmetic";
import type * as HKTF from "../hktf";

export interface NotArgs {
  b: 0 | 1;
}

export interface Not extends HKTF.Base {
  [HKTF.ArgsSymbol]: NotArgs;
  [HKTF.ResultSymbol]: Arithmetic.Not<HKTF.Args<this>["b"]>;
};

export function not<const A extends 0 | 1>(b: A): HKTF.Apply<Not, {b: A}>;
export function not<const T extends NotArgs>(args: T): HKTF.Apply<Not, T>;
export function not<const T extends NotArgs>(...args: [T] | [T["b"]]): HKTF.Apply<Not, T> {
  return typeof args[0] === 'object' ? ((args[0].b === 0 ? 1 : 0)) as HKTF.Apply<Not, T> : ((args[0] === 0 ? 1 : 0)) as HKTF.Apply<Not, T>;
}
