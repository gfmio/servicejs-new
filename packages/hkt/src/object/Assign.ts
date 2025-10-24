import type * as HKTF from '../hktf';

export interface AssignArgs {
  targets: readonly Record<string, unknown>[];
}

// Type-level assign - merge all objects left to right
export type AssignResult<T extends AssignArgs> = T['targets'] extends readonly [infer First, ...infer Rest]
  ? Rest extends readonly Record<string, unknown>[]
    ? First extends Record<string, unknown>
      ? AssignResult<{ targets: Rest }> extends Record<string, unknown>
        ? First & AssignResult<{ targets: Rest }>
        : First
      : Record<string, unknown>
    : First extends Record<string, unknown>
    ? First
    : Record<string, unknown>
  : Record<string, unknown>;

/**
 * Assign HKTF - shallow merge multiple objects (like Object.assign)
 */
export interface Assign extends HKTF.Base {
  [HKTF.ArgsSymbol]: AssignArgs;
  [HKTF.ResultSymbol]: AssignResult<HKTF.Args<this>>;
}

export function assign<const T extends readonly Record<string, unknown>[]>(...targets: T): HKTF.Apply<Assign, {targets: T}>;
export function assign<const T extends AssignArgs>(args: T): HKTF.Apply<Assign, T>;
export function assign<const T extends AssignArgs>(...args: [T] | T["targets"]): HKTF.Apply<Assign, T> {
  if (args.length === 1 && typeof args[0] === 'object' && 'targets' in args[0]) {
    const targets = args[0].targets as readonly Record<string, unknown>[];
    return Object.assign({}, ...targets) as unknown as HKTF.Apply<Assign, T>;
  }
  return Object.assign({}, ...(args as readonly Record<string, unknown>[])) as unknown as HKTF.Apply<Assign, T>;
}
