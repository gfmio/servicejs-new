import type * as Arithmetic from "ts-arithmetic";
import type { HKTF } from "@servicejs/hkt-core";

export interface DivideArgs {
  a: number;
  b: number;
}

export interface Divide extends HKTF.Base {
  [HKTF.ArgsSymbol]: DivideArgs;
  [HKTF.ResultSymbol]: Arithmetic.Divide<HKTF.Args<this>["a"], HKTF.Args<this>["b"]>;
};

export function divide<const A extends number, const B extends number>(a: A, b: B): HKTF.Apply<Divide, {a: A, b: B}>;
export function divide<const T extends DivideArgs>(args: T): HKTF.Apply<Divide, T>;
export function divide<const T extends DivideArgs>(...args: [T] | [T["a"], T["b"]]): HKTF.Apply<Divide, T> {
  return args.length === 1 ? (args[0].a / args[0].b) as HKTF.Apply<Divide, T> : (args[0] / args[1]) as HKTF.Apply<Divide, T>;
}
