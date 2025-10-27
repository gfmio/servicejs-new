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

describe('List support', () => {
  it('should serialize and deserialize list of numbers', () => {
    const { list, createCapnpSchema, createCapnpSerializer } = require('../src/capnp.js');

    const schema = createCapnpSchema({
      name: 'NumberList',
      fields: [
        { name: 'values', type: list('uint32'), slot: 0 },
      ],
    });

    const serializer = createCapnpSerializer<{ values: number[] }>(schema);

    const original = { values: [1, 2, 3, 4, 5] };
    const encoded = serializer.serialize(original);

    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value.values).toEqual(original.values);
    }
  });

  it('should serialize and deserialize list of strings', () => {
    const { list, createCapnpSchema, createCapnpSerializer } = require('../src/capnp.js');

    const schema = createCapnpSchema({
      name: 'StringList',
      fields: [
        { name: 'tags', type: list('text'), slot: 0 },
      ],
    });

    const serializer = createCapnpSerializer<{ tags: string[] }>(schema);

    const original = { tags: ['hello', 'world', 'test'] };
    const encoded = serializer.serialize(original);

    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value.tags).toEqual(original.tags);
    }
  });

  it('should serialize and deserialize list of booleans', () => {
    const { list, createCapnpSchema, createCapnpSerializer } = require('../src/capnp.js');

    const schema = createCapnpSchema({
      name: 'BoolList',
      fields: [
        { name: 'flags', type: list('bool'), slot: 0 },
      ],
    });

    const serializer = createCapnpSerializer<{ flags: boolean[] }>(schema);

    const original = { flags: [true, false, true, true, false] };
    const encoded = serializer.serialize(original);

    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value.flags).toEqual(original.flags);
    }
  });

  it('should serialize and deserialize list of structs', () => {
    const { list, structType, createCapnpSchema, createCapnpSerializer } = require('../src/capnp.js');

    const personSchema = createCapnpSchema({
      name: 'Person',
      fields: [
        { name: 'id', type: 'uint32', slot: 0 },
        { name: 'name', type: 'text', slot: 0 },
      ],
    });

    const schema = createCapnpSchema({
      name: 'People',
      fields: [
        { name: 'persons', type: list(structType(personSchema)), slot: 0 },
      ],
    });

    const serializer = createCapnpSerializer<{
      persons: Array<{ id: number; name: string }>;
    }>(schema);

    const original = {
      persons: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ],
    };

    const encoded = serializer.serialize(original);
    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value.persons.length).toBe(3);
      expect(decoded.value.persons[0].id).toBe(1);
      expect(decoded.value.persons[0].name).toBe('Alice');
      expect(decoded.value.persons[1].id).toBe(2);
      expect(decoded.value.persons[1].name).toBe('Bob');
      expect(decoded.value.persons[2].id).toBe(3);
      expect(decoded.value.persons[2].name).toBe('Charlie');
    }
  });
});

describe('Nested struct support', () => {
  it('should serialize and deserialize nested structs', () => {
    const { structType, createCapnpSchema, createCapnpSerializer } = require('../src/capnp.js');

    const addressSchema = createCapnpSchema({
      name: 'Address',
      fields: [
        { name: 'street', type: 'text', slot: 0 },
        { name: 'city', type: 'text', slot: 1 },
        { name: 'zipCode', type: 'uint32', slot: 0 },
      ],
    });

    const personSchema = createCapnpSchema({
      name: 'Person',
      fields: [
        { name: 'id', type: 'uint32', slot: 0 },
        { name: 'name', type: 'text', slot: 0 },
        { name: 'address', type: structType(addressSchema), slot: 1 },
      ],
    });

    const serializer = createCapnpSerializer<{
      id: number;
      name: string;
      address: {
        street: string;
        city: string;
        zipCode: number;
      };
    }>(personSchema);

    const original = {
      id: 123,
      name: 'Alice',
      address: {
        street: '123 Main St',
        city: 'Springfield',
        zipCode: 12345,
      },
    };

    const encoded = serializer.serialize(original);
    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value.id).toBe(original.id);
      expect(decoded.value.name).toBe(original.name);
      expect(decoded.value.address.street).toBe(original.address.street);
      expect(decoded.value.address.city).toBe(original.address.city);
      expect(decoded.value.address.zipCode).toBe(original.address.zipCode);
    }
  });
});

