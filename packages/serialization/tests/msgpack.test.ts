import { describe, it, expect } from 'bun:test';
import { isOk, isErr } from '@servicejs/result';
import { createMessagePackSerializer, messagePackSerializer } from '../src/msgpack.js';

describe('createMessagePackSerializer', () => {
  it('should serialize and deserialize primitive values', () => {
    const serializer = createMessagePackSerializer<number>();

    const encoded = serializer.serialize(42);
    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    expect(encoded.value).toBeInstanceOf(Uint8Array);

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value).toBe(42);
    }
  });

  it('should serialize and deserialize strings', () => {
    const serializer = createMessagePackSerializer<string>();

    const original = 'Hello, World!';
    const encoded = serializer.serialize(original);
    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value).toBe(original);
    }
  });

  it('should serialize and deserialize objects', () => {
    interface TestMessage {
      type: string;
      value: number;
      nested: {
        foo: string;
        bar: boolean;
      };
    }

    const serializer = createMessagePackSerializer<TestMessage>();

    const original: TestMessage = {
      type: 'test',
      value: 42,
      nested: {
        foo: 'bar',
        bar: true,
      },
    };

    const encoded = serializer.serialize(original);
    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value).toEqual(original);
    }
  });

  it('should serialize and deserialize arrays', () => {
    const serializer = createMessagePackSerializer<number[]>();

    const original = [1, 2, 3, 4, 5];
    const encoded = serializer.serialize(original);
    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value).toEqual(original);
    }
  });

  it('should handle binary data (Uint8Array)', () => {
    const serializer = createMessagePackSerializer<{ data: Uint8Array }>();

    const original = { data: new Uint8Array([1, 2, 3, 4, 5]) };
    const encoded = serializer.serialize(original);
    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value.data).toEqual(original.data);
    }
  });

  it('should handle null and undefined', () => {
    const serializer = createMessagePackSerializer<any>();

    const nullEncoded = serializer.serialize(null);
    expect(isOk(nullEncoded)).toBe(true);
    if (isOk(nullEncoded)) {
      const decoded = serializer.deserialize(nullEncoded.value);
      expect(isOk(decoded)).toBe(true);
      if (isOk(decoded)) {
        expect(decoded.value).toBe(null);
      }
    }

    const undefEncoded = serializer.serialize(undefined);
    expect(isOk(undefEncoded)).toBe(true);
    if (isOk(undefEncoded)) {
      const decoded = serializer.deserialize(undefEncoded.value);
      expect(isOk(decoded)).toBe(true);
      if (isOk(decoded)) {
        expect(decoded.value).toBe(null); // MessagePack converts undefined to null
      }
    }
  });

  it('should handle unicode strings', () => {
    const serializer = createMessagePackSerializer<string>();

    const original = '👋 Hello 世界 🌍';
    const encoded = serializer.serialize(original);
    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value).toBe(original);
    }
  });

  it('should produce smaller output than JSON', () => {
    const jsonSerializer = {
      serialize: (value: any) => {
        const json = JSON.stringify(value);
        const encoder = new TextEncoder();
        return encoder.encode(json);
      },
    };

    const msgpackSerializer = createMessagePackSerializer<any>();

    const testData = {
      type: 'message',
      id: 12345,
      timestamp: Date.now(),
      payload: {
        items: [1, 2, 3, 4, 5],
        metadata: { user: 'alice', role: 'admin' },
      },
    };

    const jsonSize = jsonSerializer.serialize(testData).length;
    const msgpackResult = msgpackSerializer.serialize(testData);
    expect(isOk(msgpackResult)).toBe(true);
    if (isOk(msgpackResult)) {
      const msgpackSize = msgpackResult.value.length;
      expect(msgpackSize).toBeLessThan(jsonSize);
    }
  });

  it('should return error for invalid MessagePack data', () => {
    const serializer = createMessagePackSerializer<any>();

    const invalidData = new Uint8Array([0xff, 0xff, 0xff]); // Invalid MessagePack
    const result = serializer.deserialize(invalidData);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('DESERIALIZE_FAILED');
    }
  });

  it('should handle deeply nested structures', () => {
    const serializer = createMessagePackSerializer<any>({ maxDepth: 50 });

    const deep: any = { value: 1 };
    let current = deep;
    for (let i = 0; i < 40; i++) {
      current.nested = { value: i };
      current = current.nested;
    }

    const encoded = serializer.serialize(deep);
    expect(isOk(encoded)).toBe(true);
    if (isOk(encoded)) {
      const decoded = serializer.deserialize(encoded.value);
      expect(isOk(decoded)).toBe(true);
    }
  });

  it('should have format property', () => {
    const serializer = createMessagePackSerializer();
    expect(serializer.format).toBe('messagepack');
  });
});

describe('messagePackSerializer', () => {
  it('should be a pre-configured instance', () => {
    expect(messagePackSerializer).toBeDefined();
    expect(messagePackSerializer.format).toBe('messagepack');
  });

  it('should work with unknown type', () => {
    const message = { type: 'test', value: 42 };

    const encoded = messagePackSerializer.serialize(message);
    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = messagePackSerializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value).toEqual(message);
    }
  });
});

describe('Round-trip tests', () => {
  interface Message {
    type: 'increment' | 'decrement' | 'reset';
    amount?: number;
    metadata?: {
      timestamp: number;
      user: string;
    };
  }

  const serializer = createMessagePackSerializer<Message>();

  it('should round-trip increment message', () => {
    const original: Message = {
      type: 'increment',
      amount: 5,
      metadata: {
        timestamp: Date.now(),
        user: 'alice',
      },
    };

    const encoded = serializer.serialize(original);
    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value).toEqual(original);
    }
  });
});

describe('Type preservation', () => {
  it('should preserve integer types', () => {
    const serializer = createMessagePackSerializer<{ small: number; large: number }>();

    const original = {
      small: 42,
      large: 2147483647, // Max 32-bit int
    };

    const encoded = serializer.serialize(original);
    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value.small).toBe(42);
      expect(decoded.value.large).toBe(2147483647);
    }
  });

  it('should preserve floating point numbers', () => {
    const serializer = createMessagePackSerializer<{ pi: number; e: number }>();

    const original = {
      pi: 3.14159265359,
      e: 2.71828182846,
    };

    const encoded = serializer.serialize(original);
    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value.pi).toBeCloseTo(3.14159265359);
      expect(decoded.value.e).toBeCloseTo(2.71828182846);
    }
  });
});
