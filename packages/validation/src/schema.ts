/**
 * Message Schema
 *
 * Generic schema interface for runtime message validation.
 */

import type { Result, Err } from '@servicejs/result';
import { ok, err, isOk } from '@servicejs/result';

/**
 * Schema validation error
 */
export interface SchemaError {
  /** Error message */
  readonly message: string;
  /** Optional path to the field with error */
  readonly path?: readonly (string | number)[];
  /** Optional error code */
  readonly code?: string;
  /** Optional additional context */
  readonly context?: unknown;
}

/**
 * Generic message schema interface
 *
 * Provides runtime validation for messages with a type-safe API.
 */
export interface MessageSchema<T> {
  /**
   * Validate a message (safe, returns Result)
   *
   * @param value - Value to validate
   * @returns Ok with typed value or Err with validation errors
   */
  validate(value: unknown): Result<T, readonly SchemaError[]>;

  /**
   * Parse a message (unsafe, throws on error)
   *
   * @param value - Value to parse
   * @returns Typed value
   * @throws {SchemaValidationError} If validation fails
   */
  parse(value: unknown): T;

  /**
   * Optional: Get the TypeScript type as a string (for debugging)
   */
  readonly typeName?: string;
}

/**
 * Schema validation error (thrown by parse)
 */
export class SchemaValidationError extends Error {
  readonly errors: readonly SchemaError[];

  constructor(errors: readonly SchemaError[]) {
    const message = `Schema validation failed with ${errors.length} error(s):\n${errors
      .map((e) => `  - ${e.path ? e.path.join('.') + ': ' : ''}${e.message}`)
      .join('\n')}`;
    super(message);
    this.name = 'SchemaValidationError';
    this.errors = errors;
  }
}

/**
 * Helper to create a simple predicate-based schema
 */
export const createPredicateSchema = <T>(
  predicate: (value: unknown) => value is T,
  errorMessage: string = 'Validation failed'
): MessageSchema<T> => {
  return {
    validate(value: unknown): Result<T, readonly SchemaError[]> {
      if (predicate(value)) {
        return ok(value);
      }
      return err([{ message: errorMessage }]);
    },

    parse(value: unknown): T {
      if (predicate(value)) {
        return value;
      }
      throw new SchemaValidationError([{ message: errorMessage }]);
    },
  };
};

/**
 * Helper to create a schema from a validation function
 */
export const createSchema = <T>(
  validate: (value: unknown) => Result<T, readonly SchemaError[]>,
  typeName?: string
): MessageSchema<T> => {
  return {
    validate,

    parse(value: unknown): T {
      const result = validate(value);
      if (isOk(result)) {
        return result.value;
      }
      throw new SchemaValidationError((result as Err<readonly SchemaError[]>).error);
    },

    ...(typeName !== undefined ? { typeName } : {}),
  };
};