describe('Enum support', () => {
  it('should serialize and deserialize enums', () => {
    const { enumType, createCapnpSchema, createCapnpSerializer } = require('../src/capnp.js');

    const colorEnum = enumType('Color', [
      { name: 'red', value: 0 },
      { name: 'green', value: 1 },
      { name: 'blue', value: 2 },
    ]);

    const schema = createCapnpSchema({
      name: 'Thing',
      fields: [
        { name: 'id', type: 'uint32', slot: 0 },
        { name: 'color', type: colorEnum, slot: 2 }, // Slot 2 for uint16 to avoid overlap
      ],
    });

    const serializer = createCapnpSerializer<{
      id: number;
      color: string;
    }>(schema);

    const original = {
      id: 42,
      color: 'blue',
    };

    const encoded = serializer.serialize(original);
    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      expect(decoded.value.id).toBe(original.id);
      expect(decoded.value.color).toBe(original.color);
    }
  });
});

describe('Union support', () => {
  it('should serialize and deserialize union with text fields', () => {
    const { unionType, createCapnpSchema, createCapnpSerializer } = require('../src/capnp.js');

    const contactUnion = unionType(undefined, 0, [
      { name: 'email', type: 'text', discriminant: 1 },
      { name: 'phone', type: 'text', discriminant: 2 },
    ]);

    const schema = createCapnpSchema({
      name: 'Contact',
      fields: [
        { name: 'name', type: 'text', slot: 0 },
        { name: 'email', type: 'text', slot: 1, unionIndex: 0, discriminant: 1 },
        { name: 'phone', type: 'text', slot: 1, unionIndex: 0, discriminant: 2 },
      ],
      unions: [contactUnion],
    });

    const serializer = createCapnpSerializer<{
      name: string;
      email?: string;
      phone?: string;
    }>(schema);

    // Test with email
    const withEmail = {
      name: 'Alice',
      email: 'alice@example.com',
    };

    const encodedEmail = serializer.serialize(withEmail);
    expect(isOk(encodedEmail)).toBe(true);
    if (!isOk(encodedEmail)) return;

    const decodedEmail = serializer.deserialize(encodedEmail.value);
    expect(isOk(decodedEmail)).toBe(true);
    if (isOk(decodedEmail)) {
      expect(decodedEmail.value.name).toBe(withEmail.name);
      expect(decodedEmail.value.email).toBe(withEmail.email);
      expect(decodedEmail.value.phone).toBeUndefined();
    }

    // Test with phone
    const withPhone = {
      name: 'Bob',
      phone: '+1-555-1234',
    };

    const encodedPhone = serializer.serialize(withPhone);
    expect(isOk(encodedPhone)).toBe(true);
    if (!isOk(encodedPhone)) return;

    const decodedPhone = serializer.deserialize(encodedPhone.value);
    expect(isOk(decodedPhone)).toBe(true);
    if (isOk(decodedPhone)) {
      expect(decodedPhone.value.name).toBe(withPhone.name);
      expect(decodedPhone.value.phone).toBe(withPhone.phone);
      expect(decodedPhone.value.email).toBeUndefined();
    }
  });

  it('should serialize and deserialize union with different types', () => {
    const { unionType, createCapnpSchema, createCapnpSerializer } = require('../src/capnp.js');

    const valueUnion = unionType(undefined, 0, [
      { name: 'intValue', type: 'int32', discriminant: 1 },
      { name: 'floatValue', type: 'float64', discriminant: 2 },
      { name: 'textValue', type: 'text', discriminant: 3 },
    ]);

    const schema = createCapnpSchema({
      name: 'Value',
      fields: [
        { name: 'id', type: 'uint32', slot: 1 },
        { name: 'intValue', type: 'int32', slot: 2, unionIndex: 0, discriminant: 1 },
        { name: 'floatValue', type: 'float64', slot: 2, unionIndex: 0, discriminant: 2 },
        { name: 'textValue', type: 'text', slot: 0, unionIndex: 0, discriminant: 3 },
      ],
      unions: [valueUnion],
    });

    const serializer = createCapnpSerializer<{
      id: number;
      intValue?: number;
      floatValue?: number;
      textValue?: string;
    }>(schema);

    // Test with int
    const withInt = { id: 1, intValue: 42 };
    const encodedInt = serializer.serialize(withInt);
    expect(isOk(encodedInt)).toBe(true);
    if (isOk(encodedInt)) {
      const decodedInt = serializer.deserialize(encodedInt.value);
      expect(isOk(decodedInt)).toBe(true);
      if (isOk(decodedInt)) {
        expect(decodedInt.value.id).toBe(1);
        expect(decodedInt.value.intValue).toBe(42);
        expect(decodedInt.value.floatValue).toBeUndefined();
        expect(decodedInt.value.textValue).toBeUndefined();
      }
    }

    // Test with float
    const withFloat = { id: 2, floatValue: 3.14 };
    const encodedFloat = serializer.serialize(withFloat);
    expect(isOk(encodedFloat)).toBe(true);
    if (isOk(encodedFloat)) {
      const decodedFloat = serializer.deserialize(encodedFloat.value);
      expect(isOk(decodedFloat)).toBe(true);
      if (isOk(decodedFloat)) {
        expect(decodedFloat.value.id).toBe(2);
        expect(decodedFloat.value.floatValue).toBeCloseTo(3.14);
        expect(decodedFloat.value.intValue).toBeUndefined();
        expect(decodedFloat.value.textValue).toBeUndefined();
      }
    }

    // Test with text
    const withText = { id: 3, textValue: 'hello' };
    const encodedText = serializer.serialize(withText);
    expect(isOk(encodedText)).toBe(true);
    if (isOk(encodedText)) {
      const decodedText = serializer.deserialize(encodedText.value);
      expect(isOk(decodedText)).toBe(true);
      if (isOk(decodedText)) {
        expect(decodedText.value.id).toBe(3);
        expect(decodedText.value.textValue).toBe('hello');
        expect(decodedText.value.intValue).toBeUndefined();
        expect(decodedText.value.floatValue).toBeUndefined();
      }
    }
  });
});

