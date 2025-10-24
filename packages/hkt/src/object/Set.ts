import type * as HKTF from '../hktf';

export interface SetArgs {
  obj: Record<string, unknown>;
  path: readonly string[];
  value: unknown;
}

export type SetResult<T extends SetArgs> = T['path'] extends readonly []
  ? T['value']
  : T['path'] extends readonly [infer Head, ...infer Tail]
  ? Head extends string
    ? Tail extends readonly string[]
      ? Tail extends readonly []
        ? { [K in keyof T['obj'] | Head]: K extends Head ? T['value'] : T['obj'][K & keyof T['obj']] }
        : {
            [K in keyof T['obj'] | Head]: K extends Head
              ? K extends keyof T['obj']
                ? T['obj'][K] extends Record<string, unknown>
                  ? SetResult<{ obj: T['obj'][K]; path: Tail; value: T['value'] }>
                  : never
                : SetResult<{ obj: {}; path: Tail; value: T['value'] }>
              : T['obj'][K & keyof T['obj']];
          }
      : never
    : never
  : never;

/**
 * Set HKTF - sets value at path in object
 * Returns new object with value set
 */
export interface Set extends HKTF.Base {
  [HKTF.ArgsSymbol]: SetArgs;
  [HKTF.ResultSymbol]: SetResult<HKTF.Args<this>>;
}

export function set<const O extends Record<string, unknown>, const P extends readonly string[], const V>(obj: O, path: P, value: V): HKTF.Apply<Set, {obj: O, path: P, value: V}>;
export function set<const T extends SetArgs>(args: T): HKTF.Apply<Set, T>;
export function set<const T extends SetArgs>(...args: [T] | [T["obj"], T["path"], T["value"]]): HKTF.Apply<Set, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    const path = args[0].path as readonly string[];
    if (path.length === 0) {
      return args[0].value as HKTF.Apply<Set, T>;
    }
    const result = { ...(args[0].obj as Record<string, unknown>) };
    let current: any = result;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i]!;
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      } else {
        current[key] = { ...current[key] };
      }
      current = current[key];
    }
    const lastKey = path[path.length - 1]!;
    current[lastKey] = args[0].value;
    return result as unknown as HKTF.Apply<Set, T>;
  }
  const path = args[1] as readonly string[];
  const value = args[2];
  if (path.length === 0) {
    return value as HKTF.Apply<Set, T>;
  }
  const result = { ...(args[0] as Record<string, unknown>) };
  let current: any = result;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]!;
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    } else {
      current[key] = { ...current[key] };
    }
    current = current[key];
  }
  const lastKey = path[path.length - 1]!;
  current[lastKey] = value;
  return result as unknown as HKTF.Apply<Set, T>;
}
