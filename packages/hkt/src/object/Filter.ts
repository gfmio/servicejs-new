import type * as FunctionHKTF from '../function';
import type * as HKTF from '../hktf';

export interface FilterArgs {
  obj: Record<string, unknown>;
  predicate: FunctionHKTF.Fn1<readonly [string, unknown], boolean>;
}

// Type-level Filter is complex, simplified version
export type FilterResult<_T extends FilterArgs> = Record<string, unknown>;

/**
 * Filter HKTF - filters object entries by predicate
 */
export interface Filter extends HKTF.Base {
  [HKTF.ArgsSymbol]: FilterArgs;
  [HKTF.ResultSymbol]: FilterResult<HKTF.Args<this>>;
}

export function filter<const O extends Record<string, unknown>, const P extends FunctionHKTF.Fn1<readonly [string, unknown], boolean>>(obj: O, predicate: P): HKTF.Apply<Filter, {obj: O, predicate: P}>;
export function filter<const T extends FilterArgs>(args: T): HKTF.Apply<Filter, T>;
export function filter<const T extends FilterArgs>(...args: [T] | [T["obj"], T["predicate"]]): HKTF.Apply<Filter, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    const obj = args[0].obj as Record<string, unknown>;
    const predicate = args[0].predicate as any;
    const result: Record<string, unknown> = {};

    for (const key in obj) {
      if (predicate([key, obj[key]])) {
        result[key] = obj[key];
      }
    }

    return result as unknown as HKTF.Apply<Filter, T>;
  }
  const obj = args[0] as Record<string, unknown>;
  const predicate = args[1] as any;
  const result: Record<string, unknown> = {};

  for (const key in obj) {
    if (predicate([key, obj[key]])) {
      result[key] = obj[key];
    }
  }

  return result as unknown as HKTF.Apply<Filter, T>;
}
