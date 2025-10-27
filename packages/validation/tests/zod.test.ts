import { describe, it, expect } from 'bun:test';
import { z } from 'zod';
import { isOk, isErr } from '@servicejs/result';
import { createZodSchema, isZodType, SchemaValidationError } from '../src/index.js';

describe('createZodSchema - basic types', () => {
  it('should validate string schema', () => {
    const schema = createZodSchema(z.string(), 'String');

    const result1 = schema.validate('hello');
    expect(isOk(result1)).toBe(true);
    if (isOk(result1)) {
      expect(result1.value).toBe('hello');
    }

    const result2 = schema.validate(42);
    expect(isErr(result2)).toBe(true);
    if (isErr(result2)) {
      expect(result2.error.length).toBeGreaterThan(0);
      expect(result2.error[0].message).toContain('string');
    }
  });

  it('should validate number schema', () => {
    const schema = createZodSchema(z.number());

    const result1 = schema.validate(42);
    expect(isOk(result1)).toBe(true);
    if (isOk(result1)) {
      expect(result1.value).toBe(42);
    }

    const result2 = schema.validate('not a number');
    expect(isErr(result2)).toBe(true);
  });

  it('should validate boolean schema', () => {
    const schema = createZodSchema(z.boolean());

    const result1 = schema.validate(true);
    expect(isOk(result1)).toBe(true);
    if (isOk(result1)) {
      expect(result1.value).toBe(true);
    }

    const result2 = schema.validate('true');
    expect(isErr(result2)).toBe(true);
  });
});

describe('createZodSchema - object schemas', () => {
  const UserSchema = createZodSchema(
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().int().min(0).max(120),
    }),
    'User'
  );

  it('should validate valid object', () => {
    const user = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    };

    const result = UserSchema.validate(user);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual(user);
    }
  });

  it('should reject invalid object', () => {
    const invalidUser = {
      name: '',
      email: 'not-an-email',
      age: -5,
    };

    const result = UserSchema.validate(invalidUser);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.length).toBeGreaterThan(0);
      // Should have errors for name, email, and age
      const paths = result.error.map(e => e.path?.join('.'));
      expect(paths).toContain('name');
      expect(paths).toContain('email');
      expect(paths).toContain('age');
    }
  });

  it('should have typeName when specified', () => {
    expect(UserSchema.typeName).toBe('User');
  });

  it('should not have typeName when not specified', () => {
    const schema = createZodSchema(z.string());
    expect(schema.typeName).toBeUndefined();
  });
});

describe('createZodSchema - parse method', () => {
  const schema = createZodSchema(
    z.object({
      type: z.literal('message'),
      content: z.string(),
    })
  );

  it('should parse valid data', () => {
    const data = { type: 'message' as const, content: 'Hello' };
    const result = schema.parse(data);
    expect(result).toEqual(data);
  });

  it('should throw SchemaValidationError on invalid data', () => {
    const invalidData = { type: 'wrong', content: 123 };

    expect(() => schema.parse(invalidData)).toThrow(SchemaValidationError);

    try {
      schema.parse(invalidData);
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      if (error instanceof SchemaValidationError) {
        expect(error.errors.length).toBeGreaterThan(0);
        expect(error.message).toContain('Schema validation failed');
      }
    }
  });
});

describe('createZodSchema - error messages', () => {
  const schema = createZodSchema(
    z.object({
      user: z.object({
        profile: z.object({
          email: z.string().email(),
        }),
      }),
    })
  );

  it('should include path in error', () => {
    const result = schema.validate({
      user: {
        profile: {
          email: 'not-an-email',
        },
      },
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.length).toBeGreaterThan(0);
      const emailError = result.error.find(e =>
        e.path?.join('.') === 'user.profile.email'
      );
      expect(emailError).toBeDefined();
    }
  });

  it('should include code in error', () => {
    const result = schema.validate({
      user: {
        profile: {
          email: 'not-an-email',
        },
      },
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error[0].code).toBeDefined();
    }
  });

  it('should include context in error', () => {
    const result = schema.validate({
      user: {
        profile: {
          email: 'not-an-email',
        },
      },
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error[0].context).toBeDefined();
    }
  });
});

describe('createZodSchema - array schemas', () => {
  const schema = createZodSchema(z.array(z.number()));

  it('should validate valid array', () => {
    const result = schema.validate([1, 2, 3]);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual([1, 2, 3]);
    }
  });

  it('should reject invalid array elements', () => {
    const result = schema.validate([1, 'two', 3]);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.length).toBeGreaterThan(0);
      const errorPath = result.error[0].path?.join('.');
      expect(errorPath).toBe('1'); // Index 1 has the error
    }
  });
});

