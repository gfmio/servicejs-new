import type * as Arithmetic from "ts-arithmetic";
import type { HKTF } from "@servicejs/hkt-core";

export interface MinArgs {
  a: number;
  b: number;
}

export interface Min extends HKTF.Base {
  [HKTF.ArgsSymbol]: MinArgs;
  [HKTF.ResultSymbol]: Arithmetic.Min<HKTF.Args<this>["a"], HKTF.Args<this>["b"]>;
};

export function min<const A extends number, const B extends number>(a: A, b: B): HKTF.Apply<Min, {a: A, b: B}>;
export function min<const T extends MinArgs>(args: T): HKTF.Apply<Min, T>;
export function min<const T extends MinArgs>(...args: [T] | [T["a"], T["b"]]): HKTF.Apply<Min, T> {
  return args.length === 1 ? (Math.min(args[0].a, args[0].b)) as HKTF.Apply<Min, T> : (Math.min(args[0], args[1])) as HKTF.Apply<Min, T>;
}
