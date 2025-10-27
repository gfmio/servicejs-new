import { describe, it, expect } from 'bun:test';
import { z } from 'zod';
import { createCapability } from '@servicejs/core';
import {
  createZodSchema,
  withValidation,
  withValidationFilter,
  withValidationTransform,
  SchemaValidationError,
} from '../src/index.js';

describe('withValidation', () => {
  const schema = createZodSchema(
    z.object({
      type: z.literal('test'),
      value: z.number().int().positive(),
    })
  );

  it('should forward valid messages', () => {
    let received: any = null;
    const cap = createCapability((msg) => {
      received = msg;
    });

    const validated = withValidation(cap, schema);

    validated.send({ type: 'test', value: 42 });

    expect(received).toEqual({ type: 'test', value: 42 });
  });

  it('should throw SchemaValidationError on invalid message', () => {
    const cap = createCapability((msg) => {
      // Should not be called
      throw new Error('Should not reach here');
    });

    const validated = withValidation(cap, schema);

    expect(() => {
      validated.send({ type: 'test', value: -5 } as any);
    }).toThrow(SchemaValidationError);
  });

  it('should include error details in thrown error', () => {
    const cap = createCapability((msg) => {});
    const validated = withValidation(cap, schema);

    try {
      validated.send({ type: 'wrong', value: 42 } as any);
      throw new Error('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      if (error instanceof SchemaValidationError) {
        expect(error.errors.length).toBeGreaterThan(0);
        expect(error.message).toContain('Schema validation failed');
      }
    }
  });

  it('should validate complex message types', () => {
    const commandSchema = createZodSchema(
      z.discriminatedUnion('type', [
        z.object({ type: z.literal('increment'), amount: z.number() }),
        z.object({ type: z.literal('reset') }),
      ])
    );

    let received: any = null;
    const cap = createCapability((msg) => {
      received = msg;
    });
    const validated = withValidation(cap, commandSchema);

    // Valid increment
    validated.send({ type: 'increment', amount: 5 });
    expect(received).toEqual({ type: 'increment', amount: 5 });

    // Valid reset
    validated.send({ type: 'reset' });
    expect(received).toEqual({ type: 'reset' });

    // Invalid type
    expect(() => {
      validated.send({ type: 'invalid' } as any);
    }).toThrow(SchemaValidationError);
  });
});

describe('withValidationFilter', () => {
  const schema = createZodSchema(
    z.object({
      type: z.literal('allowed'),
      value: z.string(),
    })
  );

  it('should forward valid messages', () => {
    let received: any = null;
    const cap = createCapability((msg) => {
      received = msg;
    });

    const filtered = withValidationFilter(cap, schema);

    filtered.send({ type: 'allowed', value: 'test' });

    expect(received).toEqual({ type: 'allowed', value: 'test' });
  });

  it('should silently drop invalid messages', () => {
    let received: any = null;
    const cap = createCapability((msg) => {
      received = msg;
    });

    const filtered = withValidationFilter(cap, schema);

    // Send invalid message
    filtered.send({ type: 'invalid', value: 123 } as any);

    // Should not have been forwarded
    expect(received).toBeNull();
  });

  it('should call onError callback for invalid messages', () => {
    let errorCalled = false;
    let errorDetails: any = null;

    const cap = createCapability((msg) => {});
    const filtered = withValidationFilter(cap, schema, (errors) => {
      errorCalled = true;
      errorDetails = errors;
    });

    filtered.send({ type: 'invalid' } as any);

    expect(errorCalled).toBe(true);
    expect(errorDetails).toBeDefined();
    expect(Array.isArray(errorDetails)).toBe(true);
    expect(errorDetails.length).toBeGreaterThan(0);
  });

  it('should not call onError for valid messages', () => {
    let errorCalled = false;

    const cap = createCapability((msg) => {});
    const filtered = withValidationFilter(cap, schema, () => {
      errorCalled = true;
    });

    filtered.send({ type: 'allowed', value: 'test' });

    expect(errorCalled).toBe(false);
  });

  it('should work without onError callback', () => {
    const cap = createCapability((msg) => {});
    const filtered = withValidationFilter(cap, schema);

    // Should not throw
    expect(() => {
      filtered.send({ type: 'invalid' } as any);
    }).not.toThrow();
  });
});

