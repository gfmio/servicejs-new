/**
 * @servicejs/validation
 *
 * Validation type with error accumulation for ServiceJS.
 *
 * This package provides a Validation type similar to Either/Result, but with
 * a key difference: it accumulates ALL errors instead of short-circuiting on
 * the first error. This is ideal for form validation and other scenarios where
 * you want to collect all validation failures.
 *
 * @example
 * ```typescript
 * import { success, failure, all, fromPredicates } from '@servicejs/validation';
 *
 * // Validate with multiple predicates
 * const validateAge = (age: number) => fromPredicates(age, [
 *   [x => x >= 0, 'Age must be non-negative'],
 *   [x => x <= 120, 'Age must be realistic'],
 *   [x => Number.isInteger(x), 'Age must be an integer'],
 * ]);
 *
 * // Accumulate errors from multiple validations
 * const result = all([
 *   validateName(user.name),
 *   validateEmail(user.email),
 *   validateAge(user.age),
 * ]);
 *
 * // result is Success([name, email, age]) or Failure([...all errors])
 * ```
 */

export type {
  Validation,
  Success as SuccessType,
  Failure as FailureType,
} from './types.js';

export {
  Success,
  Failure,
  success,
  failure,
  failures,
  isSuccess,
  isFailure,
  map,
  mapError,
  andThen,
  orElse,
  fold,
  getOrElse,
  getOrElseWith,
  all,
  fromPredicate,
  fromPredicates,
  tryCatch,
  partition,
  traverse,
  sequence,
} from './validation.js';

// Schema validation
export type { MessageSchema, SchemaError } from './schema.js';
export {
  SchemaValidationError,
  createSchema,
  createPredicateSchema,
} from './schema.js';

// Zod integration
export { createZodSchema, isZodType } from './zod.js';

// Validated capabilities
export {
  withValidation,
  withValidationFilter,
  withValidationTransform,
} from './capability.js';
