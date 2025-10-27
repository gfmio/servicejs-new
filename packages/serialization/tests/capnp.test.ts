import { describe, it, expect } from 'bun:test';
import { isOk, isErr } from '@servicejs/result';
import {
  createCapnpSchema,
  createCapnpSerializer,
  generateTypeScriptCode,
  parseCapnpSchema,
} from '../src/capnp.js';

describe('createCapnpSchema', () => {
  it('should create a simple schema', () => {
    const schema = createCapnpSchema({
      name: 'Person',
      fields: [
        { name: 'id', type: 'uint32', slot: 0 },
        { name: 'age', type: 'uint16', slot: 2 },
      ],
    });

    expect(schema.name).toBe('Person');
    expect(schema.fields.length).toBe(2);
    expect(schema.dataWordCount).toBeGreaterThan(0);
  });

  it('should handle text fields', () => {
    const schema = createCapnpSchema({
      name: 'Message',
      fields: [
        { name: 'text', type: 'text', slot: 0 },
      ],
    });

    expect(schema.name).toBe('Message');
    expect(schema.pointerCount).toBeGreaterThan(0);
  });
});

describe('createCapnpSerializer', () => {
  it('should serialize and deserialize primitive fields', () => {
    const schema = createCapnpSchema({
      name: 'Counter',
      fields: [
        { name: 'count', type: 'uint32', slot: 0 },
      ],
    });

    const serializer = createCapnpSerializer<{ count: number }>(schema);

    const original = { count: 42 };
    const encoded = serializer.serialize(original);

    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value.count).toBe(original.count);
    }
  });

  it('should serialize and deserialize text fields', () => {
    const schema = createCapnpSchema({
      name: 'Message',
      fields: [
        { name: 'text', type: 'text', slot: 0 },
      ],
    });

    const serializer = createCapnpSerializer<{ text: string }>(schema);

    const original = { text: 'Hello, World!' };
    const encoded = serializer.serialize(original);

    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value.text).toBe(original.text);
    }
  });

  it('should serialize and deserialize mixed fields', () => {
    const schema = createCapnpSchema({
      name: 'Person',
      fields: [
        { name: 'id', type: 'uint32', slot: 0 },
        { name: 'name', type: 'text', slot: 0 },
        { name: 'age', type: 'uint16', slot: 2 },
      ],
    });

    const serializer = createCapnpSerializer<{
      id: number;
      name: string;
      age: number;
    }>(schema);

    const original = {
      id: 123,
      name: 'Alice',
      age: 30,
    };

    const encoded = serializer.serialize(original);
    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value.id).toBe(original.id);
      expect(decoded.value.name).toBe(original.name);
      expect(decoded.value.age).toBe(original.age);
    }
  });

  it('should handle unicode text', () => {
    const schema = createCapnpSchema({
      name: 'Message',
      fields: [
        { name: 'text', type: 'text', slot: 0 },
      ],
    });

    const serializer = createCapnpSerializer<{ text: string }>(schema);

    // Test with emoji and multi-byte characters
    const original = { text: '👋 Hello 世界 🌍' };
    const encoded = serializer.serialize(original);

    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value.text).toBe(original.text);
    }
  });

  it('should handle multiple text fields', () => {
    const schema = createCapnpSchema({
      name: 'User',
      fields: [
        { name: 'firstName', type: 'text', slot: 0 },
        { name: 'lastName', type: 'text', slot: 1 },
        { name: 'email', type: 'text', slot: 2 },
      ],
    });

    const serializer = createCapnpSerializer<{
      firstName: string;
      lastName: string;
      email: string;
    }>(schema);

    const original = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    };

    const encoded = serializer.serialize(original);
    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value.firstName).toBe(original.firstName);
      expect(decoded.value.lastName).toBe(original.lastName);
      expect(decoded.value.email).toBe(original.email);
    }
  });

  it('should have format property', () => {
    const schema = createCapnpSchema({
      name: 'Test',
      fields: [{ name: 'value', type: 'uint32', slot: 0 }],
    });

    const serializer = createCapnpSerializer(schema);
    expect(serializer.format).toBe('capnp');
  });
});

