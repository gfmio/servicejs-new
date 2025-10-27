/**
 * MessagePack Serializer
 *
 * Binary serialization using MessagePack format.
 * Smaller and faster than JSON while maintaining ease of use.
 */

import { encode, decode } from '@msgpack/msgpack';
import { ok, err } from '@servicejs/result';
import type { Serializer } from './serializer.js';
import { serializationError } from './serializer.js';

/**
 * MessagePack serializer options
 */
export interface MessagePackSerializerOptions {
  /**
   * Maximum depth of nested objects/arrays
   * Default: 100
   */
  maxDepth?: number;

  /**
   * Initial buffer size for encoding
   * Default: 2048
   */
  initialBufferSize?: number;
}

/**
 * Create a MessagePack serializer
 *
 * MessagePack is a binary serialization format that's more compact and faster than JSON.
 * It maintains JSON's simplicity while providing better performance.
 *
 * **Pros:**
 * - 2-3x smaller than JSON
 * - 2-4x faster than JSON
 * - Universal runtime support
 * - Preserves types (binary data, dates)
 * - No schema required
 *
 * **Cons:**
 * - Not human-readable (binary format)
 * - Harder to debug than JSON
 * - Small runtime dependency
 *
 * @param options - Serializer options
 * @returns MessagePack serializer
 *
 * @example
 * ```typescript
 * const serializer = createMessagePackSerializer<Message>();
 *
 * const message = { type: 'test', value: 42, data: new Uint8Array([1, 2, 3]) };
 * const encoded = serializer.serialize(message);
 *
 * if (encoded.success) {
 *   const bytes = encoded.value; // Smaller than JSON!
 *   const decoded = serializer.deserialize(bytes);
 *   // decoded.value === message
 * }
 * ```
 */
export const createMessagePackSerializer = <T>(
  options: MessagePackSerializerOptions = {}
): Serializer<T> => {
  const maxDepth = options.maxDepth ?? 100;
  const initialBufferSize = options.initialBufferSize ?? 2048;

  return {
    format: 'messagepack',

    serialize(value: T) {
      try {
        const bytes = encode(value, { maxDepth, initialBufferSize });
        return ok(new Uint8Array(bytes));
      } catch (error) {
        return err(
          serializationError(
            `Failed to serialize with MessagePack: ${error instanceof Error ? error.message : String(error)}`,
            'SERIALIZE_FAILED',
            error
          )
        );
      }
    },

    deserialize(data: Uint8Array) {
      try {
        const value = decode(data) as T;
        return ok(value);
      } catch (error) {
        return err(
          serializationError(
            `Failed to deserialize MessagePack data: ${error instanceof Error ? error.message : String(error)}`,
            'DESERIALIZE_FAILED',
            error
          )
        );
      }
    },
  };
};

/**
 * Default MessagePack serializer instance
 *
 * A pre-configured MessagePack serializer for convenient use.
 *
 * @example
 * ```typescript
 * import { messagePackSerializer } from '@servicejs/serialization';
 *
 * const result = messagePackSerializer.serialize({ type: 'test' });
 * ```
 */
export const messagePackSerializer = createMessagePackSerializer<unknown>();
