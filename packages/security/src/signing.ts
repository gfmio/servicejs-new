/**
 * Message Signing with ECDSA P-256
 *
 * Uses Web Crypto API for digital signatures.
 */

import { ok, err, isOk, type Result } from '@servicejs/result';
import type {
  MessageSigner,
  KeyPair,
  SignedMessage,
  SecurityError,
} from './types.js';

/**
 * Create a message signer using ECDSA P-256
 *
 * Uses the Web Crypto API which is available in:
 * - Modern browsers
 * - Node.js 16+
 * - Deno
 * - Cloudflare Workers
 *
 * @example
 * ```typescript
 * const signer = createMessageSigner();
 *
 * // Generate keys
 * const keyPair = await signer.generateKeyPair();
 * if (!isOk(keyPair)) return;
 *
 * // Sign a message
 * const signed = await signer.sign({ type: 'hello' }, keyPair.value.privateKey);
 * if (!isOk(signed)) return;
 *
 * // Verify signature
 * const verified = await signer.verify(signed.value);
 * if (isOk(verified) && verified.value.valid) {
 *   console.log('Signature is valid!');
 * }
 * ```
 */
export const createMessageSigner = (): MessageSigner => {
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

  const importKey = async (
    keyData: Uint8Array,
    keyType: 'private' | 'public'
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
        keyType === 'private' ? 'pkcs8' : 'spki',
        keyData,
        {
          name: 'ECDSA',
          namedCurve: 'P-256',
        },
        true,
        keyType === 'private' ? ['sign'] : ['verify']
      );

      return ok(key);
    } catch (error) {
      return err({
        type: 'INVALID_KEY',
        message: `Failed to import ${keyType} key`,
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

        // Generate ECDSA P-256 key pair
        const keyPair = await cryptoAPI.subtle.generateKey(
          {
            name: 'ECDSA',
            namedCurve: 'P-256',
          },
          true,
          ['sign', 'verify']
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

    async sign<T>(
      message: T,
      keyPair: KeyPair
    ): Promise<Result<SignedMessage<T>, SecurityError>> {
      try {
        const cryptoAPI = getCrypto();
        if (!cryptoAPI) {
          return err({
            type: 'NOT_SUPPORTED',
            message: 'Web Crypto API is not available',
          });
        }

        // Import private key
        const keyResult = await importKey(keyPair.privateKey, 'private');
        if (!isOk(keyResult)) {
          return err({
            type: 'SIGNING_ERROR',
            message: 'Failed to import private key for signing',
          });
        }

        // Serialize message
        const messageData = new TextEncoder().encode(JSON.stringify(message));

        // Sign message
        const signatureBuffer = await cryptoAPI.subtle.sign(
          {
            name: 'ECDSA',
            hash: 'SHA-256',
          },
          keyResult.value,
          messageData
        );

        const signature = new Uint8Array(signatureBuffer);

        return ok({
          message,
          signature,
          publicKey: keyPair.publicKey,
        });
      } catch (error) {
        return err({
          type: 'SIGNING_ERROR',
          message: 'Failed to sign message',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },

    async verify<T>(
      signedMessage: SignedMessage<T>
    ): Promise<Result<{ valid: boolean; message: T }, SecurityError>> {
      try {
        const cryptoAPI = getCrypto();
        if (!cryptoAPI) {
          return err({
            type: 'NOT_SUPPORTED',
            message: 'Web Crypto API is not available',
          });
        }

        // Import public key
        const keyResult = await importKey(signedMessage.publicKey, 'public');
        if (!isOk(keyResult)) {
          return err({
            type: 'VERIFICATION_ERROR',
            message: 'Failed to import public key for verification',
          });
        }

        // Serialize message
        const messageData = new TextEncoder().encode(JSON.stringify(signedMessage.message));

        // Verify signature
        const valid = await cryptoAPI.subtle.verify(
          {
            name: 'ECDSA',
            hash: 'SHA-256',
          },
          keyResult.value,
          signedMessage.signature,
          messageData
        );

        return ok({
          valid,
          message: signedMessage.message,
        });
      } catch (error) {
        return err({
          type: 'VERIFICATION_ERROR',
          message: 'Failed to verify signature',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },
  };
};