describe('createZodSchema - union schemas', () => {
  const schema = createZodSchema(
    z.union([
      z.object({ type: z.literal('text'), content: z.string() }),
      z.object({ type: z.literal('number'), value: z.number() }),
    ])
  );

  it('should validate first union variant', () => {
    const result = schema.validate({ type: 'text', content: 'hello' });
    expect(isOk(result)).toBe(true);
  });

  it('should validate second union variant', () => {
    const result = schema.validate({ type: 'number', value: 42 });
    expect(isOk(result)).toBe(true);
  });

  it('should reject invalid union', () => {
    const result = schema.validate({ type: 'text', value: 42 });
    expect(isErr(result)).toBe(true);
  });
});

describe('createZodSchema - refinements', () => {
  const schema = createZodSchema(
    z.string().refine(s => s.length >= 3, {
      message: 'String must be at least 3 characters',
    })
  );

  it('should validate refined value', () => {
    const result = schema.validate('hello');
    expect(isOk(result)).toBe(true);
  });

  it('should reject refinement failure', () => {
    const result = schema.validate('ab');
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error[0].message).toBe('String must be at least 3 characters');
    }
  });
});

describe('createZodSchema - transforms', () => {
  const schema = createZodSchema(
    z.string().transform(s => s.toUpperCase())
  );

  it('should apply transform on validate', () => {
    const result = schema.validate('hello');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe('HELLO');
    }
  });

  it('should apply transform on parse', () => {
    const result = schema.parse('hello');
    expect(result).toBe('HELLO');
  });
});

describe('isZodType', () => {
  const StringSchema = z.string();
  const NumberSchema = z.number();

  it('should return true for matching type', () => {
    expect(isZodType(StringSchema, 'hello')).toBe(true);
    expect(isZodType(NumberSchema, 42)).toBe(true);
  });

  it('should return false for non-matching type', () => {
    expect(isZodType(StringSchema, 42)).toBe(false);
    expect(isZodType(NumberSchema, 'hello')).toBe(false);
  });

  it('should work with complex schemas', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    expect(isZodType(schema, { name: 'John', age: 30 })).toBe(true);
    expect(isZodType(schema, { name: 'John' })).toBe(false);
    expect(isZodType(schema, { name: 'John', age: '30' })).toBe(false);
  });
});

describe('Real-world message schemas', () => {
  // Command message schema
  const CommandSchema = createZodSchema(
    z.discriminatedUnion('type', [
      z.object({
        type: z.literal('increment'),
        amount: z.number().int().positive(),
      }),
      z.object({
        type: z.literal('decrement'),
        amount: z.number().int().positive(),
      }),
      z.object({
        type: z.literal('reset'),
      }),
    ]),
    'Command'
  );

  it('should validate increment command', () => {
    const result = CommandSchema.validate({ type: 'increment', amount: 5 });
    expect(isOk(result)).toBe(true);
  });

  it('should validate decrement command', () => {
    const result = CommandSchema.validate({ type: 'decrement', amount: 3 });
    expect(isOk(result)).toBe(true);
  });

  it('should validate reset command', () => {
    const result = CommandSchema.validate({ type: 'reset' });
    expect(isOk(result)).toBe(true);
  });

  it('should reject invalid command type', () => {
    const result = CommandSchema.validate({ type: 'unknown' });
    expect(isErr(result)).toBe(true);
  });

  it('should reject negative amount', () => {
    const result = CommandSchema.validate({ type: 'increment', amount: -5 });
    expect(isErr(result)).toBe(true);
  });

  // API response schema
  const ApiResponseSchema = createZodSchema(
    z.union([
      z.object({
        status: z.literal('success'),
        data: z.record(z.unknown()),
      }),
      z.object({
        status: z.literal('error'),
        error: z.object({
          code: z.string(),
          message: z.string(),
        }),
      }),
    ]),
    'ApiResponse'
  );

  it('should validate success response', () => {
    const result = ApiResponseSchema.validate({
      status: 'success',
      data: { user: { id: 1, name: 'John' } },
    });
    expect(isOk(result)).toBe(true);
  });

  it('should validate error response', () => {
    const result = ApiResponseSchema.validate({
      status: 'error',
      error: { code: 'NOT_FOUND', message: 'Resource not found' },
    });
    expect(isOk(result)).toBe(true);
  });

  it('should reject malformed response', () => {
    const result = ApiResponseSchema.validate({
      status: 'success',
      error: { code: 'ERROR' },
    });
    expect(isErr(result)).toBe(true);
  });
});
