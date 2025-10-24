import type * as Arithmetic from "ts-arithmetic";
import type * as HKTF from "../hktf";

export interface AddArgs {
  a: number;
  b: number;
}

export interface Add extends HKTF.Base {
  [HKTF.ArgsSymbol]: AddArgs;
  [HKTF.ResultSymbol]: Arithmetic.Add<HKTF.Args<this>["a"], HKTF.Args<this>["b"]>;
};

export function add<const A extends number, const B extends number>(a: A, b: B): HKTF.Apply<Add, {a: A, b: B}>;
export function add<const T extends AddArgs>(args: T): HKTF.Apply<Add, T>;
export function add<const T extends AddArgs>(...args: [T] | [T["a"], T["b"]]): HKTF.Apply<Add, T> {
  return args.length === 1 ? (args[0].a + args[0].b) as HKTF.Apply<Add, T> : (args[0] + args[1]) as HKTF.Apply<Add, T>;
}
