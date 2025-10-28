/**
 * Message Signing Tests
 */

import { describe, test, expect } from 'bun:test';
import { createMessageSigner } from '../src/signing.js';
import { isOk, isErr } from '@servicejs/result';

describe('Message Signing', () => {
  test('should generate a key pair', async () => {
    const signer = createMessageSigner();
    const result = await signer.generateKeyPair();

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.publicKey).toBeInstanceOf(Uint8Array);
    expect(result.value.privateKey).toBeInstanceOf(Uint8Array);
    expect(result.value.publicKey.length).toBeGreaterThan(0);
    expect(result.value.privateKey.length).toBeGreaterThan(0);
  });

  test('should sign a message', async () => {
    const signer = createMessageSigner();

    const keyPairResult = await signer.generateKeyPair();
    expect(isOk(keyPairResult)).toBe(true);
    if (!isOk(keyPairResult)) return;

    const message = { type: 'hello', data: 'world' };
    const signResult = await signer.sign(message, keyPairResult.value);

    expect(isOk(signResult)).toBe(true);
    if (!isOk(signResult)) return;

    expect(signResult.value.message).toEqual(message);
    expect(signResult.value.signature).toBeInstanceOf(Uint8Array);
    expect(signResult.value.publicKey).toEqual(keyPairResult.value.publicKey);
  });

  test('should verify a valid signature', async () => {
    const signer = createMessageSigner();

    const keyPairResult = await signer.generateKeyPair();
    expect(isOk(keyPairResult)).toBe(true);
    if (!isOk(keyPairResult)) return;

    const message = { type: 'test', value: 42 };
    const signResult = await signer.sign(message, keyPairResult.value);
    expect(isOk(signResult)).toBe(true);
    if (!isOk(signResult)) return;

    const verifyResult = await signer.verify(signResult.value);
    expect(isOk(verifyResult)).toBe(true);
    if (!isOk(verifyResult)) return;

    expect(verifyResult.value.valid).toBe(true);
    expect(verifyResult.value.message).toEqual(message);
  });

  test('should reject an invalid signature', async () => {
    const signer = createMessageSigner();

    const keyPairResult = await signer.generateKeyPair();
    expect(isOk(keyPairResult)).toBe(true);
    if (!isOk(keyPairResult)) return;

    const message = { type: 'test' };
    const signResult = await signer.sign(message, keyPairResult.value);
    expect(isOk(signResult)).toBe(true);
    if (!isOk(signResult)) return;

    // Tamper with signature
    const tampered = {
      ...signResult.value,
      signature: new Uint8Array(signResult.value.signature.length).fill(0),
    };

    const verifyResult = await signer.verify(tampered);
    expect(isOk(verifyResult)).toBe(true);
    if (!isOk(verifyResult)) return;

    expect(verifyResult.value.valid).toBe(false);
  });

  test('should reject signature from wrong key', async () => {
    const signer = createMessageSigner();

    const keyPair1Result = await signer.generateKeyPair();
    const keyPair2Result = await signer.generateKeyPair();
    expect(isOk(keyPair1Result) && isOk(keyPair2Result)).toBe(true);
    if (!isOk(keyPair1Result) || !isOk(keyPair2Result)) return;

    const message = { type: 'test' };
    const signResult = await signer.sign(message, keyPair1Result.value);
    expect(isOk(signResult)).toBe(true);
    if (!isOk(signResult)) return;

    // Use wrong public key
    const wrongKey = {
      ...signResult.value,
      publicKey: keyPair2Result.value.publicKey,
    };

    const verifyResult = await signer.verify(wrongKey);
    expect(isOk(verifyResult)).toBe(true);
    if (!isOk(verifyResult)) return;

    expect(verifyResult.value.valid).toBe(false);
  });

  test('should handle complex message types', async () => {
    const signer = createMessageSigner();

    const keyPairResult = await signer.generateKeyPair();
    expect(isOk(keyPairResult)).toBe(true);
    if (!isOk(keyPairResult)) return;

    const complexMessage = {
      type: 'complex',
      nested: {
        array: [1, 2, 3],
        object: { key: 'value' },
      },
      timestamp: Date.now(),
    };

    const signResult = await signer.sign(complexMessage, keyPairResult.value);
    expect(isOk(signResult)).toBe(true);
    if (!isOk(signResult)) return;

    const verifyResult = await signer.verify(signResult.value);
    expect(isOk(verifyResult)).toBe(true);
    if (!isOk(verifyResult)) return;

    expect(verifyResult.value.valid).toBe(true);
    expect(verifyResult.value.message).toEqual(complexMessage);
  });

  test('should detect message tampering', async () => {
    const signer = createMessageSigner();

    const keyPairResult = await signer.generateKeyPair();
    expect(isOk(keyPairResult)).toBe(true);
    if (!isOk(keyPairResult)) return;

    const message = { type: 'original', value: 100 };
    const signResult = await signer.sign(message, keyPairResult.value);
    expect(isOk(signResult)).toBe(true);
    if (!isOk(signResult)) return;

    // Tamper with message content
    const tampered = {
      ...signResult.value,
      message: { type: 'tampered', value: 999 },
    };

    const verifyResult = await signer.verify(tampered);
    expect(isOk(verifyResult)).toBe(true);
    if (!isOk(verifyResult)) return;

    expect(verifyResult.value.valid).toBe(false);
  });

  test('should generate different signatures for different messages', async () => {
    const signer = createMessageSigner();

    const keyPairResult = await signer.generateKeyPair();
    expect(isOk(keyPairResult)).toBe(true);
    if (!isOk(keyPairResult)) return;

    const message1 = { type: 'msg1' };
    const message2 = { type: 'msg2' };

    const sign1 = await signer.sign(message1, keyPairResult.value);
    const sign2 = await signer.sign(message2, keyPairResult.value);

    expect(isOk(sign1) && isOk(sign2)).toBe(true);
    if (!isOk(sign1) || !isOk(sign2)) return;

    expect(sign1.value.signature).not.toEqual(sign2.value.signature);
  });

  test('should generate different key pairs', async () => {
    const signer = createMessageSigner();

    const keyPair1 = await signer.generateKeyPair();
    const keyPair2 = await signer.generateKeyPair();

    expect(isOk(keyPair1) && isOk(keyPair2)).toBe(true);
    if (!isOk(keyPair1) || !isOk(keyPair2)) return;

    expect(keyPair1.value.publicKey).not.toEqual(keyPair2.value.publicKey);
    expect(keyPair1.value.privateKey).not.toEqual(keyPair2.value.privateKey);
  });
});
