/**
 * HKTF (Higher-Kinded Type Functions)
 *
 * Type-level functions that take type arguments and return types.
 * These are the foundation for all HKT operations in ServiceJS.
 */

/**
 * Unique symbols for HKTF properties
 */
export declare const ArgsSymbol: unique symbol;
export declare const DefaultsSymbol: unique symbol;
export declare const ResultSymbol: unique symbol;

/**
 * Base interface for type-level functions
 */
export interface Base {
  [ArgsSymbol]: unknown;
  [DefaultsSymbol]?: unknown;
  [ResultSymbol]: unknown;
}

/**
 * Extract merged args (defaults + provided)
 */
export type Args<F extends Base> = F extends { [DefaultsSymbol]: infer D }
  ? F[typeof ArgsSymbol] & D
  : F[typeof ArgsSymbol];

/**
 * Partial application - updates/overwrites defaults
 */
export type PartialApply<F extends Base, NewDefaults> = F & {
  [DefaultsSymbol]: F extends { [DefaultsSymbol]: infer D }
    ? D & NewDefaults
    : NewDefaults;
};

/**
 * Extract the result type
 */
export type Result<F extends Base> = F[typeof ResultSymbol];

/**
 * Apply a type-level function
 */
export type Apply<
  F extends Base,
  Input extends Partial<F[typeof ArgsSymbol]>
> = Result<PartialApply<F, Input>>;

/**
 * Convert HKTF to runtime function signature
 *
 * This allows deriving runtime function types from type-level definitions.
 *
 * @example
 * ```typescript
 * interface SomeHKTF extends HKTF.Base {
 *   [ArgsSymbol]: { value: unknown };
 *   [ResultSymbol]: Option<Args<this>['value']>;
 * }
 *
 * type SomeFn = ToFunction<SomeHKTF>;
 * // Result: <T>(args: { value: T }) => Option<T>
 * ```
 */
export type ToFunction<F extends Base> = <
  Input extends F[typeof ArgsSymbol]
>(
  args: Input
) => Result<PartialApply<F, Input>>;
