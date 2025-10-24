import type * as Arithmetic from "ts-arithmetic";
import type * as HKTF from "../hktf";

export interface PowArgs {
  base: number;
  exponent: number;
}

export interface Pow extends HKTF.Base {
  [HKTF.ArgsSymbol]: PowArgs;
  [HKTF.ResultSymbol]: Arithmetic.Pow<HKTF.Args<this>["base"], HKTF.Args<this>["exponent"]>;
};

export function pow<const A extends number, const B extends number>(base: A, exponent: B): HKTF.Apply<Pow, {base: A, exponent: B}>;
export function pow<const T extends PowArgs>(args: T): HKTF.Apply<Pow, T>;
export function pow<const T extends PowArgs>(...args: [T] | [T["base"], T["exponent"]]): HKTF.Apply<Pow, T> {
  return args.length === 1 ? (Math.pow(args[0].base, args[0].exponent)) as HKTF.Apply<Pow, T> : (Math.pow(args[0], args[1])) as HKTF.Apply<Pow, T>;
}