describe('withValidationTransform', () => {
  it('should validate and transform messages', () => {
    const schema = createZodSchema(
      z.object({
        type: z.literal('message'),
        text: z.string().transform(s => s.toUpperCase()),
      })
    );

    let received: any = null;
    const cap = createCapability((msg) => {
      received = msg;
    });

    const transformed = withValidationTransform(cap, schema);

    transformed.send({ type: 'message', text: 'hello' });

    expect(received).toEqual({ type: 'message', text: 'HELLO' });
  });

  it('should throw on invalid messages', () => {
    const schema = createZodSchema(
      z.object({
        type: z.literal('message'),
        text: z.string(),
      })
    );

    const cap = createCapability((msg) => {});
    const transformed = withValidationTransform(cap, schema);

    expect(() => {
      transformed.send({ type: 'wrong' } as any);
    }).toThrow(SchemaValidationError);
  });

  it('should normalize data with transforms', () => {
    const schema = createZodSchema(
      z.object({
        type: z.literal('user'),
        email: z.string().transform(s => s.toLowerCase().trim()).pipe(z.string().email()),
        age: z.number().int().transform(n => Math.max(0, Math.min(120, n))),
      })
    );

    let received: any = null;
    const cap = createCapability((msg) => {
      received = msg;
    });

    const normalized = withValidationTransform(cap, schema);

    normalized.send({
      type: 'user',
      email: '  USER@EXAMPLE.COM  ',
      age: 150, // Will be clamped to 120
    });

    expect(received).toEqual({
      type: 'user',
      email: 'user@example.com',
      age: 120,
    });
  });

  it('should work with refinements', () => {
    const schema = createZodSchema(
      z.object({
        type: z.literal('password'),
        value: z.string().refine(
          s => s.length >= 8,
          'Password must be at least 8 characters'
        ),
      })
    );

    let received: any = null;
    const cap = createCapability((msg) => {
      received = msg;
    });

    const validated = withValidationTransform(cap, schema);

    // Valid password
    validated.send({ type: 'password', value: 'securepass123' });
    expect(received).toEqual({ type: 'password', value: 'securepass123' });

    // Invalid password
    expect(() => {
      validated.send({ type: 'password', value: 'short' });
    }).toThrow(SchemaValidationError);
  });
});

describe('Real-world validated capability scenarios', () => {
  // API request validation
  it('should validate API requests', () => {
    const RequestSchema = createZodSchema(
      z.discriminatedUnion('method', [
        z.object({
          method: z.literal('GET'),
          path: z.string(),
          headers: z.record(z.string()).optional(),
        }),
        z.object({
          method: z.literal('POST'),
          path: z.string(),
          body: z.unknown(),
          headers: z.record(z.string()).optional(),
        }),
      ])
    );

    const requests: any[] = [];
    const apiCap = createCapability((req) => {
      requests.push(req);
    });

    const validatedApi = withValidation(apiCap, RequestSchema);

    // Valid GET request
    validatedApi.send({
      method: 'GET',
      path: '/users',
      headers: { 'Accept': 'application/json' },
    });

    // Valid POST request
    validatedApi.send({
      method: 'POST',
      path: '/users',
      body: { name: 'John' },
    });

    expect(requests.length).toBe(2);

    // Invalid request (missing required field)
    expect(() => {
      validatedApi.send({
        method: 'GET',
      } as any);
    }).toThrow(SchemaValidationError);
  });

  // Command validation with error logging
  it('should filter invalid commands with logging', () => {
    const CommandSchema = createZodSchema(
      z.object({
        type: z.enum(['create', 'update', 'delete']),
        id: z.string().uuid(),
        data: z.record(z.unknown()).optional(),
      })
    );

    const commands: any[] = [];
    const errors: any[] = [];

    const commandCap = createCapability((cmd) => {
      commands.push(cmd);
    });

    const filtered = withValidationFilter(
      commandCap,
      CommandSchema,
      (errs) => {
        errors.push(errs);
      }
    );

    // Valid command
    filtered.send({
      type: 'create',
      id: '550e8400-e29b-41d4-a716-446655440000',
      data: { name: 'Test' },
    });

    // Invalid command (bad UUID)
    filtered.send({
      type: 'update',
      id: 'not-a-uuid',
    } as any);

    // Invalid command (bad type)
    filtered.send({
      type: 'invalid',
      id: '550e8400-e29b-41d4-a716-446655440000',
    } as any);

    // Only valid command should be processed
    expect(commands.length).toBe(1);
    expect(commands[0].type).toBe('create');

    // Two errors should be logged
    expect(errors.length).toBe(2);
  });

  // Message normalization
  it('should normalize user input', () => {
    const UserInputSchema = createZodSchema(
      z.object({
        type: z.literal('user-input'),
        username: z.string()
          .trim()
          .toLowerCase()
          .transform(s => s.replace(/[^a-z0-9_]/g, '')),
        email: z.string()
          .transform(s => s.toLowerCase().trim())
          .pipe(z.string().email()),
      })
    );

    let received: any = null;
    const processCap = createCapability((msg) => {
      received = msg;
    });

    const normalized = withValidationTransform(processCap, UserInputSchema);

    normalized.send({
      type: 'user-input',
      username: '  John_Doe123!@#  ',
      email: '  USER@EXAMPLE.COM  ',
    });

    expect(received).toEqual({
      type: 'user-input',
      username: 'john_doe123',
      email: 'user@example.com',
    });
  });
});
