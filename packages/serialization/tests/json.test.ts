import { describe, it, expect } from 'bun:test';
import { isOk, isErr } from '@servicejs/result';
import { createJsonSerializer, jsonSerializer } from '../src/index.js';

describe('createJsonSerializer', () => {
  it('should serialize and deserialize primitive values', () => {
    const serializer = createJsonSerializer<number>();

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
    const serializer = createJsonSerializer<string>();

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

    const serializer = createJsonSerializer<TestMessage>();

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
    const serializer = createJsonSerializer<number[]>();

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

  it('should serialize and deserialize null', () => {
    const serializer = createJsonSerializer<null>();

    const encoded = serializer.serialize(null);
    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value).toBe(null);
    }
  });

  it('should handle empty objects', () => {
    const serializer = createJsonSerializer<{}>();

    const original = {};
    const encoded = serializer.serialize(original);
    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value).toEqual(original);
    }
  });

  it('should handle empty arrays', () => {
    const serializer = createJsonSerializer<unknown[]>();

    const original: unknown[] = [];
    const encoded = serializer.serialize(original);
    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value).toEqual(original);
    }
  });

  it('should handle unicode strings', () => {
    const serializer = createJsonSerializer<string>();

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

  it('should return error for circular references', () => {
    const serializer = createJsonSerializer<any>();

    const circular: any = { foo: 'bar' };
    circular.self = circular;

    const result = serializer.serialize(circular);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('SERIALIZE_FAILED');
      expect(result.error.message).toContain('Failed to serialize');
    }
  });

  it('should return error for invalid JSON data', () => {
    const serializer = createJsonSerializer<any>();

    const invalidJson = new Uint8Array([0x7b, 0x22, 0x69, 0x6e]); // Incomplete JSON "{"in"
    const result = serializer.deserialize(invalidJson);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('DESERIALIZE_FAILED');
    }
  });

  it('should support custom replacer', () => {
    const serializer = createJsonSerializer<any>({
      replacer: (key, value) => {
        if (key === 'password') return undefined;
        return value;
      },
    });

    const original = {
      username: 'john',
      password: 'secret123',
      email: 'john@example.com',
    };

    const encoded = serializer.serialize(original);
    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value).toEqual({
        username: 'john',
        email: 'john@example.com',
        // password is omitted
      });
      expect((decoded.value as any).password).toBeUndefined();
    }
  });

  it('should support custom reviver', () => {
    const serializer = createJsonSerializer<any>({
      reviver: (key, value) => {
        if (key === 'date' && typeof value === 'string') {
          return new Date(value);
        }
        return value;
      },
    });

    const dateString = '2024-01-01T00:00:00.000Z';
    const original = {
      event: 'test',
      date: dateString,
    };

    const encoded = serializer.serialize(original);
    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value.event).toBe('test');
      expect(decoded.value.date).toBeInstanceOf(Date);
      expect((decoded.value.date as Date).toISOString()).toBe(dateString);
    }
  });

  it('should have format property', () => {
    const serializer = createJsonSerializer();
    expect(serializer.format).toBe('json');
  });
});

describe('jsonSerializer', () => {
  it('should be a pre-configured instance', () => {
    expect(jsonSerializer).toBeDefined();
    expect(jsonSerializer.format).toBe('json');
  });

  it('should work with unknown type', () => {
    const message = { type: 'test', value: 42 };

    const encoded = jsonSerializer.serialize(message);
    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = jsonSerializer.deserialize(encoded.value);
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

  const serializer = createJsonSerializer<Message>();

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

  it('should round-trip reset message', () => {
    const original: Message = {
      type: 'reset',
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

describe('Error handling', () => {
  it('should include error cause in serialization error', () => {
    const serializer = createJsonSerializer<any>();

    const circular: any = {};
    circular.self = circular;

    const result = serializer.serialize(circular);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.cause).toBeDefined();
    }
  });

  it('should include error cause in deserialization error', () => {
    const serializer = createJsonSerializer<any>();

    const invalid = new Uint8Array([0xff, 0xfe]); // Invalid UTF-8
    const result = serializer.deserialize(invalid);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.cause).toBeDefined();
    }
  });
});

describe('Size and encoding', () => {
  it('should produce compact encoding by default', () => {
    const serializer = createJsonSerializer<any>();

    const message = { type: 'test', value: 42 };
    const encoded = serializer.serialize(message);
    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const json = new TextDecoder().decode(encoded.value);
    expect(json).not.toContain('\n');
    expect(json).not.toContain('  ');
  });

  it('should support pretty printing with space option', () => {
    const serializer = createJsonSerializer<any>({ space: 2 });

    const message = { type: 'test', value: 42 };
    const encoded = serializer.serialize(message);
    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const json = new TextDecoder().decode(encoded.value);
    expect(json).toContain('\n');
    expect(json).toContain('  ');
  });
});
