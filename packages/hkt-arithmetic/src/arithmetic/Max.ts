import type * as Arithmetic from "ts-arithmetic";
import type { HKTF } from "@servicejs/hkt-core";

export interface MaxArgs {
  a: number;
  b: number;
}

export interface Max extends HKTF.Base {
  [HKTF.ArgsSymbol]: MaxArgs;
  [HKTF.ResultSymbol]: Arithmetic.Max<HKTF.Args<this>["a"], HKTF.Args<this>["b"]>;
};

export function max<const A extends number, const B extends number>(a: A, b: B): HKTF.Apply<Max, {a: A, b: B}>;
export function max<const T extends MaxArgs>(args: T): HKTF.Apply<Max, T>;
export function max<const T extends MaxArgs>(...args: [T] | [T["a"], T["b"]]): HKTF.Apply<Max, T> {
  return args.length === 1 ? (Math.max(args[0].a, args[0].b)) as HKTF.Apply<Max, T> : (Math.max(args[0], args[1])) as HKTF.Apply<Max, T>;
}
