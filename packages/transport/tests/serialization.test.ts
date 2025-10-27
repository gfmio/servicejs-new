/**
 * Tests for serialization
 */

import { describe, test, expect } from 'bun:test';
import { isOk, isErr } from '@servicejs/result';
import {
  createJsonSerializer,
  createStructuredCloneSerializer,
  type MessageEnvelope,
} from '../src/index.js';

describe('createJsonSerializer', () => {
  const serializer = createJsonSerializer();

  test('serializes simple message envelope', () => {
    const envelope: MessageEnvelope = {
      from: 'urn:test:sender',
      to: 'urn:test:receiver',
      message: { type: 'hello', data: 'world' },
    };

    const result = serializer.serialize(envelope);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(typeof result.value).toBe('string');
      expect(result.value).toContain('urn:test:sender');
    }
  });

  test('deserializes simple message envelope', () => {
    const envelope: MessageEnvelope = {
      from: 'urn:test:sender',
      to: 'urn:test:receiver',
      message: { type: 'hello', data: 'world' },
    };

    const serialized = JSON.stringify(envelope);
    const result = serializer.deserialize(serialized);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.from).toBe('urn:test:sender');
      expect(result.value.to).toBe('urn:test:receiver');
      expect(result.value.message.type).toBe('hello');
    }
  });

  test('round-trip serialization', () => {
    const envelope: MessageEnvelope = {
      from: 'urn:test:sender',
      to: 'urn:test:receiver',
      message: { type: 'hello', data: 'world' },
      correlationId: 'test-123',
      timestamp: Date.now(),
    };

    const serializeResult = serializer.serialize(envelope);
    expect(isOk(serializeResult)).toBe(true);

    if (isOk(serializeResult)) {
      const deserializeResult = serializer.deserialize(serializeResult.value);
      expect(isOk(deserializeResult)).toBe(true);

      if (isOk(deserializeResult)) {
        expect(deserializeResult.value.from).toBe(envelope.from);
        expect(deserializeResult.value.to).toBe(envelope.to);
        expect(deserializeResult.value.message).toEqual(envelope.message);
        expect(deserializeResult.value.correlationId).toBe(envelope.correlationId);
        expect(deserializeResult.value.timestamp).toBe(envelope.timestamp);
      }
    }
  });

  test('rejects invalid JSON', () => {
    const result = serializer.deserialize('invalid json{');

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('DESERIALIZATION_FAILED');
    }
  });

  test('rejects envelope without from', () => {
    const invalid = JSON.stringify({
      to: 'urn:test:receiver',
      message: { type: 'hello' },
    });

    const result = serializer.deserialize(invalid);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('INVALID_MESSAGE');
    }
  });

  test('rejects envelope without to', () => {
    const invalid = JSON.stringify({
      from: 'urn:test:sender',
      message: { type: 'hello' },
    });

    const result = serializer.deserialize(invalid);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('INVALID_MESSAGE');
    }
  });

  test('rejects envelope without message', () => {
    const invalid = JSON.stringify({
      from: 'urn:test:sender',
      to: 'urn:test:receiver',
    });

    const result = serializer.deserialize(invalid);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('INVALID_MESSAGE');
    }
  });

  test('rejects envelope with invalid message', () => {
    const invalid = JSON.stringify({
      from: 'urn:test:sender',
      to: 'urn:test:receiver',
      message: 'not an object',
    });

    const result = serializer.deserialize(invalid);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('INVALID_MESSAGE');
    }
  });

  test('handles complex message data', () => {
    const envelope: MessageEnvelope = {
      from: 'urn:test:sender',
      to: 'urn:test:receiver',
      message: {
        type: 'complex',
        data: {
          nested: {
            array: [1, 2, 3],
            string: 'test',
            boolean: true,
            null: null,
          },
        },
      },
    };

    const serializeResult = serializer.serialize(envelope);
    expect(isOk(serializeResult)).toBe(true);

    if (isOk(serializeResult)) {
      const deserializeResult = serializer.deserialize(serializeResult.value);
      expect(isOk(deserializeResult)).toBe(true);

      if (isOk(deserializeResult)) {
        expect(deserializeResult.value.message).toEqual(envelope.message);
      }
    }
  });
});

describe('createStructuredCloneSerializer', () => {
  const serializer = createStructuredCloneSerializer();

  test('serializes and deserializes basic envelope', () => {
    const envelope: MessageEnvelope = {
      from: 'urn:test:sender',
      to: 'urn:test:receiver',
      message: { type: 'hello', data: 'world' },
    };

    const serializeResult = serializer.serialize(envelope);
    expect(isOk(serializeResult)).toBe(true);

    if (isOk(serializeResult)) {
      const deserializeResult = serializer.deserialize(serializeResult.value);
      expect(isOk(deserializeResult)).toBe(true);

      if (isOk(deserializeResult)) {
        expect(deserializeResult.value.from).toBe(envelope.from);
        expect(deserializeResult.value.to).toBe(envelope.to);
        expect(deserializeResult.value.message).toEqual(envelope.message);
      }
    }
  });

  test('handles Date objects (converts to ISO string)', () => {
    const now = new Date();
    const envelope: MessageEnvelope = {
      from: 'urn:test:sender',
      to: 'urn:test:receiver',
      message: { type: 'timestamp', timestamp: now },
    };

    const serializeResult = serializer.serialize(envelope);
    expect(isOk(serializeResult)).toBe(true);

    if (isOk(serializeResult)) {
      const deserializeResult = serializer.deserialize(serializeResult.value);
      expect(isOk(deserializeResult)).toBe(true);

      if (isOk(deserializeResult)) {
        const message = deserializeResult.value.message as { type: string; timestamp: string };
        // Note: JSON converts Dates to ISO strings
        expect(typeof message.timestamp).toBe('string');
        expect(new Date(message.timestamp).getTime()).toBe(now.getTime());
      }
    }
  });

  test('rejects invalid envelope structure', () => {
    const invalid = JSON.stringify({
      from: 'urn:test:sender',
      // Missing 'to' and 'message'
    });

    const result = serializer.deserialize(invalid);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('INVALID_MESSAGE');
    }
  });
});
