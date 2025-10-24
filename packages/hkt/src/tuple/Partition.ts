import type * as FunctionHKTF from '../function';
import type * as HKTF from '../hktf';

export interface PartitionArgs {
  tuple: readonly unknown[];
  predicate: FunctionHKTF.Predicate<unknown>;
}

export type PartitionResult<T extends PartitionArgs> = T['tuple'] extends readonly []
  ? readonly [readonly [], readonly []]
  : T['tuple'] extends readonly [infer Head, ...infer Tail]
  ? PartitionResult<{ tuple: Tail; predicate: T['predicate'] }> extends readonly [
      infer TrueAcc extends readonly unknown[],
      infer FalseAcc extends readonly unknown[]
    ]
    ? T['predicate'] extends FunctionHKTF.Predicate<Head>
      ? readonly [readonly [Head, ...TrueAcc], FalseAcc]
      : readonly [TrueAcc, readonly [Head, ...FalseAcc]]
    : never
  : readonly [readonly [], readonly []];

/**
 * Partition HKTF - splits tuple by predicate into [matching, non-matching]
 */
export interface Partition extends HKTF.Base {
  [HKTF.ArgsSymbol]: PartitionArgs;
  [HKTF.ResultSymbol]: PartitionResult<HKTF.Args<this>>;
}

export function partition<const A extends readonly unknown[], const P extends FunctionHKTF.Predicate<unknown>>(tuple: A, predicate: P): HKTF.Apply<Partition, {tuple: A, predicate: P}>;
export function partition<const T extends PartitionArgs>(args: T): HKTF.Apply<Partition, T>;
export function partition<const T extends PartitionArgs>(...args: [T] | [T["tuple"], T["predicate"]]): HKTF.Apply<Partition, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    const trueArr: unknown[] = [];
    const falseArr: unknown[] = [];
    for (const item of args[0].tuple) {
      if ((args[0].predicate as any)(item)) {
        trueArr.push(item);
      } else {
        falseArr.push(item);
      }
    }
    return [trueArr, falseArr] as unknown as HKTF.Apply<Partition, T>;
  }
  const trueArr: unknown[] = [];
  const falseArr: unknown[] = [];
  for (const item of args[0] as T["tuple"]) {
    if ((args[1] as any)(item)) {
      trueArr.push(item);
    } else {
      falseArr.push(item);
    }
  }
  return [trueArr, falseArr] as unknown as HKTF.Apply<Partition, T>;
}
