import type * as Arithmetic from "ts-arithmetic";
import type * as HKTF from "../hktf";

export interface AbsArgs {
  n: number;
}

export interface Abs extends HKTF.Base {
  [HKTF.ArgsSymbol]: AbsArgs;
  [HKTF.ResultSymbol]: Arithmetic.Abs<HKTF.Args<this>["n"]>;
};

export function abs<const A extends number>(n: A): HKTF.Apply<Abs, {n: A}>;
export function abs<const T extends AbsArgs>(args: T): HKTF.Apply<Abs, T>;
export function abs<const T extends AbsArgs>(...args: [T] | [T["n"]]): HKTF.Apply<Abs, T> {
  return typeof args[0] === 'object' ? (Math.abs(args[0].n)) as HKTF.Apply<Abs, T> : (Math.abs(args[0])) as HKTF.Apply<Abs, T>;
}
