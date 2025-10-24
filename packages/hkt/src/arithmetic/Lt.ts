import type * as Arithmetic from "ts-arithmetic";
import type * as HKTF from "../hktf";

export interface LtArgs {
  a: number;
  b: number;
}

export interface Lt extends HKTF.Base {
  [HKTF.ArgsSymbol]: LtArgs;
  [HKTF.ResultSymbol]: Arithmetic.Lt<HKTF.Args<this>["a"], HKTF.Args<this>["b"]>;
};

export function lt<const A extends number, const B extends number>(a: A, b: B): HKTF.Apply<Lt, {a: A, b: B}>;
export function lt<const T extends LtArgs>(args: T): HKTF.Apply<Lt, T>;
export function lt<const T extends LtArgs>(...args: [T] | [T["a"], T["b"]]): HKTF.Apply<Lt, T> {
  return args.length === 1 ? ((args[0].a < args[0].b ? 1 : 0)) as HKTF.Apply<Lt, T> : ((args[0] < args[1] ? 1 : 0)) as HKTF.Apply<Lt, T>;
}
