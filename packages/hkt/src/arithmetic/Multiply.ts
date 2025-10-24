import type * as Arithmetic from "ts-arithmetic";
import type * as HKTF from "../hktf";

export interface MultiplyArgs {
  a: number;
  b: number;
}

export interface Multiply extends HKTF.Base {
  [HKTF.ArgsSymbol]: MultiplyArgs;
  [HKTF.ResultSymbol]: Arithmetic.Multiply<HKTF.Args<this>["a"], HKTF.Args<this>["b"]>;
};

export function multiply<const A extends number, const B extends number>(a: A, b: B): HKTF.Apply<Multiply, {a: A, b: B}>;
export function multiply<const T extends MultiplyArgs>(args: T): HKTF.Apply<Multiply, T>;
export function multiply<const T extends MultiplyArgs>(...args: [T] | [T["a"], T["b"]]): HKTF.Apply<Multiply, T> {
  return args.length === 1 ? (args[0].a * args[0].b) as HKTF.Apply<Multiply, T> : (args[0] * args[1]) as HKTF.Apply<Multiply, T>;
}
