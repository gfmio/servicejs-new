/**
 * @servicejs/serialization
 *
 * Message serialization for ServiceJS transport layer.
 *
 * This package provides:
 * - Generic Serializer interface
 * - JSON serializer implementation
 * - Pluggable serialization for different wire formats
 *
 * @example
 * ```typescript
 * import { createJsonSerializer } from '@servicejs/serialization';
 *
 * const serializer = createJsonSerializer<MyMessage>();
 *
 * // Serialize
 * const encoded = serializer.serialize({ type: 'test', value: 42 });
 * if (encoded.success) {
 *   // Send encoded.value (Uint8Array) over network
 * }
 *
 * // Deserialize
 * const decoded = serializer.deserialize(bytes);
 * if (decoded.success) {
 *   console.log('Received:', decoded.value);
 * }
 * ```
 */

// Serializer interface
export type { Serializer, SerializationError } from './serializer.js';
export { serializationError } from './serializer.js';

// JSON serializer
export type { JsonSerializerOptions } from './json.js';
export { createJsonSerializer, jsonSerializer } from './json.js';

// MessagePack serializer
export type { MessagePackSerializerOptions } from './msgpack.js';
export { createMessagePackSerializer, messagePackSerializer } from './msgpack.js';

// FlatBuffers serializer
export type {
  FlatBuffersSchema,
  FlatBuffersSerializerOptions,
  DynamicFieldType,
  DynamicField,
  DynamicSchemaConfig,
} from './flatbuffers.js';
export {
  createFlatBuffersSerializer,
  createDynamicFlatBuffersSchema,
} from './flatbuffers.js';

// Cap'n Proto serializer
export type { CapnpSchema, CapnpField } from './capnp.js';
export {
  createCapnpSchema,
  createCapnpSerializer,
  generateTypeScriptCode,
  parseCapnpSchema,
} from './capnp.js';
