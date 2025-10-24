import type * as HKTF from '../hktf';

export interface DeleteArgs {
  obj: Record<string, unknown>;
  path: readonly string[];
}

// Type-level delete is complex, simplified version
export type DeleteResult<_T extends DeleteArgs> = Record<string, unknown>;

/**
 * Delete HKTF - removes a value at the given path
 * Returns new object with value removed
 */
export interface Delete extends HKTF.Base {
  [HKTF.ArgsSymbol]: DeleteArgs;
  [HKTF.ResultSymbol]: DeleteResult<HKTF.Args<this>>;
}

export function deleteAt<const O extends Record<string, unknown>, const P extends readonly string[]>(obj: O, path: P): HKTF.Apply<Delete, {obj: O, path: P}>;
export function deleteAt<const T extends DeleteArgs>(args: T): HKTF.Apply<Delete, T>;
export function deleteAt<const T extends DeleteArgs>(...args: [T] | [T["obj"], T["path"]]): HKTF.Apply<Delete, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    const path = args[0].path as readonly string[];
    if (path.length === 0) {
      return {} as HKTF.Apply<Delete, T>;
    }
    const result = { ...(args[0].obj as Record<string, unknown>) };
    if (path.length === 1) {
      delete result[path[0]!];
      return result as unknown as HKTF.Apply<Delete, T>;
    }
    let current: any = result;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i]!;
      if (!(key in current)) {
        return result as unknown as HKTF.Apply<Delete, T>;
      }
      current[key] = { ...current[key] };
      current = current[key];
    }
    delete current[path[path.length - 1]!];
    return result as unknown as HKTF.Apply<Delete, T>;
  }
  const path = args[1] as readonly string[];
  if (path.length === 0) {
    return {} as HKTF.Apply<Delete, T>;
  }
  const result = { ...(args[0] as Record<string, unknown>) };
  if (path.length === 1) {
    delete result[path[0]!];
    return result as unknown as HKTF.Apply<Delete, T>;
  }
  let current: any = result;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]!;
    if (!(key in current)) {
      return result as unknown as HKTF.Apply<Delete, T>;
    }
    current[key] = { ...current[key] };
    current = current[key];
  }
  delete current[path[path.length - 1]!];
  return result as unknown as HKTF.Apply<Delete, T>;
}
