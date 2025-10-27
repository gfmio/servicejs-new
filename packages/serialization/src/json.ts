/**
 * JSON Serializer
 *
 * JSON-based message serialization using TextEncoder/TextDecoder.
 */

import { ok, err } from '@servicejs/result';
import type { Serializer } from './serializer.js';
import { serializationError } from './serializer.js';

/**
 * JSON serializer options
 */
export interface JsonSerializerOptions {
  /**
   * Custom replacer function for JSON.stringify
   */
  replacer?: (key: string, value: unknown) => unknown;

  /**
   * Custom reviver function for JSON.parse
   */
  reviver?: (key: string, value: unknown) => unknown;

  /**
   * Space parameter for JSON.stringify (for pretty printing)
   * Default: undefined (compact)
   */
  space?: string | number;
}

/**
 * Create a JSON serializer
 *
 * Uses JSON.stringify/parse with TextEncoder/TextDecoder for UTF-8 encoding.
 * This is a simple, portable serialization format that works everywhere.
 *
 * **Pros:**
 * - Universal browser/runtime support
 * - Human-readable format
 * - Easy debugging
 * - No external dependencies
 *
 * **Cons:**
 * - Larger size than binary formats
 * - Slower than binary formats
 * - Limited type support (no Date, Map, Set without custom replacer/reviver)
 *
 * @param options - Serializer options
 * @returns JSON serializer
 *
 * @example
 * ```typescript
 * const serializer = createJsonSerializer<Message>();
 *
 * const message = { type: 'test', value: 42 };
 * const encoded = serializer.serialize(message);
 *
 * if (encoded.success) {
 *   const bytes = encoded.value; // Uint8Array
 *   const decoded = serializer.deserialize(bytes);
 *   // decoded.value === message
 * }
 * ```
 */
export const createJsonSerializer = <T>(
  options: JsonSerializerOptions = {}
): Serializer<T> => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return {
    format: 'json',

    serialize(value: T) {
      try {
        const json = JSON.stringify(value, options.replacer, options.space);
        const bytes = encoder.encode(json);
        return ok(bytes);
      } catch (error) {
        return err(
          serializationError(
            `Failed to serialize value: ${error instanceof Error ? error.message : String(error)}`,
            'SERIALIZE_FAILED',
            error
          )
        );
      }
    },

    deserialize(data: Uint8Array) {
      try {
        const json = decoder.decode(data);
        const value = JSON.parse(json, options.reviver) as T;
        return ok(value);
      } catch (error) {
        return err(
          serializationError(
            `Failed to deserialize data: ${error instanceof Error ? error.message : String(error)}`,
            'DESERIALIZE_FAILED',
            error
          )
        );
      }
    },
  };
};

/**
 * Default JSON serializer instance
 *
 * A pre-configured JSON serializer for convenient use.
 *
 * @example
 * ```typescript
 * import { jsonSerializer } from '@servicejs/serialization';
 *
 * const result = jsonSerializer.serialize({ type: 'test' });
 * ```
 */
export const jsonSerializer = createJsonSerializer<unknown>();
