import type { FunctionHKTF } from '@servicejs/hkt-core';
import type { HKTF } from '@servicejs/hkt-core';

export interface SortArgs {
  tuple: readonly unknown[];
  comparator?: FunctionHKTF.Fn2<unknown, unknown, number>;
}

// Type-level sorting is complex and limited in TypeScript
// For the type level, we'll preserve the tuple as-is since we can't evaluate comparators
// The runtime will handle actual sorting
export type SortResult<T extends SortArgs> = T['tuple'];

/**
 * Sort HKTF - sorts tuple elements using a comparator
 * Note: Type-level result preserves input type (sorting happens at runtime)
 */
export interface Sort extends HKTF.Base {
  [HKTF.ArgsSymbol]: SortArgs;
  [HKTF.ResultSymbol]: SortResult<HKTF.Args<this>>;
}

export function sort<const A extends readonly unknown[], const C extends FunctionHKTF.Fn2<unknown, unknown, number> | undefined = undefined>(tuple: A, comparator?: C): any;
export function sort<const T extends SortArgs>(args: T): HKTF.Apply<Sort, T>;
export function sort<const T extends SortArgs>(...args: [T] | [T["tuple"], T["comparator"]?]): HKTF.Apply<Sort, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    const arr = [...args[0].tuple];
    return (args[0].comparator ? arr.sort(args[0].comparator as any) : arr.sort()) as HKTF.Apply<Sort, T>;
  }
  const arr = [...(args[0] as T["tuple"])];
  return (args[1] ? arr.sort(args[1] as any) : arr.sort()) as HKTF.Apply<Sort, T>;
}
