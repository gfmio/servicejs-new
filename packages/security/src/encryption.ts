/**
 * Message Encryption with RSA-OAEP
 *
 * Uses Web Crypto API for public key encryption.
 */

import { ok, err, isOk, type Result } from '@servicejs/result';
import type {
  MessageEncryptor,
  KeyPair,
  EncryptedMessage,
  SecurityError,
} from './types.js';

/**
 * Create a message encryptor using RSA-OAEP
 *
 * Uses the Web Crypto API which is available in:
 * - Modern browsers
 * - Node.js 16+
 * - Deno
 * - Cloudflare Workers
 *
 * Note: For large messages, consider storing the message in CAS
 * and encrypting just the content address instead.
 *
 * @example
 * ```typescript
 * const encryptor = createMessageEncryptor();
 *
 * // Generate key pairs for sender and recipient
 * const senderKeys = await encryptor.generateKeyPair();
 * const recipientKeys = await encryptor.generateKeyPair();
 * if (!isOk(senderKeys) || !isOk(recipientKeys)) return;
 *
 * // Encrypt a message
 * const encrypted = await encryptor.encrypt(
 *   { type: 'secret', data: 'confidential' },
 *   recipientKeys.value.publicKey,
 *   senderKeys.value.privateKey
 * );
 * if (!isOk(encrypted)) return;
 *
 * // Decrypt the message
 * const decrypted = await encryptor.decrypt(
 *   encrypted.value,
 *   recipientKeys.value.privateKey
 * );
 * if (isOk(decrypted)) {
 *   console.log('Decrypted:', decrypted.value);
 * }
 * ```
 */
