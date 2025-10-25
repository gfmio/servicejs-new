import type { HKTF } from "@servicejs/hkt-core";

export interface XorArgs {
  a: boolean;
  b: boolean;
}

export type XorResult<T extends XorArgs> = T["a"] extends T["b"]
  ? T["b"] extends T["a"]
    ? false
    : true
  : true;

/**
 * Xor - logical XOR
 */
export interface Xor extends HKTF.Base {
  [HKTF.ArgsSymbol]: XorArgs;
  [HKTF.ResultSymbol]: XorResult<HKTF.Args<this>>;
}

export function xor<const A extends boolean, const B extends boolean>(a: A, b: B): HKTF.Apply<Xor, {a: A, b: B}>;
export function xor<const T extends XorArgs>(args: T): HKTF.Apply<Xor, T>;
export function xor<const T extends XorArgs>(...args: [T] | [T["a"], T["b"]]): HKTF.Apply<Xor, T> {
  return args.length === 1 ? (args[0].a !== args[0].b) as HKTF.Apply<Xor, T> : (args[0] !== args[1]) as HKTF.Apply<Xor, T>;
}
