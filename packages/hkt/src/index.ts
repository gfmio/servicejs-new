/**
 * @servicejs/hkt
 *
 * Meta-package that re-exports all HKT modules for convenience.
 *
 * For tree-shaking benefits, import from specific packages:
 * - @servicejs/hkt-core - Core types (HKTF, HKTO, Method, Util)
 * - @servicejs/hkt-arithmetic - Arithmetic operations
 * - @servicejs/hkt-boolean - Boolean operations
 * - @servicejs/hkt-string - String operations
 * - @servicejs/hkt-tuple - Tuple operations
 * - @servicejs/hkt-object - Object operations
 * - @servicejs/hkt-compose - Function composition
 * - @servicejs/hkt-combinator - HKTO combinators
 *
 * @example
 * ```typescript
 * // Import from meta-package (includes everything)
 * import { HKTF, HKTO, Method, ArithmeticHKTF } from '@servicejs/hkt';
 *
 * // Or import from specific packages (better tree-shaking)
 * import { HKTF } from '@servicejs/hkt-core';
 * import * as Arithmetic from '@servicejs/hkt-arithmetic';
 * ```
 */

// Re-export core (types and runtime)
export * as HKTF from "@servicejs/hkt-core";
export * as HKTO from "@servicejs/hkt-core";
export * as Method from "@servicejs/hkt-core";
export * as Util from "@servicejs/hkt-core";

// Re-export domain operations (types and runtime)
export * as ArithmeticHKTF from "@servicejs/hkt-arithmetic";
export * as BooleanHKTF from "@servicejs/hkt-boolean";
export * as StringHKTF from "@servicejs/hkt-string";
export * as TupleHKTF from "@servicejs/hkt-tuple";
export * as ObjectHKTF from "@servicejs/hkt-object";

// Re-export composition and combinators (types and runtime)
export * as Compose from "@servicejs/hkt-compose";
export * as Combinator from "@servicejs/hkt-combinator";

// Re-export errors from core
export * from "@servicejs/hkt-core";

