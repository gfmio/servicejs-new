/**
 * Validated Capabilities
 *
 * Capability wrappers that enforce schema validation on messages.
 */

import type { Capability, Message } from '@servicejs/core';
import type { MessageSchema, SchemaError } from './schema.js';
import { SchemaValidationError } from './schema.js';
import { isOk, type Err } from '@servicejs/result';

/**
 * Wrap a capability with schema validation.
 *
 * Creates a new capability that validates messages against a schema before
 * forwarding them to the target capability. If validation fails, throws
 * SchemaValidationError.
 *
 * This provides runtime type safety for message passing, ensuring only valid
 * messages reach the component.
 *
 * @param capability - The target capability to wrap
 * @param schema - The schema to validate messages against
 * @returns A new capability that validates messages before sending
 * @throws {SchemaValidationError} If a message fails validation
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import { createZodSchema, withValidation } from '@servicejs/validation';
 * import { createCapability } from '@servicejs/core';
 *
 * // Define schema
 * const CounterMessageSchema = createZodSchema(
 *   z.discriminatedUnion('type', [
 *     z.object({ type: z.literal('increment'), amount: z.number().int().positive() }),
 *     z.object({ type: z.literal('reset') }),
 *   ])
 * );
 *
 * // Create validated capability
 * const rawCap = createCapability((msg) => console.log(msg));
 * const validatedCap = withValidation(rawCap, CounterMessageSchema);
 *
 * // Valid message - works
 * validatedCap.send({ type: 'increment', amount: 5 });
 *
 * // Invalid message - throws SchemaValidationError
 * validatedCap.send({ type: 'increment', amount: -5 });
 * ```
 */
export function withValidation<TMsg extends Message>(
  capability: Capability<TMsg>,
  schema: MessageSchema<TMsg>
): Capability<TMsg> {
  return {
    send(message: TMsg): void {
      const result = schema.validate(message);
      if (isOk(result)) {
        capability.send(result.value);
      } else {
        throw new SchemaValidationError((result as Err<readonly SchemaError[]>).error);
      }
    },
  };
}

/**
 * Wrap a capability with schema validation that silently drops invalid messages.
 *
 * Similar to `withValidation`, but instead of throwing errors on invalid messages,
 * it silently drops them. This is useful for defensive programming where you want
 * to filter out malformed messages without crashing.
 *
 * @param capability - The target capability to wrap
 * @param schema - The schema to validate messages against
 * @param onError - Optional callback for logging validation errors
 * @returns A new capability that filters invalid messages
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import { createZodSchema, withValidationFilter } from '@servicejs/validation';
 * import { createCapability } from '@servicejs/core';
 *
 * const schema = createZodSchema(z.object({ type: z.literal('test') }));
 * const cap = createCapability((msg) => console.log('Received:', msg));
 *
 * const filtered = withValidationFilter(cap, schema, (errors) => {
 *   console.error('Invalid message:', errors);
 * });
 *
 * filtered.send({ type: 'test' }); // Forwards
 * filtered.send({ type: 'invalid' }); // Dropped silently, error logged
 * ```
 */
export function withValidationFilter<TMsg extends Message>(
  capability: Capability<TMsg>,
  schema: MessageSchema<TMsg>,
  onError?: (errors: readonly SchemaError[]) => void
): Capability<TMsg> {
  return {
    send(message: TMsg): void {
      const result = schema.validate(message);
      if (isOk(result)) {
        capability.send(result.value);
      } else if (onError) {
        onError((result as Err<readonly SchemaError[]>).error);
      }
    },
  };
}

/**
 * Create a capability that validates and transforms messages.
 *
 * Combines validation with transformation. The schema can include refinements
 * and transforms (e.g., with Zod's `.transform()`), and the validated + transformed
 * message is forwarded to the capability.
 *
 * This is useful for normalizing messages before processing.
 *
 * @param capability - The target capability
 * @param schema - The schema that validates and transforms messages
 * @returns A new capability that validates and transforms messages
 * @throws {SchemaValidationError} If validation fails
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import { createZodSchema, withValidationTransform } from '@servicejs/validation';
 *
 * // Schema that normalizes email to lowercase
 * const schema = createZodSchema(
 *   z.object({
 *     type: z.literal('register'),
 *     email: z.string().email().transform(s => s.toLowerCase()),
 *   })
 * );
 *
 * const cap = createCapability((msg) => console.log(msg));
 * const normalized = withValidationTransform(cap, schema);
 *
 * normalized.send({ type: 'register', email: 'USER@EXAMPLE.COM' });
 * // Forwards: { type: 'register', email: 'user@example.com' }
 * ```
 */
export function withValidationTransform<TMsg extends Message, UMsg extends Message = TMsg>(
  capability: Capability<UMsg>,
  schema: MessageSchema<UMsg>
): Capability<TMsg> {
  return {
    send(message: TMsg): void {
      const result = schema.validate(message as unknown);
      if (isOk(result)) {
        capability.send(result.value);
      } else {
        throw new SchemaValidationError((result as Err<readonly SchemaError[]>).error);
      }
    },
  };
}
