/**
 * Token Authentication Tests
 */

import { describe, test, expect } from 'bun:test';
import { createTokenAuthenticator } from '../src/tokens.js';
import { isOk } from '@servicejs/result';

describe('Token Authentication', () => {
  const secret = 'test-secret-key-12345';

  test('should generate a bearer token', async () => {
    const authenticator = createTokenAuthenticator();

    const result = await authenticator.generate('cap-123', 60000, secret);

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.id).toBeDefined();
    expect(result.value.capabilityId).toBe('cap-123');
    expect(result.value.expiresAt).toBeGreaterThan(Date.now());
    expect(result.value.signature).toBeDefined();
    expect(typeof result.value.signature).toBe('string');
  });

  test('should validate a valid token', async () => {
    const authenticator = createTokenAuthenticator();

    const tokenResult = await authenticator.generate('cap-456', 60000, secret);
    expect(isOk(tokenResult)).toBe(true);
    if (!isOk(tokenResult)) return;

    const validationResult = await authenticator.validate(tokenResult.value, secret);
    expect(isOk(validationResult)).toBe(true);
    if (!isOk(validationResult)) return;

    expect(validationResult.value.valid).toBe(true);
    expect(validationResult.value.capabilityId).toBe('cap-456');
  });

  test('should reject token with wrong secret', async () => {
    const authenticator = createTokenAuthenticator();

    const tokenResult = await authenticator.generate('cap-789', 60000, secret);
    expect(isOk(tokenResult)).toBe(true);
    if (!isOk(tokenResult)) return;

    const wrongSecret = 'wrong-secret-key';
    const validationResult = await authenticator.validate(tokenResult.value, wrongSecret);
    expect(isOk(validationResult)).toBe(true);
    if (!isOk(validationResult)) return;

    expect(validationResult.value.valid).toBe(false);
  });

  test('should reject expired token', async () => {
    const authenticator = createTokenAuthenticator();

    // Generate token that expires in 1ms
    const tokenResult = await authenticator.generate('cap-exp', 1, secret);
    expect(isOk(tokenResult)).toBe(true);
    if (!isOk(tokenResult)) return;

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 10));

    const validationResult = await authenticator.validate(tokenResult.value, secret);
    expect(isOk(validationResult)).toBe(true);
    if (!isOk(validationResult)) return;

    expect(validationResult.value.valid).toBe(false);
  });

  test('should reject token with tampered ID', async () => {
    const authenticator = createTokenAuthenticator();

    const tokenResult = await authenticator.generate('cap-tamper', 60000, secret);
    expect(isOk(tokenResult)).toBe(true);
    if (!isOk(tokenResult)) return;

    // Tamper with token ID
    const tamperedToken = {
      ...tokenResult.value,
      id: 'tampered-id',
    };

    const validationResult = await authenticator.validate(tamperedToken, secret);
    expect(isOk(validationResult)).toBe(true);
    if (!isOk(validationResult)) return;

    expect(validationResult.value.valid).toBe(false);
  });

  test('should reject token with tampered capability ID', async () => {
    const authenticator = createTokenAuthenticator();

    const tokenResult = await authenticator.generate('cap-original', 60000, secret);
    expect(isOk(tokenResult)).toBe(true);
    if (!isOk(tokenResult)) return;

    // Tamper with capability ID
    const tamperedToken = {
      ...tokenResult.value,
      capabilityId: 'cap-tampered',
    };

    const validationResult = await authenticator.validate(tamperedToken, secret);
    expect(isOk(validationResult)).toBe(true);
    if (!isOk(validationResult)) return;

    expect(validationResult.value.valid).toBe(false);
  });

  test('should reject token with tampered expiration', async () => {
    const authenticator = createTokenAuthenticator();

    const tokenResult = await authenticator.generate('cap-exp-tamper', 60000, secret);
    expect(isOk(tokenResult)).toBe(true);
    if (!isOk(tokenResult)) return;

    // Tamper with expiration (extend it)
    const tamperedToken = {
      ...tokenResult.value,
      expiresAt: tokenResult.value.expiresAt + 3600000, // Add 1 hour
    };

    const validationResult = await authenticator.validate(tamperedToken, secret);
    expect(isOk(validationResult)).toBe(true);
    if (!isOk(validationResult)) return;

    expect(validationResult.value.valid).toBe(false);
  });

  test('should serialize and deserialize token', async () => {
    const authenticator = createTokenAuthenticator();

    const tokenResult = await authenticator.generate('cap-serial', 60000, secret);
    expect(isOk(tokenResult)).toBe(true);
    if (!isOk(tokenResult)) return;

    const serialized = authenticator.serialize(tokenResult.value);
    expect(typeof serialized).toBe('string');
    expect(serialized.length).toBeGreaterThan(0);

    const deserialized = authenticator.deserialize(serialized);
    expect(isOk(deserialized)).toBe(true);
    if (!isOk(deserialized)) return;

    expect(deserialized.value).toEqual(tokenResult.value);
  });

  test('should validate deserialized token', async () => {
    const authenticator = createTokenAuthenticator();

    const tokenResult = await authenticator.generate('cap-roundtrip', 60000, secret);
    expect(isOk(tokenResult)).toBe(true);
    if (!isOk(tokenResult)) return;

    const serialized = authenticator.serialize(tokenResult.value);
    const deserialized = authenticator.deserialize(serialized);
    expect(isOk(deserialized)).toBe(true);
    if (!isOk(deserialized)) return;

    const validationResult = await authenticator.validate(deserialized.value, secret);
    expect(isOk(validationResult)).toBe(true);
    if (!isOk(validationResult)) return;

    expect(validationResult.value.valid).toBe(true);
    expect(validationResult.value.capabilityId).toBe('cap-roundtrip');
  });

  test('should reject invalid token format', () => {
    const authenticator = createTokenAuthenticator();

    const invalid1 = authenticator.deserialize('invalid');
    expect(isOk(invalid1)).toBe(false);

    const invalid2 = authenticator.deserialize('a.b.c');
    expect(isOk(invalid2)).toBe(false);

    const invalid3 = authenticator.deserialize('a.b.c.d.e');
    expect(isOk(invalid3)).toBe(false);
  });

  test('should reject token with invalid expiration timestamp', () => {
    const authenticator = createTokenAuthenticator();

    const invalidToken = 'id.cap.notanumber.sig';
    const result = authenticator.deserialize(invalidToken);

    expect(isOk(result)).toBe(false);
  });

  test('should generate different tokens for same capability', async () => {
    const authenticator = createTokenAuthenticator();

    const token1 = await authenticator.generate('cap-same', 60000, secret);
    const token2 = await authenticator.generate('cap-same', 60000, secret);

    expect(isOk(token1) && isOk(token2)).toBe(true);
    if (!isOk(token1) || !isOk(token2)) return;

    // IDs should be different
    expect(token1.value.id).not.toBe(token2.value.id);
    // Signatures should be different (because IDs are different)
    expect(token1.value.signature).not.toBe(token2.value.signature);
  });

  test('should handle capability IDs with special characters', async () => {
    const authenticator = createTokenAuthenticator();

    const capabilityId = 'cap:special/chars@123';
    const tokenResult = await authenticator.generate(capabilityId, 60000, secret);
    expect(isOk(tokenResult)).toBe(true);
    if (!isOk(tokenResult)) return;

    const validationResult = await authenticator.validate(tokenResult.value, secret);
    expect(isOk(validationResult)).toBe(true);
    if (!isOk(validationResult)) return;

    expect(validationResult.value.valid).toBe(true);
    expect(validationResult.value.capabilityId).toBe(capabilityId);
  });

  test('should handle long capability IDs', async () => {
    const authenticator = createTokenAuthenticator();

    const longCapId = 'cap-' + 'x'.repeat(200);
    const tokenResult = await authenticator.generate(longCapId, 60000, secret);
    expect(isOk(tokenResult)).toBe(true);
    if (!isOk(tokenResult)) return;

    const serialized = authenticator.serialize(tokenResult.value);
    const deserialized = authenticator.deserialize(serialized);
    expect(isOk(deserialized)).toBe(true);
    if (!isOk(deserialized)) return;

    expect(deserialized.value.capabilityId).toBe(longCapId);
  });

  test('should validate token expiration time correctly', async () => {
    const authenticator = createTokenAuthenticator();

    const expiresIn = 5000; // 5 seconds
    const beforeGeneration = Date.now();

    const tokenResult = await authenticator.generate('cap-time', expiresIn, secret);
    expect(isOk(tokenResult)).toBe(true);
    if (!isOk(tokenResult)) return;

    const afterGeneration = Date.now();

    // Token should expire between beforeGeneration + expiresIn and afterGeneration + expiresIn
    expect(tokenResult.value.expiresAt).toBeGreaterThanOrEqual(beforeGeneration + expiresIn);
    expect(tokenResult.value.expiresAt).toBeLessThanOrEqual(afterGeneration + expiresIn);
  });
});
