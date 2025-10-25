import { describe, test, expect } from 'bun:test';
import { Secret } from '../src/secret.js';

describe('Secret', () => {
  test('create wraps a value', () => {
    const secret = Secret.create('my-secret');
    expect(secret).toBeDefined();
    expect(secret.expose()).toBe('my-secret');
  });

  test('expose returns the wrapped value', () => {
    const value = { apiKey: 'sk-1234567890', token: 'abc123' };
    const secret = Secret.create(value);
    expect(secret.expose()).toEqual(value);
  });

  test('destroy clears the value', () => {
    const secret = Secret.create('my-secret');
    expect(secret.expose()).toBe('my-secret');

    secret.destroy();
    expect(secret.expose()).toBeUndefined();
  });

  test('isDestroyed returns false initially', () => {
    const secret = Secret.create('my-secret');
    expect(secret.isDestroyed()).toBe(false);
  });

  test('isDestroyed returns true after destroy', () => {
    const secret = Secret.create('my-secret');
    secret.destroy();
    expect(secret.isDestroyed()).toBe(true);
  });

  test('toString returns redacted string', () => {
    const secret = Secret.create('my-secret');
    expect(secret.toString()).toBe('Secret { [REDACTED] }');
  });

  test('toJSON returns redacted string', () => {
    const secret = Secret.create('my-secret');
    expect(secret.toJSON()).toBe('[REDACTED]');
  });

  test('JSON.stringify redacts the value', () => {
    const secret = Secret.create('my-secret');
    const json = JSON.stringify({ apiKey: secret });
    expect(json).toBe('{"apiKey":"[REDACTED]"}');
  });

  test('map transforms the value', () => {
    const secret = Secret.create(42);
    const doubled = secret.map((x) => x * 2);
    expect(doubled.expose()).toBe(84);
  });

  test('map returns destroyed secret when original is destroyed', () => {
    const secret = Secret.create(42);
    secret.destroy();

    const mapped = secret.map((x) => x * 2);
    expect(mapped.isDestroyed()).toBe(true);
    expect(mapped.expose()).toBeUndefined();
  });

  test('multiple secrets are independent', () => {
    const secret1 = Secret.create('secret1');
    const secret2 = Secret.create('secret2');

    secret1.destroy();

    expect(secret1.isDestroyed()).toBe(true);
    expect(secret2.isDestroyed()).toBe(false);
    expect(secret1.expose()).toBeUndefined();
    expect(secret2.expose()).toBe('secret2');
  });

  test('works with different value types', () => {
    const stringSecret = Secret.create('string');
    const numberSecret = Secret.create(123);
    const objectSecret = Secret.create({ key: 'value' });
    const arraySecret = Secret.create([1, 2, 3]);

    expect(stringSecret.expose()).toBe('string');
    expect(numberSecret.expose()).toBe(123);
    expect(objectSecret.expose()).toEqual({ key: 'value' });
    expect(arraySecret.expose()).toEqual([1, 2, 3]);
  });
});