describe('generateTypeScriptCode', () => {
  it('should generate TypeScript code for a schema', () => {
    const schema = createCapnpSchema({
      name: 'Person',
      fields: [
        { name: 'id', type: 'uint32', slot: 0 },
        { name: 'name', type: 'text', slot: 0 },
      ],
    });

    const code = generateTypeScriptCode(schema);

    expect(code).toContain('export interface Person');
    expect(code).toContain('id: number');
    expect(code).toContain('name: string');
    expect(code).toContain('export const PersonSchema');
    expect(code).toContain('export const PersonSerializer');
  });

  it('should generate code for all field types', () => {
    const schema = createCapnpSchema({
      name: 'AllTypes',
      fields: [
        { name: 'flag', type: 'bool', slot: 0 },
        { name: 'count', type: 'uint32', slot: 1 },
        { name: 'value', type: 'float64', slot: 2 },
        { name: 'text', type: 'text', slot: 0 },
      ],
    });

    const code = generateTypeScriptCode(schema);

    expect(code).toContain('flag: boolean');
    expect(code).toContain('count: number');
    expect(code).toContain('value: number');
    expect(code).toContain('text: string');
  });
});

describe('parseCapnpSchema', () => {
  it('should parse a simple schema', () => {
    const schemaText = `
      struct Person {
        id @0 :UInt32;
        name @1 :Text;
      }
    `;

    const schema = parseCapnpSchema(schemaText);

    expect(schema.name).toBe('Person');
    expect(schema.fields.length).toBe(2);
    expect(schema.fields[0].name).toBe('id');
    expect(schema.fields[0].type).toBe('uint32');
    expect(schema.fields[1].name).toBe('name');
    expect(schema.fields[1].type).toBe('text');
  });

  it('should handle comments', () => {
    const schemaText = `
      # This is a comment
      struct Message {
        # Field comment
        text @0 :Text;
      }
    `;

    const schema = parseCapnpSchema(schemaText);

    expect(schema.name).toBe('Message');
    expect(schema.fields.length).toBe(1);
  });
});

describe('Round-trip tests', () => {
  it('should maintain data integrity over multiple round-trips', () => {
    const schema = createCapnpSchema({
      name: 'Data',
      fields: [
        { name: 'counter', type: 'uint32', slot: 0 },
        { name: 'label', type: 'text', slot: 0 },
      ],
    });

    const serializer = createCapnpSerializer<{
      counter: number;
      label: string;
    }>(schema);

    let data = { counter: 1, label: 'start' };

    for (let i = 0; i < 5; i++) {
      const encoded = serializer.serialize(data);
      expect(isOk(encoded)).toBe(true);
      if (!isOk(encoded)) break;

      const decoded = serializer.deserialize(encoded.value);
      expect(isOk(decoded)).toBe(true);
      if (!isOk(decoded)) break;

      expect(decoded.value.counter).toBe(data.counter);
      expect(decoded.value.label).toBe(data.label);

      data = { counter: data.counter + 1, label: `iteration_${i}` };
    }
  });
});

describe('Message-passing scenario', () => {
  it('should handle typical message types', () => {
    const schema = createCapnpSchema({
      name: 'Command',
      fields: [
        { name: 'type', type: 'text', slot: 0 },
        { name: 'amount', type: 'uint32', slot: 0 },
      ],
    });

    const serializer = createCapnpSerializer<{
      type: string;
      amount: number;
    }>(schema);

    const commands = [
      { type: 'increment', amount: 5 },
      { type: 'decrement', amount: 3 },
      { type: 'multiply', amount: 2 },
    ];

    for (const original of commands) {
      const encoded = serializer.serialize(original);
      expect(isOk(encoded)).toBe(true);
      if (!isOk(encoded)) continue;

      const decoded = serializer.deserialize(encoded.value);
      expect(isOk(decoded)).toBe(true);
      if (isOk(decoded)) {
        expect(decoded.value.type).toBe(original.type);
        expect(decoded.value.amount).toBe(original.amount);
      }
    }
  });
});
