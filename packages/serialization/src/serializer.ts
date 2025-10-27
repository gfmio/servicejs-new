/**
 * Message Serialization
 *
 * Generic interface for serializing messages to/from wire format.
 */

import type { Result } from '@servicejs/result';

/**
 * Serialization error
 */
export interface SerializationError {
  /** Error message */
  readonly message: string;
  /** Error code */
  readonly code: 'SERIALIZE_FAILED' | 'DESERIALIZE_FAILED' | 'INVALID_DATA';
  /** Original error if available */
  readonly cause?: unknown;
}

/**
 * Generic serializer interface
 *
 * Serializers convert values to/from wire format (Uint8Array).
 * This abstraction allows pluggable serialization formats (JSON, MessagePack, Cap'n Proto, etc.)
 *
 * @typeParam T - The type of value to serialize/deserialize
 *
 * @example
 * ```typescript
 * const serializer: Serializer<Message> = createJsonSerializer();
 *
 * // Serialize
 * const encoded = serializer.serialize({ type: 'test', value: 42 });
 * if (encoded.success) {
 *   // Send encoded.value over network
 * }
 *
 * // Deserialize
 * const decoded = serializer.deserialize(bytes);
 * if (decoded.success) {
 *   console.log('Message:', decoded.value);
 * }
 * ```
 */
export interface Serializer<T> {
  /**
   * Serialize a value to bytes
   *
   * @param value - The value to serialize
   * @returns Result with serialized bytes or error
   */
  serialize(value: T): Result<Uint8Array, SerializationError>;

  /**
   * Deserialize bytes to a value
   *
   * @param data - The bytes to deserialize
   * @returns Result with deserialized value or error
   */
  deserialize(data: Uint8Array): Result<T, SerializationError>;

  /**
   * Optional: Name of the serialization format (e.g., 'json', 'capnp')
   */
  readonly format?: string;
}

/**
 * Create a serialization error
 */
export const serializationError = (
  message: string,
  code: SerializationError['code'],
  cause?: unknown
): SerializationError => ({
  message,
  code,
  cause,
});
