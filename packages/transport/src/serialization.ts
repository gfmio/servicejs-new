/**
 * Serialization and Deserialization
 *
 * Handles converting messages to/from wire format for transport.
 */

import type { Message } from '@servicejs/core';
import type { Result } from '@servicejs/result';
import { ok, err } from '@servicejs/result';
import type { MessageEnvelope, TransportError } from './transport.js';

/**
 * Serializer interface
 *
 * Converts messages to a serialized format for transmission.
 */
export interface Serializer {
  /**
   * Serialize a message envelope to a transmittable format
   *
   * @param envelope - Message envelope to serialize
   * @returns Serialized data or error
   */
  serialize(envelope: MessageEnvelope): Result<string, TransportError>;

  /**
   * Deserialize data back to a message envelope
   *
   * @param data - Serialized data to deserialize
   * @returns Message envelope or error
   */
  deserialize(data: string): Result<MessageEnvelope, TransportError>;
}

/**
 * JSON serializer
 *
 * Uses JSON.stringify/parse for serialization.
 * Simple and compatible but doesn't handle special types (Date, Map, Set, etc.)
 */
export const createJsonSerializer = (): Serializer => {
  return {
    serialize: (envelope: MessageEnvelope): Result<string, TransportError> => {
      try {
        const serialized = JSON.stringify(envelope);
        return ok(serialized);
      } catch (error) {
        return err({
          type: 'SERIALIZATION_FAILED',
          message: envelope.message,
          error,
        });
      }
    },

    deserialize: (data: string): Result<MessageEnvelope, TransportError> => {
      try {
        const parsed = JSON.parse(data) as unknown;

        // Validate envelope structure
        if (!isMessageEnvelope(parsed)) {
          return err({
            type: 'INVALID_MESSAGE',
            data: parsed,
            reason: 'Missing required envelope fields (from, to, message)',
          });
        }

        return ok(parsed);
      } catch (error) {
        return err({
          type: 'DESERIALIZATION_FAILED',
          data,
          error,
        });
      }
    },
  };
};

/**
 * Type guard for MessageEnvelope
 */
const isMessageEnvelope = (value: unknown): value is MessageEnvelope => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const envelope = value as Record<string, unknown>;

  return (
    typeof envelope.from === 'string' &&
    typeof envelope.to === 'string' &&
    typeof envelope.message === 'object' &&
    envelope.message !== null &&
    typeof (envelope.message as Message).type === 'string'
  );
};

/**
 * Structured clone serializer
 *
 * Uses the structuredClone algorithm for serialization.
 * Handles more types (Date, Map, Set, ArrayBuffer, etc.) but only works in environments
 * that support structuredClone (modern browsers, Node 17+, Deno, Bun).
 */
export const createStructuredCloneSerializer = (): Serializer => {
  return {
    serialize: (envelope: MessageEnvelope): Result<string, TransportError> => {
      try {
        // First clone to validate it's cloneable
        const cloned = structuredClone(envelope);
        // Then stringify for transport
        const serialized = JSON.stringify(cloned);
        return ok(serialized);
      } catch (error) {
        return err({
          type: 'SERIALIZATION_FAILED',
          message: envelope.message,
          error,
        });
      }
    },

    deserialize: (data: string): Result<MessageEnvelope, TransportError> => {
      try {
        const parsed = JSON.parse(data) as unknown;

        // Validate envelope structure
        if (!isMessageEnvelope(parsed)) {
          return err({
            type: 'INVALID_MESSAGE',
            data: parsed,
            reason: 'Missing required envelope fields (from, to, message)',
          });
        }

        // Use structuredClone to restore special types
        const cloned = structuredClone(parsed);
        return ok(cloned);
      } catch (error) {
        return err({
          type: 'DESERIALIZATION_FAILED',
          data,
          error,
        });
      }
    },
  };
};

/**
 * Default serializer
 *
 * Uses JSON serialization by default for maximum compatibility.
 */
export const createSerializer = createJsonSerializer;
