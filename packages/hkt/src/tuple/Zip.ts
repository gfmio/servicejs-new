import type * as HKTF from '../hktf';

export interface ZipArgs {
  tuple1: readonly unknown[];
  tuple2: readonly unknown[];
}

export type ZipResult<T extends ZipArgs> = T['tuple1'] extends readonly []
  ? readonly []
  : T['tuple2'] extends readonly []
  ? readonly []
  : T['tuple1'] extends readonly [infer Head1, ...infer Tail1]
  ? T['tuple2'] extends readonly [infer Head2, ...infer Tail2]
    ? readonly [
        readonly [Head1, Head2],
        ...ZipResult<{ tuple1: Tail1; tuple2: Tail2 }>
      ]
    : readonly []
  : readonly [];

/**
 * Zip HKTF - combines two tuples element-wise
 */
export interface Zip extends HKTF.Base {
  [HKTF.ArgsSymbol]: ZipArgs;
  [HKTF.ResultSymbol]: ZipResult<HKTF.Args<this>>;
}

export function zip<const A extends readonly unknown[], const B extends readonly unknown[]>(tuple1: A, tuple2: B): HKTF.Apply<Zip, {tuple1: A, tuple2: B}>;
export function zip<const T extends ZipArgs>(args: T): HKTF.Apply<Zip, T>;
export function zip<const T extends ZipArgs>(...args: [T] | [T["tuple1"], T["tuple2"]]): HKTF.Apply<Zip, T> {
  if (typeof args[0] === 'object' && 'tuple1' in args[0]) {
    const result: unknown[][] = [];
    const len = Math.min(args[0].tuple1.length, args[0].tuple2.length);
    for (let i = 0; i < len; i++) {
      result.push([args[0].tuple1[i], args[0].tuple2[i]]);
    }
    return result as unknown as HKTF.Apply<Zip, T>;
  }
  const result: unknown[][] = [];
  const tuple1 = args[0] as T["tuple1"];
  const tuple2 = args[1] as T["tuple2"];
  const len = Math.min(tuple1.length, tuple2.length);
  for (let i = 0; i < len; i++) {
    result.push([tuple1[i], tuple2[i]]);
  }
  return result as unknown as HKTF.Apply<Zip, T>;
}
