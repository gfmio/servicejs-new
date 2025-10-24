import type * as FunctionHKTF from '../function';
import type * as HKTF from '../hktf';

export interface GroupByArgs {
  tuple: readonly unknown[];
  keyFn: FunctionHKTF.Fn1<unknown, PropertyKey>;
}

// Type-level groupBy is very complex - we'll use a simplified representation
// The runtime will handle actual grouping into a Record/Map
export type GroupByResult<_T extends GroupByArgs> = Record<PropertyKey, readonly unknown[]>;

/**
 * GroupBy HKTF - groups elements by a key function
 * Returns a record mapping keys to arrays of values
 */
export interface GroupBy extends HKTF.Base {
  [HKTF.ArgsSymbol]: GroupByArgs;
  [HKTF.ResultSymbol]: GroupByResult<HKTF.Args<this>>;
}

export function groupBy<const A extends readonly unknown[], const K extends FunctionHKTF.Fn1<unknown, PropertyKey>>(tuple: A, keyFn: K): HKTF.Apply<GroupBy, {tuple: A, keyFn: K}>;
export function groupBy<const T extends GroupByArgs>(args: T): HKTF.Apply<GroupBy, T>;
export function groupBy<const T extends GroupByArgs>(...args: [T] | [T["tuple"], T["keyFn"]]): HKTF.Apply<GroupBy, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    const result: Record<PropertyKey, unknown[]> = {};
    for (const item of args[0].tuple) {
      const key = (args[0].keyFn as any)(item);
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(item);
    }
    return result as unknown as HKTF.Apply<GroupBy, T>;
  }
  const result: Record<PropertyKey, unknown[]> = {};
  for (const item of args[0] as T["tuple"]) {
    const key = (args[1] as any)(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
  }
  return result as unknown as HKTF.Apply<GroupBy, T>;
}
