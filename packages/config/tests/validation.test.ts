import { describe, test, expect } from 'bun:test';
import { isOk, isErr } from '@servicejs/result';
import { z } from 'zod';
import {
  validate,
  createValidator,
  validateAndTransform,
  schemas,
  coerceFromEnv,
} from '../src/validation.js';

describe('validate', () => {
  test('validates correct data', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const result = validate({ name: 'Alice', age: 30 }, schema);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ name: 'Alice', age: 30 });
    }
  });

  test('fails on invalid data', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const result = validate({ name: 'Alice', age: 'thirty' }, schema);
    expect(isErr(result)).toBe(true);
    if (!result.ok) {
      expect(result.error.message).toContain('validation failed');
      expect(result.error.errors.length).toBeGreaterThan(0);
    }
  });

  test('includes error details', () => {
    const schema = z.object({
      port: z.number().int().positive(),
    });

    const result = validate({ port: -1 }, schema);
    expect(isErr(result)).toBe(true);
    if (!result.ok) {
      expect(result.error.errors[0].path).toEqual(['port']);
      expect(result.error.errors[0].message).toBeTruthy();
    }
  });

  test('handles nested objects', () => {
    const schema = z.object({
      server: z.object({
        host: z.string(),
        port: z.number(),
      }),
    });

    const result = validate(
      { server: { host: 'localhost', port: 3000 } },
      schema
    );
    expect(isOk(result)).toBe(true);
  });

  test('handles arrays', () => {
    const schema = z.object({
      items: z.array(z.string()),
    });

    const result = validate({ items: ['a', 'b', 'c'] }, schema);
    expect(isOk(result)).toBe(true);
  });
});

describe('createValidator', () => {
  test('creates reusable validator', () => {
    const schema = z.object({ value: z.number() });
    const validator = createValidator(schema);

    const result1 = validator({ value: 42 });
    const result2 = validator({ value: 'invalid' });

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(false);
  });
});

describe('validateAndTransform', () => {
  test('validates and transforms data', () => {
    const schema = z.object({
      value: z.number(),
    });

    const transform = (data: { value: number }) => ({
      ...data,
      doubled: data.value * 2,
    });

    const result = validateAndTransform({ value: 21 }, schema, transform);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ value: 21, doubled: 42 });
    }
  });

  test('fails validation before transform', () => {
    const schema = z.object({ value: z.number() });
    const transform = (data: { value: number }) => ({ doubled: data.value * 2 });

    const result = validateAndTransform({ value: 'invalid' }, schema, transform);
    expect(isErr(result)).toBe(true);
  });

  test('works without transform', () => {
    const schema = z.object({ value: z.number() });
    const result = validateAndTransform({ value: 42 }, schema);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ value: 42 });
    }
  });
});

describe('schemas', () => {
  test('port validates port numbers', () => {
    expect(schemas.port.safeParse(80).success).toBe(true);
    expect(schemas.port.safeParse(3000).success).toBe(true);
    expect(schemas.port.safeParse(65535).success).toBe(true);
    expect(schemas.port.safeParse(0).success).toBe(false);
    expect(schemas.port.safeParse(65536).success).toBe(false);
    expect(schemas.port.safeParse(-1).success).toBe(false);
  });

  test('host validates hostnames', () => {
    expect(schemas.host.safeParse('localhost').success).toBe(true);
    expect(schemas.host.safeParse('example.com').success).toBe(true);
    expect(schemas.host.safeParse('').success).toBe(false);
  });

  test('url validates URLs', () => {
    expect(schemas.url.safeParse('https://example.com').success).toBe(true);
    expect(schemas.url.safeParse('http://localhost:3000').success).toBe(true);
    expect(schemas.url.safeParse('not-a-url').success).toBe(false);
  });

  test('email validates emails', () => {
    expect(schemas.email.safeParse('user@example.com').success).toBe(true);
    expect(schemas.email.safeParse('invalid-email').success).toBe(false);
  });

  test('environment validates env values', () => {
    expect(schemas.environment.safeParse('development').success).toBe(true);
    expect(schemas.environment.safeParse('production').success).toBe(true);
    expect(schemas.environment.safeParse('test').success).toBe(true);
    expect(schemas.environment.safeParse('staging').success).toBe(false);
  });

  test('logLevel validates log levels', () => {
    expect(schemas.logLevel.safeParse('info').success).toBe(true);
    expect(schemas.logLevel.safeParse('error').success).toBe(true);
    expect(schemas.logLevel.safeParse('invalid').success).toBe(false);
  });

  test('positiveInt validates positive integers', () => {
    expect(schemas.positiveInt.safeParse(1).success).toBe(true);
    expect(schemas.positiveInt.safeParse(0).success).toBe(false);
    expect(schemas.positiveInt.safeParse(-1).success).toBe(false);
    expect(schemas.positiveInt.safeParse(1.5).success).toBe(false);
  });

  test('nonNegativeInt validates non-negative integers', () => {
    expect(schemas.nonNegativeInt.safeParse(0).success).toBe(true);
    expect(schemas.nonNegativeInt.safeParse(1).success).toBe(true);
    expect(schemas.nonNegativeInt.safeParse(-1).success).toBe(false);
  });

  test('nonEmptyString validates non-empty strings', () => {
    expect(schemas.nonEmptyString.safeParse('test').success).toBe(true);
    expect(schemas.nonEmptyString.safeParse('').success).toBe(false);
  });

  test('booleanString converts string to boolean', () => {
    const result1 = schemas.booleanString.safeParse('true');
    const result2 = schemas.booleanString.safeParse('false');
    const result3 = schemas.booleanString.safeParse('TRUE');

    expect(result1.success && result1.data).toBe(true);
    expect(result2.success && result2.data).toBe(false);
    expect(result3.success && result3.data).toBe(true);
  });

  test('numberString converts string to number', () => {
    const result = schemas.numberString.safeParse('42');
    expect(result.success && result.data).toBe(42);
  });

  test('jsonString parses JSON string', () => {
    const result = schemas.jsonString.safeParse('{"key":"value"}');
    expect(result.success && result.data).toEqual({ key: 'value' });
  });
});

describe('coerceFromEnv', () => {
  test('coerces string numbers to numbers', () => {
    const schema = z.object({
      port: coerceFromEnv(z.number()),
    });

    const result = schema.safeParse({ port: '3000' });
    expect(result.success && result.data.port).toBe(3000);
  });

  test('coerces string booleans to booleans', () => {
    const schema = z.object({
      enabled: coerceFromEnv(z.boolean()),
    });

    const result = schema.safeParse({ enabled: 'true' });
    expect(result.success && result.data.enabled).toBe(true);
  });

  test('passes through non-string values', () => {
    const schema = z.object({
      port: coerceFromEnv(z.number()),
    });

    const result = schema.safeParse({ port: 3000 });
    expect(result.success && result.data.port).toBe(3000);
  });

  test('works with arrays', () => {
    const schema = z.object({
      items: coerceFromEnv(z.array(z.string())),
    });

    const result = schema.safeParse({ items: '["a","b","c"]' });
    expect(result.success && result.data.items).toEqual(['a', 'b', 'c']);
  });
});
