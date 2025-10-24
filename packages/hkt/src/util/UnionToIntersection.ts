import * as HKTF from '../hktf.js';

export interface UnionToIntersectionArgs {
  type: unknown;
}

export type UnionToIntersectionResult<T extends UnionToIntersectionArgs> = _UnionToIntersection<T['type']>;

/**
 * UnionToIntersection - converts a union type to an intersection type
 */
export interface UnionToIntersection extends HKTF.Base {
  [HKTF.ArgsSymbol]: UnionToIntersectionArgs;
  [HKTF.ResultSymbol]: UnionToIntersectionResult<HKTF.Args<this>>;
}

// Helper: Convert union to intersection
export type _UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;
