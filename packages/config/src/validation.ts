import { err, isErr, isOk, ok, type Result } from '@servicejs/result';
import { z, type ZodError, type ZodSchema } from 'zod';

/**
 * Validation error that wraps Zod validation errors.
 */
export interface ValidationError {
  readonly message: string;
  readonly errors: Array<{
    readonly path: string[];
    readonly message: string;
  }>;
  readonly cause: ZodError;
}

/**
 * Validates a configuration object against a Zod schema.
 *
 * @param config - Configuration object to validate
 * @param schema - Zod schema to validate against
 * @returns Result containing validated config or validation error
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import { validate } from '@servicejs/config';
 *
 * const schema = z.object({
 *   port: z.number().int().positive(),
 *   host: z.string(),
 * });
 *
 * const result = validate(config, schema);
 * if (result.ok) {
 *   console.log('Valid config:', result.value);
 * } else {
 *   console.error('Validation errors:', result.error.errors);
 * }
 * ```
 */
export const validate = <T>(
  config: unknown,
  schema: ZodSchema<T>
): Result<T, ValidationError> => {
  const result = schema.safeParse(config);

  if (result.success) {
    return ok(result.data);
  }

  const errors = result.error.errors.map((error) => ({
    path: error.path.map(String),
    message: error.message,
  }));

  return err({
    message: `Configuration validation failed with ${errors.length} error(s)`,
    errors,
    cause: result.error,
  });
};

/**
 * Creates a validation function for a given schema.
 * Useful for creating reusable validators.
 *
 * @param schema - Zod schema to validate against
 * @returns Validation function
 *
 * @example
 * ```typescript
 * const validateConfig = createValidator(mySchema);
 * const result = validateConfig(config);
 * ```
 */
export const createValidator = <T>(schema: ZodSchema<T>) => {
  return (config: unknown): Result<T, ValidationError> => {
    return validate(config, schema);
  };
};

/**
 * Validates and transforms a configuration object.
 * This combines parsing, validation, and optional transformation in one step.
 *
 * @param config - Configuration object to validate
 * @param schema - Zod schema to validate against
 * @param transform - Optional transformation function to apply to validated config
 * @returns Result containing transformed config or validation error
 */
export const validateAndTransform = <T, U = T>(
  config: unknown,
  schema: ZodSchema<T>,
  transform?: (config: T) => U
): Result<U, ValidationError> => {
  const validationResult = validate(config, schema);

  if (isErr(validationResult)) {
    return validationResult as Result<U, ValidationError>;
  }

  // TypeScript now knows validationResult is Ok
  if (isOk(validationResult)) {
    const transformed = transform
      ? transform(validationResult.value)
      : (validationResult.value as unknown as U);

    return ok(transformed);
  }

  // This should never be reached, but TypeScript needs it
  throw new Error('Unreachable code');
};

/**
 * Common schema helpers for configuration validation.
 */
export const schemas = {
  /**
   * Port number schema (1-65535).
   */
  port: z.number().int().min(1).max(65535),

  /**
   * Host schema (string, non-empty).
   */
  host: z.string().min(1),

  /**
   * URL schema.
   */
  url: z.string().url(),

  /**
   * Email schema.
   */
  email: z.string().email(),

  /**
   * Environment schema (development, production, test).
   */
  environment: z.enum(['development', 'production', 'test']),

  /**
   * Log level schema.
   */
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']),

  /**
   * Positive integer schema.
   */
  positiveInt: z.number().int().positive(),

  /**
   * Non-negative integer schema.
   */
  nonNegativeInt: z.number().int().nonnegative(),

  /**
   * Non-empty string schema.
   */
  nonEmptyString: z.string().min(1),

  /**
   * Boolean string schema (converts 'true'/'false' to boolean).
   */
  booleanString: z
    .string()
    .transform((val) => val.toLowerCase() === 'true')
    .pipe(z.boolean()),

  /**
   * Number string schema (converts string to number).
   */
  numberString: z.string().transform(Number).pipe(z.number()),

  /**
   * JSON string schema (parses JSON string to object).
   */
  jsonString: z.string().transform((str, ctx) => {
    try {
      return JSON.parse(str);
    } catch (e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid JSON string',
      });
      return z.NEVER;
    }
  }),
};

/**
 * Creates a schema that allows environment variable strings to be coerced to the target type.
 * Useful when configuration comes from environment variables (which are always strings).
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   port: coerceFromEnv(z.number()),  // Accepts "3000" and converts to 3000
 *   enabled: coerceFromEnv(z.boolean()), // Accepts "true" and converts to true
 * });
 * ```
 */
export const coerceFromEnv = <T extends z.ZodTypeAny>(schema: T): z.ZodEffects<T> => {
  return z.preprocess((val) => {
    if (typeof val !== 'string') {
      return val;
    }

    // Try to parse as JSON first (handles numbers, booleans, arrays, objects)
    try {
      return JSON.parse(val);
    } catch {
      // If JSON parsing fails, return the string as-is
      return val;
    }
  }, schema);
};
