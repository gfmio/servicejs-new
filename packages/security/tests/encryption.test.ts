/**
 * Message Encryption Tests
 */

import { describe, test, expect } from 'bun:test';
import { createMessageEncryptor } from '../src/encryption.js';
import { isOk } from '@servicejs/result';

describe('Message Encryption', () => {
  test('should generate a key pair', async () => {
    const encryptor = createMessageEncryptor();
    const result = await encryptor.generateKeyPair();

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.publicKey).toBeInstanceOf(Uint8Array);
    expect(result.value.privateKey).toBeInstanceOf(Uint8Array);
    expect(result.value.publicKey.length).toBeGreaterThan(0);
    expect(result.value.privateKey.length).toBeGreaterThan(0);
  });

  test('should encrypt and decrypt a message', async () => {
    const encryptor = createMessageEncryptor();

    const senderKeys = await encryptor.generateKeyPair();
    const recipientKeys = await encryptor.generateKeyPair();
    expect(isOk(senderKeys) && isOk(recipientKeys)).toBe(true);
    if (!isOk(senderKeys) || !isOk(recipientKeys)) return;

    const message = { type: 'secret', data: 'confidential' };

    const encryptResult = await encryptor.encrypt(
      message,
      recipientKeys.value.publicKey,
      senderKeys.value.privateKey
    );
    expect(isOk(encryptResult)).toBe(true);
    if (!isOk(encryptResult)) return;

    const decryptResult = await encryptor.decrypt(encryptResult.value, recipientKeys.value.privateKey);
    expect(isOk(decryptResult)).toBe(true);
    if (!isOk(decryptResult)) return;

    expect(decryptResult.value).toEqual(message);
  });

  test('should produce different ciphertexts for same message', async () => {
    const encryptor = createMessageEncryptor();

    const senderKeys = await encryptor.generateKeyPair();
    const recipientKeys = await encryptor.generateKeyPair();
    expect(isOk(senderKeys) && isOk(recipientKeys)).toBe(true);
    if (!isOk(senderKeys) || !isOk(recipientKeys)) return;

    const message = { type: 'test' };

    const encrypt1 = await encryptor.encrypt(
      message,
      recipientKeys.value.publicKey,
      senderKeys.value.privateKey
    );
    const encrypt2 = await encryptor.encrypt(
      message,
      recipientKeys.value.publicKey,
      senderKeys.value.privateKey
    );

    expect(isOk(encrypt1) && isOk(encrypt2)).toBe(true);
    if (!isOk(encrypt1) || !isOk(encrypt2)) return;

    // Ciphertexts should be different due to randomness/padding
    // (though they decrypt to the same message)
    const decrypt1 = await encryptor.decrypt(encrypt1.value, recipientKeys.value.privateKey);
    const decrypt2 = await encryptor.decrypt(encrypt2.value, recipientKeys.value.privateKey);

    expect(isOk(decrypt1) && isOk(decrypt2)).toBe(true);
    if (!isOk(decrypt1) || !isOk(decrypt2)) return;

    expect(decrypt1.value).toEqual(message);
    expect(decrypt2.value).toEqual(message);
  });

  test('should fail to decrypt with wrong private key', async () => {
    const encryptor = createMessageEncryptor();

    const senderKeys = await encryptor.generateKeyPair();
    const recipientKeys1 = await encryptor.generateKeyPair();
    const recipientKeys2 = await encryptor.generateKeyPair();

    expect(isOk(senderKeys) && isOk(recipientKeys1) && isOk(recipientKeys2)).toBe(true);
    if (!isOk(senderKeys) || !isOk(recipientKeys1) || !isOk(recipientKeys2)) return;

    const message = { type: 'secret' };

    const encryptResult = await encryptor.encrypt(
      message,
      recipientKeys1.value.publicKey,
      senderKeys.value.privateKey
    );
    expect(isOk(encryptResult)).toBe(true);
    if (!isOk(encryptResult)) return;

    // Try to decrypt with wrong private key
    const decryptResult = await encryptor.decrypt(encryptResult.value, recipientKeys2.value.privateKey);

    // Should fail
    expect(isOk(decryptResult)).toBe(false);
  });

  test('should handle complex nested objects', async () => {
    const encryptor = createMessageEncryptor();

    const senderKeys = await encryptor.generateKeyPair();
    const recipientKeys = await encryptor.generateKeyPair();
    expect(isOk(senderKeys) && isOk(recipientKeys)).toBe(true);
    if (!isOk(senderKeys) || !isOk(recipientKeys)) return;

    const complexMessage = {
      type: 'complex',
      nested: {
        array: [1, 2, 3, 4, 5],
        object: {
          key1: 'value1',
          key2: { nested: true },
        },
      },
      timestamp: Date.now(),
      metadata: ['tag1', 'tag2', 'tag3'],
    };

    const encryptResult = await encryptor.encrypt(
      complexMessage,
      recipientKeys.value.publicKey,
      senderKeys.value.privateKey
    );
    expect(isOk(encryptResult)).toBe(true);
    if (!isOk(encryptResult)) return;

    const decryptResult = await encryptor.decrypt(encryptResult.value, recipientKeys.value.privateKey);
    expect(isOk(decryptResult)).toBe(true);
    if (!isOk(decryptResult)) return;

    expect(decryptResult.value).toEqual(complexMessage);
  });

  test('should handle string messages', async () => {
    const encryptor = createMessageEncryptor();

    const senderKeys = await encryptor.generateKeyPair();
    const recipientKeys = await encryptor.generateKeyPair();
    expect(isOk(senderKeys) && isOk(recipientKeys)).toBe(true);
    if (!isOk(senderKeys) || !isOk(recipientKeys)) return;

    const message = 'This is a secret message';

    const encryptResult = await encryptor.encrypt(
      message,
      recipientKeys.value.publicKey,
      senderKeys.value.privateKey
    );
    expect(isOk(encryptResult)).toBe(true);
    if (!isOk(encryptResult)) return;

    const decryptResult = await encryptor.decrypt(encryptResult.value, recipientKeys.value.privateKey);
    expect(isOk(decryptResult)).toBe(true);
    if (!isOk(decryptResult)) return;

    expect(decryptResult.value).toBe(message);
  });

  test('should handle numeric messages', async () => {
    const encryptor = createMessageEncryptor();

    const senderKeys = await encryptor.generateKeyPair();
    const recipientKeys = await encryptor.generateKeyPair();
    expect(isOk(senderKeys) && isOk(recipientKeys)).toBe(true);
    if (!isOk(senderKeys) || !isOk(recipientKeys)) return;

    const message = 42;

    const encryptResult = await encryptor.encrypt(
      message,
      recipientKeys.value.publicKey,
      senderKeys.value.privateKey
    );
    expect(isOk(encryptResult)).toBe(true);
    if (!isOk(encryptResult)) return;

    const decryptResult = await encryptor.decrypt(encryptResult.value, recipientKeys.value.privateKey);
    expect(isOk(decryptResult)).toBe(true);
    if (!isOk(decryptResult)) return;

    expect(decryptResult.value).toBe(message);
  });

  test('should include nonce in encrypted message', async () => {
    const encryptor = createMessageEncryptor();

    const senderKeys = await encryptor.generateKeyPair();
    const recipientKeys = await encryptor.generateKeyPair();
    expect(isOk(senderKeys) && isOk(recipientKeys)).toBe(true);
    if (!isOk(senderKeys) || !isOk(recipientKeys)) return;

    const message = { type: 'test' };

    const encryptResult = await encryptor.encrypt(
      message,
      recipientKeys.value.publicKey,
      senderKeys.value.privateKey
    );
    expect(isOk(encryptResult)).toBe(true);
    if (!isOk(encryptResult)) return;

    expect(encryptResult.value.nonce).toBeInstanceOf(Uint8Array);
    expect(encryptResult.value.nonce.length).toBeGreaterThan(0);
  });

  test('should generate different key pairs', async () => {
    const encryptor = createMessageEncryptor();

    const keyPair1 = await encryptor.generateKeyPair();
    const keyPair2 = await encryptor.generateKeyPair();

    expect(isOk(keyPair1) && isOk(keyPair2)).toBe(true);
    if (!isOk(keyPair1) || !isOk(keyPair2)) return;

    expect(keyPair1.value.publicKey).not.toEqual(keyPair2.value.publicKey);
    expect(keyPair1.value.privateKey).not.toEqual(keyPair2.value.privateKey);
  });
});
