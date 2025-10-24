import type * as Arithmetic from "ts-arithmetic";
import type * as HKTF from '../hktf';

export interface RepeatArgs {
  tuple: readonly unknown[];
  count: number;
}

// Helper to decrement
type Dec<N extends number> = Arithmetic.Subtract<N, 1>;

export type RepeatResult<T extends RepeatArgs> =
  T['count'] extends 0
    ? readonly []
    : T['count'] extends 1
      ? T['tuple']
      : readonly [...T['tuple'], ...RepeatResult<{ tuple: T['tuple']; count: Dec<T['count']> }>];

/**
 * Repeat HKTF - repeats a tuple N times
 */
export interface Repeat extends HKTF.Base {
  [HKTF.ArgsSymbol]: RepeatArgs;
  [HKTF.ResultSymbol]: RepeatResult<HKTF.Args<this>>;
}

export function repeat<const A extends readonly unknown[], const C extends number>(tuple: A, count: C): HKTF.Apply<Repeat, {tuple: A, count: C}>;
export function repeat<const T extends RepeatArgs>(args: T): HKTF.Apply<Repeat, T>;
export function repeat<const T extends RepeatArgs>(...args: [T] | [T["tuple"], T["count"]]): HKTF.Apply<Repeat, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    const result: unknown[] = [];
    for (let i = 0; i < args[0].count; i++) {
      result.push(...args[0].tuple);
    }
    return result as unknown as HKTF.Apply<Repeat, T>;
  }
  const result: unknown[] = [];
  for (let i = 0; i < (args[1] as T["count"]); i++) {
    result.push(...(args[0] as T["tuple"]));
  }
  return result as unknown as HKTF.Apply<Repeat, T>;
}