describe('Default values', () => {
  it('should use default values for primitive fields', () => {
    const { createCapnpSchema, createCapnpSerializer } = require('../src/capnp.js');

    const schema = createCapnpSchema({
      name: 'Config',
      fields: [
        { name: 'enabled', type: 'bool', slot: 0, defaultValue: true },
        { name: 'timeout', type: 'uint32', slot: 1, defaultValue: 5000 },
        { name: 'retries', type: 'uint16', slot: 3, defaultValue: 3 },
      ],
    });

    const serializer = createCapnpSerializer<{
      enabled: boolean;
      timeout: number;
      retries: number;
    }>(schema);

    // Serialize with zero values (should use defaults on read)
    const withZeros = {
      enabled: false,
      timeout: 0,
      retries: 0,
    };

    const encoded = serializer.serialize(withZeros);
    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      // Zero values should be replaced with defaults
      expect(decoded.value.enabled).toBe(true);
      expect(decoded.value.timeout).toBe(5000);
      expect(decoded.value.retries).toBe(3);
    }
  });

  it('should preserve non-zero values despite defaults', () => {
    const { createCapnpSchema, createCapnpSerializer } = require('../src/capnp.js');

    const schema = createCapnpSchema({
      name: 'Config',
      fields: [
        { name: 'timeout', type: 'uint32', slot: 0, defaultValue: 5000 },
      ],
    });

    const serializer = createCapnpSerializer<{ timeout: number }>(schema);

    // Serialize with non-zero value
    const original = { timeout: 10000 };

    const encoded = serializer.serialize(original);
    expect(isOk(encoded)).toBe(true);
    if (!isOk(encoded)) return;

    const decoded = serializer.deserialize(encoded.value);
    expect(isOk(decoded)).toBe(true);
    if (isOk(decoded)) {
      // Non-zero value should be preserved
      expect(decoded.value.timeout).toBe(10000);
    }
  });
});