export const createMessageEncryptor = (): MessageEncryptor => {
  // Check if Web Crypto API is available
  const getCrypto = (): typeof crypto | undefined => {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      return crypto;
    }
    return undefined;
  };

  const exportKey = async (key: CryptoKey): Promise<Result<Uint8Array, SecurityError>> => {
    try {
      const cryptoAPI = getCrypto();
      if (!cryptoAPI) {
        return err({
          type: 'NOT_SUPPORTED',
          message: 'Web Crypto API is not available',
        });
      }

      const exported = await cryptoAPI.subtle.exportKey(
        key.type === 'private' ? 'pkcs8' : 'spki',
        key
      );
      return ok(new Uint8Array(exported));
    } catch (error) {
      return err({
        type: 'KEY_GENERATION_ERROR',
        message: 'Failed to export key',
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  };

  const importPublicKey = async (
    keyData: Uint8Array
  ): Promise<Result<CryptoKey, SecurityError>> => {
    try {
      const cryptoAPI = getCrypto();
      if (!cryptoAPI) {
        return err({
          type: 'NOT_SUPPORTED',
          message: 'Web Crypto API is not available',
        });
      }

      const key = await cryptoAPI.subtle.importKey(
        'spki',
        keyData,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        true,
        ['encrypt']
      );

      return ok(key);
    } catch (error) {
      return err({
        type: 'INVALID_KEY',
        message: 'Failed to import public key',
      });
    }
  };

  const importPrivateKey = async (
    keyData: Uint8Array
  ): Promise<Result<CryptoKey, SecurityError>> => {
    try {
      const cryptoAPI = getCrypto();
      if (!cryptoAPI) {
        return err({
          type: 'NOT_SUPPORTED',
          message: 'Web Crypto API is not available',
        });
      }

      const key = await cryptoAPI.subtle.importKey(
        'pkcs8',
        keyData,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        true,
        ['decrypt']
      );

      return ok(key);
    } catch (error) {
      return err({
        type: 'INVALID_KEY',
        message: 'Failed to import private key',
      });
    }
  };

  return {
    async generateKeyPair(): Promise<Result<KeyPair, SecurityError>> {
      try {
        const cryptoAPI = getCrypto();
        if (!cryptoAPI) {
          return err({
            type: 'NOT_SUPPORTED',
            message: 'Web Crypto API is not available',
          });
        }

        // Generate RSA-OAEP key pair
        const keyPair = await cryptoAPI.subtle.generateKey(
          {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256',
          },
          true,
          ['encrypt', 'decrypt']
        );

        // Export keys as Uint8Array
        const publicKeyResult = await exportKey(keyPair.publicKey);
        if (!isOk(publicKeyResult)) {
          return err({
            type: 'KEY_GENERATION_ERROR',
            message: 'Failed to export public key',
          });
        }

        const privateKeyResult = await exportKey(keyPair.privateKey);
        if (!isOk(privateKeyResult)) {
          return err({
            type: 'KEY_GENERATION_ERROR',
            message: 'Failed to export private key',
          });
        }

        return ok({
          publicKey: publicKeyResult.value,
          privateKey: privateKeyResult.value,
        });
      } catch (error) {
        return err({
          type: 'KEY_GENERATION_ERROR',
          message: 'Failed to generate key pair',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },

    async encrypt<T>(
      message: T,
      recipientPublicKey: Uint8Array,
      _senderPrivateKey: Uint8Array
    ): Promise<Result<EncryptedMessage, SecurityError>> {
      try {
        const cryptoAPI = getCrypto();
        if (!cryptoAPI) {
          return err({
            type: 'NOT_SUPPORTED',
            message: 'Web Crypto API is not available',
          });
        }

        // Import recipient's public key
        const publicKeyResult = await importPublicKey(recipientPublicKey);
        if (!isOk(publicKeyResult)) {
          return err({
            type: 'ENCRYPTION_ERROR',
            message: 'Failed to import recipient public key',
          });
        }

        // Serialize message
        const messageData = new TextEncoder().encode(JSON.stringify(message));

        // RSA-OAEP doesn't need an explicit nonce, but we'll generate one for consistency
        // with other encryption schemes and to allow future algorithm changes
        const nonce = cryptoAPI.getRandomValues(new Uint8Array(16));

        // Encrypt message
        const ciphertextBuffer = await cryptoAPI.subtle.encrypt(
          {
            name: 'RSA-OAEP',
          },
          publicKeyResult.value,
          messageData
        );

        const ciphertext = new Uint8Array(ciphertextBuffer);

        // For RSA-OAEP, we don't actually use the sender's private key
        // since it's not authenticated encryption. For authentication, use signing separately.
        // Store a placeholder or the sender's public key for identification
        const senderPublicKey = new Uint8Array(0); // Placeholder

        return ok({
          ciphertext,
          nonce,
          senderPublicKey,
        });
      } catch (error) {
        return err({
          type: 'ENCRYPTION_ERROR',
          message: 'Failed to encrypt message',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },

    async decrypt<T>(
      encrypted: EncryptedMessage,
      recipientPrivateKey: Uint8Array
    ): Promise<Result<T, SecurityError>> {
      try {
        const cryptoAPI = getCrypto();
        if (!cryptoAPI) {
          return err({
            type: 'NOT_SUPPORTED',
            message: 'Web Crypto API is not available',
          });
        }

        // Import recipient's private key
        const privateKeyResult = await importPrivateKey(recipientPrivateKey);
        if (!isOk(privateKeyResult)) {
          return err({
            type: 'DECRYPTION_ERROR',
            message: 'Failed to import recipient private key',
          });
        }

        // Decrypt message
        const decryptedBuffer = await cryptoAPI.subtle.decrypt(
          {
            name: 'RSA-OAEP',
          },
          privateKeyResult.value,
          encrypted.ciphertext
        );

        // Deserialize message
        const messageData = new TextDecoder().decode(decryptedBuffer);
        const message = JSON.parse(messageData) as T;

        return ok(message);
      } catch (error) {
        return err({
          type: 'DECRYPTION_ERROR',
          message: 'Failed to decrypt message',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },
  };
};
