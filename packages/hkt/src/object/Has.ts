import type * as HKTF from '../hktf';

export interface HasArgs {
  obj: Record<string, unknown>;
  path: readonly string[];
}

// Type-level check if path exists
export type HasResult<T extends HasArgs> = T['path'] extends readonly []
  ? true
  : T['path'] extends readonly [infer Head, ...infer Tail]
  ? Head extends keyof T['obj']
    ? Tail extends readonly string[]
      ? T['obj'][Head] extends Record<string, unknown>
        ? HasResult<{ obj: T['obj'][Head]; path: Tail }>
        : Tail extends readonly []
        ? true
        : false
      : false
    : false
  : false;

/**
 * Has HKTF - checks if object has a value at the given path
 */
export interface Has extends HKTF.Base {
  [HKTF.ArgsSymbol]: HasArgs;
  [HKTF.ResultSymbol]: HasResult<HKTF.Args<this>>;
}

export function has<const O extends Record<string, unknown>, const P extends readonly string[]>(obj: O, path: P): HKTF.Apply<Has, {obj: O, path: P}>;
export function has<const T extends HasArgs>(args: T): HKTF.Apply<Has, T>;
export function has<const T extends HasArgs>(...args: [T] | [T["obj"], T["path"]]): HKTF.Apply<Has, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    let current: any = args[0].obj as Record<string, unknown>;
    const path = args[0].path as readonly string[];
    for (const key of path) {
      if (current === null || current === undefined || typeof current !== 'object' || !(key in current)) {
        return false as HKTF.Apply<Has, T>;
      }
      current = current[key];
    }
    return true as HKTF.Apply<Has, T>;
  }
  let current: any = args[0] as Record<string, unknown>;
  const path = args[1] as readonly string[];
  for (const key of path) {
    if (current === null || current === undefined || typeof current !== 'object' || !(key in current)) {
      return false as HKTF.Apply<Has, T>;
    }
    current = current[key];
  }
  return true as HKTF.Apply<Has, T>;
}
