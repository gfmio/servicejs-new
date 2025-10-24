import type * as Arithmetic from "ts-arithmetic";
import type * as HKTF from "../hktf";

export interface SubtractArgs {
  a: number;
  b: number;
}

export interface Subtract extends HKTF.Base {
  [HKTF.ArgsSymbol]: SubtractArgs;
  [HKTF.ResultSymbol]: Arithmetic.Subtract<HKTF.Args<this>["a"], HKTF.Args<this>["b"]>;
};

export function subtract<const A extends number, const B extends number>(a: A, b: B): HKTF.Apply<Subtract, {a: A, b: B}>;
export function subtract<const T extends SubtractArgs>(args: T): HKTF.Apply<Subtract, T>;
export function subtract<const T extends SubtractArgs>(...args: [T] | [T["a"], T["b"]]): HKTF.Apply<Subtract, T> {
  return args.length === 1 ? (args[0].a - args[0].b) as HKTF.Apply<Subtract, T> : (args[0] - args[1]) as HKTF.Apply<Subtract, T>;
}
