import type * as Arithmetic from "ts-arithmetic";
import type { HKTF } from "@servicejs/hkt-core";

export interface XorArgs {
  a: 0 | 1;
  b: 0 | 1;
}

export interface Xor extends HKTF.Base {
  [HKTF.ArgsSymbol]: XorArgs;
  [HKTF.ResultSymbol]: Arithmetic.Xor<HKTF.Args<this>["a"], HKTF.Args<this>["b"]>;
};

export function xor<const A extends 0 | 1, const B extends 0 | 1>(a: A, b: B): HKTF.Apply<Xor, {a: A, b: B}>;
export function xor<const T extends XorArgs>(args: T): HKTF.Apply<Xor, T>;
export function xor<const T extends XorArgs>(...args: [T] | [T["a"], T["b"]]): HKTF.Apply<Xor, T> {
  return args.length === 1 ? ((args[0].a ^ args[0].b)) as HKTF.Apply<Xor, T> : ((args[0] ^ args[1])) as HKTF.Apply<Xor, T>;
}
