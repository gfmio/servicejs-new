/**
 * Cap'n Proto Generated Classes Integration
 *
 * These wrappers use generated TypeScript code from capnp-codegen
 * for optimal performance with direct memory access.
 */

import { ok, err } from '@servicejs/result';
import type { Serializer } from './serializer.js';
import { serializationError } from './serializer.js';
import { createSegment } from './capnp/encoding.js';
import { pack, unpack } from './capnp/packed.js';
import { SimpleMessage } from './capnp-generated/SimpleMessage.js';
import { ComplexMessage } from './capnp-generated/ComplexMessage.js';
import { LargeMessage } from './capnp-generated/LargeMessage.js';

/**
 * Simple message serializer (generated)
 */
export interface SimpleMessageData {
  id: number;
  name: string;
  active: boolean;
  score: number;
}

export const simpleMessageGeneratedSerializer = (): Serializer<SimpleMessageData> => ({
  serialize: (value: SimpleMessageData) => {
    try {
      const segment = createSegment(1024);
      const offset = SimpleMessage.serialize(segment, value);
      const result = new Uint8Array(segment.data.buffer, 0, segment.position);
      return ok(result);
    } catch (error) {
      return err(serializationError('Cap\'n Proto (Generated) serialization failed', error));
    }
  },

  deserialize: (data: Uint8Array) => {
    try {
      const segment = { data: new DataView(data.buffer, data.byteOffset, data.byteLength), position: data.byteLength };
      const result = SimpleMessage.deserialize(segment, 0);
      return ok(result as SimpleMessageData);
    } catch (error) {
      return err(serializationError('Cap\'n Proto (Generated) deserialization failed', error));
    }
  },
});

/**
 * Complex message serializer (generated)
 */
export interface ComplexMessageData {
  id: number;
  timestamp: number;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  tags: string[];
  metadata: {
    source: string;
    priority: number;
    flags: boolean[];
  };
}

export const complexMessageGeneratedSerializer = (): Serializer<ComplexMessageData> => ({
  serialize: (value: ComplexMessageData) => {
    try {
      const segment = createSegment(4096);
      const offset = ComplexMessage.serialize(segment, value);
      const result = new Uint8Array(segment.data.buffer, 0, segment.position);
      return ok(result);
    } catch (error) {
      return err(serializationError('Cap\'n Proto (Generated) serialization failed', error));
    }
  },

  deserialize: (data: Uint8Array) => {
    try {
      const segment = { data: new DataView(data.buffer, data.byteOffset, data.byteLength), position: data.byteLength };
      const result = ComplexMessage.deserialize(segment, 0);
      return ok(result as ComplexMessageData);
    } catch (error) {
      return err(serializationError('Cap\'n Proto (Generated) deserialization failed', error));
    }
  },
});

/**
 * Large message serializer (generated)
 */
export interface LargeMessageData {
  id: number;
  coordinates: number[];
  labels: string[];
  matrix: number[][];
}

export const largeMessageGeneratedSerializer = (): Serializer<LargeMessageData> => ({
  serialize: (value: LargeMessageData) => {
    try {
      const segment = createSegment(65536); // Larger initial size for big messages
      const offset = LargeMessage.serialize(segment, value);
      const result = new Uint8Array(segment.data.buffer, 0, segment.position);
      return ok(result);
    } catch (error) {
      return err(serializationError('Cap\'n Proto (Generated) serialization failed', error));
    }
  },

  deserialize: (data: Uint8Array) => {
    try {
      const segment = { data: new DataView(data.buffer, data.byteOffset, data.byteLength), position: data.byteLength };
      const result = LargeMessage.deserialize(segment, 0);
      return ok(result as LargeMessageData);
    } catch (error) {
      return err(serializationError('Cap\'n Proto (Generated) deserialization failed', error));
    }
  },
});

// ============================================================================
// Packed Encoding Variants (Generated + Packed)
// ============================================================================

/**
 * Simple message serializer (generated + packed)
 */
export const simpleMessageGeneratedPackedSerializer = (): Serializer<SimpleMessageData> => ({
  serialize: (value: SimpleMessageData) => {
    try {
      const segment = createSegment(1024);
      const offset = SimpleMessage.serialize(segment, value);
      const unpacked = new Uint8Array(segment.data.buffer, 0, segment.position);
      const packed = pack(unpacked);
      return ok(packed);
    } catch (error) {
      return err(serializationError('Cap\'n Proto (Generated + Packed) serialization failed', error));
    }
  },

  deserialize: (data: Uint8Array) => {
    try {
      const unpacked = unpack(data);
      const segment = { data: new DataView(unpacked.buffer, unpacked.byteOffset, unpacked.byteLength), position: unpacked.byteLength };
      const result = SimpleMessage.deserialize(segment, 0);
      return ok(result as SimpleMessageData);
    } catch (error) {
      return err(serializationError('Cap\'n Proto (Generated + Packed) deserialization failed', error));
    }
  },
});

/**
 * Complex message serializer (generated + packed)
 */
export const complexMessageGeneratedPackedSerializer = (): Serializer<ComplexMessageData> => ({
  serialize: (value: ComplexMessageData) => {
    try {
      const segment = createSegment(4096);
      const offset = ComplexMessage.serialize(segment, value);
      const unpacked = new Uint8Array(segment.data.buffer, 0, segment.position);
      const packed = pack(unpacked);
      return ok(packed);
    } catch (error) {
      return err(serializationError('Cap\'n Proto (Generated + Packed) serialization failed', error));
    }
  },

  deserialize: (data: Uint8Array) => {
    try {
      const unpacked = unpack(data);
      const segment = { data: new DataView(unpacked.buffer, unpacked.byteOffset, unpacked.byteLength), position: unpacked.byteLength };
      const result = ComplexMessage.deserialize(segment, 0);
      return ok(result as ComplexMessageData);
    } catch (error) {
      return err(serializationError('Cap\'n Proto (Generated + Packed) deserialization failed', error));
    }
  },
});

/**
 * Large message serializer (generated + packed)
 */
export const largeMessageGeneratedPackedSerializer = (): Serializer<LargeMessageData> => ({
  serialize: (value: LargeMessageData) => {
    try {
      const segment = createSegment(65536); // Larger initial size for big messages
      const offset = LargeMessage.serialize(segment, value);
      const unpacked = new Uint8Array(segment.data.buffer, 0, segment.position);
      const packed = pack(unpacked);
      return ok(packed);
    } catch (error) {
      return err(serializationError('Cap\'n Proto (Generated + Packed) serialization failed', error));
    }
  },

  deserialize: (data: Uint8Array) => {
    try {
      const unpacked = unpack(data);
      const segment = { data: new DataView(unpacked.buffer, unpacked.byteOffset, unpacked.byteLength), position: unpacked.byteLength };
      const result = LargeMessage.deserialize(segment, 0);
      return ok(result as LargeMessageData);
    } catch (error) {
      return err(serializationError('Cap\'n Proto (Generated + Packed) deserialization failed', error));
    }
  },
});
