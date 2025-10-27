/**
 * Zod Schema Integration
 *
 * Adapts Zod schemas to the MessageSchema interface.
 */

import type { z } from 'zod';
import { ok, err } from '@servicejs/result';
import type { MessageSchema, SchemaError } from './schema.js';
import { SchemaValidationError } from './schema.js';

/**
 * Convert Zod error to SchemaError format
 */
const zodErrorToSchemaErrors = (zodError: z.ZodError): readonly SchemaError[] => {
  return zodError.errors.map((issue) => ({
    message: issue.message,
    path: issue.path,
    code: issue.code,
    context: issue,
  }));
};

/**
 * Create a MessageSchema from a Zod schema
 *
 * @param zodSchema - Zod schema instance
 * @param typeName - Optional type name for debugging
 * @returns MessageSchema that validates using the Zod schema
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import { createZodSchema } from '@servicejs/validation';
 *
 * const UserSchema = createZodSchema(
 *   z.object({
 *     type: z.literal('user'),
 *     name: z.string().min(1),
 *     email: z.string().email(),
 *     age: z.number().int().min(0).max(120),
 *   }),
 *   'User'
 * );
 *
 * // Safe validation
 * const result = UserSchema.validate(message);
 * if (result.success) {
 *   const user = result.value; // Typed!
 * }
 *
 * // Throws on error
 * const user = UserSchema.parse(message);
 * ```
 */
export const createZodSchema = <T extends z.ZodType>(
  zodSchema: T,
  typeName?: string
): MessageSchema<z.infer<T>> => {
  return {
    validate(value: unknown) {
      const result = zodSchema.safeParse(value);
      if (result.success) {
        return ok(result.data);
      }
      return err(zodErrorToSchemaErrors(result.error));
    },

    parse(value: unknown): z.infer<T> {
      try {
        return zodSchema.parse(value);
      } catch (error) {
        if (error instanceof Error && 'errors' in error) {
          const zodError = error as z.ZodError;
          throw new SchemaValidationError(zodErrorToSchemaErrors(zodError));
        }
        throw error;
      }
    },

    ...(typeName !== undefined ? { typeName } : {}),
  };
};

/**
 * Type guard to check if a value matches a Zod schema
 */
export const isZodType = <T extends z.ZodType>(
  schema: T,
  value: unknown
): value is z.infer<T> => {
  return schema.safeParse(value).success;
};
