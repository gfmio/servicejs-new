import type * as Arithmetic from "ts-arithmetic";
import type { HKTF } from "@servicejs/hkt-core";

export interface ModArgs {
  a: number;
  b: number;
}

export interface Mod extends HKTF.Base {
  [HKTF.ArgsSymbol]: ModArgs;
  [HKTF.ResultSymbol]: Arithmetic.Mod<HKTF.Args<this>["a"], HKTF.Args<this>["b"]>;
};

export function mod<const A extends number, const B extends number>(a: A, b: B): HKTF.Apply<Mod, {a: A, b: B}>;
export function mod<const T extends ModArgs>(args: T): HKTF.Apply<Mod, T>;
export function mod<const T extends ModArgs>(...args: [T] | [T["a"], T["b"]]): HKTF.Apply<Mod, T> {
  return args.length === 1 ? (args[0].a % args[0].b) as HKTF.Apply<Mod, T> : (args[0] % args[1]) as HKTF.Apply<Mod, T>;
}
