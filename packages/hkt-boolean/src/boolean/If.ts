import type { HKTF } from "@servicejs/hkt-core";

export interface IfArgs<Then = unknown, Else = unknown> {
  condition: boolean;
  then: Then;
  else: Else;
}

export type IfResult<T extends IfArgs> = T["condition"] extends true
  ? T["then"]
  : T["condition"] extends false
  ? T["else"]
  : (T["then"] | T["else"]);

/**
 * If - conditional type selection
 */
export interface If extends HKTF.Base {
  [HKTF.ArgsSymbol]: IfArgs;
  [HKTF.ResultSymbol]: IfResult<HKTF.Args<this>>;
}

export function ifThenElse<const Cond extends boolean, const Then, const Else>(
  condition: Cond,
  thenValue: Then,
  elseValue: Else
): HKTF.Apply<If, {condition: Cond, then: Then, else: Else}>;
export function ifThenElse<const T extends IfArgs>(args: T): HKTF.Apply<If, T>;
export function ifThenElse<const T extends IfArgs>(...args: [T] | [T["condition"], T["then"], T["else"]]): HKTF.Apply<If, T> {
  return args.length === 1
    ? (args[0].condition ? args[0].then : args[0].else) as HKTF.Apply<If, T>
    : (args[0] ? args[1] : args[2]) as HKTF.Apply<If, T>;
}
