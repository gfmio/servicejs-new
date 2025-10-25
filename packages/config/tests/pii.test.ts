import { describe, test, expect } from 'bun:test';
import { PII } from '../src/pii.js';

describe('PII', () => {
  test('create wraps a value with full redaction by default', () => {
    const pii = PII.create('sensitive@email.com');
    expect(pii).toBeDefined();
    expect(pii.expose()).toBe('sensitive@email.com');
    expect(pii.toString()).toBe('PII { [REDACTED] }');
  });

  test('expose returns the wrapped value', () => {
    const value = 'user@example.com';
    const pii = PII.create(value);
    expect(pii.expose()).toBe(value);
  });

  test('full redaction strategy hides all content', () => {
    const pii = PII.create('123-45-6789', 'full');
    expect(pii.toString()).toBe('PII { [REDACTED] }');
    expect(pii.toJSON()).toBe('[REDACTED]');
  });

  test('partial redaction shows last 4 chars for long strings', () => {
    const pii = PII.create('user@example.com', 'partial');
    const redacted = pii.toJSON();
    expect(redacted).toMatch(/\*+\.com$/);
    expect(redacted).not.toContain('user');
  });

  test('partial redaction shows first and last char for short strings', () => {
    const pii = PII.create('abc', 'partial');
    expect(pii.toJSON()).toBe('a*c');
  });

  test('partial redaction fully redacts very short strings', () => {
    const pii = PII.create('ab', 'partial');
    expect(pii.toJSON()).toBe('[REDACTED]');
  });

  test('hash redaction produces consistent hash', () => {
    const pii1 = PII.create('test@example.com', 'hash');
    const pii2 = PII.create('test@example.com', 'hash');
    expect(pii1.toJSON()).toBe(pii2.toJSON());
    expect(pii1.toJSON()).toMatch(/^\[HASH:[0-9a-f]{8}\]$/);
  });

  test('hash redaction produces different hashes for different values', () => {
    const pii1 = PII.create('test1@example.com', 'hash');
    const pii2 = PII.create('test2@example.com', 'hash');
    expect(pii1.toJSON()).not.toBe(pii2.toJSON());
  });

  test('JSON.stringify redacts the value', () => {
    const pii = PII.create('sensitive@email.com');
    const json = JSON.stringify({ email: pii });
    expect(json).toBe('{"email":"[REDACTED]"}');
  });

  test('JSON.stringify with partial redaction', () => {
    const pii = PII.create('user@example.com', 'partial');
    const json = JSON.stringify({ email: pii });
    expect(json).toMatch(/^{"email":"\*+\.com"}$/);
  });

  test('map transforms the value', () => {
    const pii = PII.create('user@example.com');
    const upper = pii.map((email) => email.toUpperCase());
    expect(upper.expose()).toBe('USER@EXAMPLE.COM');
  });

  test('map preserves redaction strategy', () => {
    const pii = PII.create('test@example.com', 'partial');
    const upper = pii.map((email) => email.toUpperCase());

    const redacted = upper.toJSON();
    expect(redacted).toMatch(/\*+\.COM$/);
  });

  test('works with different value types', () => {
    const stringPII = PII.create('string');
    const numberPII = PII.create(123456789);
    const objectPII = PII.create({ ssn: '123-45-6789' });

    expect(stringPII.expose()).toBe('string');
    expect(numberPII.expose()).toBe(123456789);
    expect(objectPII.expose()).toEqual({ ssn: '123-45-6789' });
  });

  test('multiple PII instances are independent', () => {
    const pii1 = PII.create('secret1', 'full');
    const pii2 = PII.create('secret2', 'partial');

    expect(pii1.toJSON()).toBe('[REDACTED]');
    expect(pii2.toJSON()).not.toBe('[REDACTED]');
  });
});
