/**
 * Token Authentication with HMAC
 *
 * Bearer tokens for capability-based authentication.
 */

import { ok, err, isOk, type Result } from '@servicejs/result';
import type { TokenAuthenticator, BearerToken, SecurityError } from './types.js';

/**
 * Create a token authenticator using HMAC-SHA256
 *
 * Generates bearer tokens that grant access to capabilities.
 * Tokens are signed with HMAC-SHA256 to prevent tampering.
 *
 * Uses the Web Crypto API which is available in:
 * - Modern browsers
 * - Node.js 16+
 * - Deno
 * - Cloudflare Workers
 *
 * @example
 * ```typescript
 * const authenticator = createTokenAuthenticator();
 * const secret = 'my-secret-key';
 *
 * // Generate a token
 * const token = await authenticator.generate(
 *   'capability-123',
 *   60 * 60 * 1000, // 1 hour
 *   secret
 * );
 * if (!isOk(token)) return;
 *
 * // Serialize for transmission
 * const tokenString = authenticator.serialize(token.value);
 *
 * // Deserialize received token
 * const received = authenticator.deserialize(tokenString);
 * if (!isOk(received)) return;
 *
 * // Validate token
 * const validation = await authenticator.validate(received.value, secret);
 * if (isOk(validation) && validation.value.valid) {
 *   console.log('Token is valid for:', validation.value.capabilityId);
 * }
 * ```
 */
export const createTokenAuthenticator = (): TokenAuthenticator => {
  // Check if Web Crypto API is available
  const getCrypto = (): typeof crypto | undefined => {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      return crypto;
    }
    return undefined;
  };

  /**
   * Generate HMAC signature for token data
   */
  const sign = async (data: string, secret: string): Promise<Result<string, SecurityError>> => {
    try {
      const cryptoAPI = getCrypto();
      if (!cryptoAPI) {
        return err({
          type: 'NOT_SUPPORTED',
          message: 'Web Crypto API is not available',
        });
      }

      // Import secret as HMAC key
      const keyData = new TextEncoder().encode(secret);
      const key = await cryptoAPI.subtle.importKey(
        'raw',
        keyData,
        {
          name: 'HMAC',
          hash: 'SHA-256',
        },
        false,
        ['sign']
      );

      // Sign the data
      const signatureBuffer = await cryptoAPI.subtle.sign('HMAC', key, new TextEncoder().encode(data));

      // Convert to hex string
      const signatureArray = Array.from(new Uint8Array(signatureBuffer));
      const signatureHex = signatureArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      return ok(signatureHex);
    } catch (error) {
      return err({
        type: 'SIGNING_ERROR',
        message: 'Failed to sign token',
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  };

  /**
   * Generate a random token ID
   */
  const generateId = (): string => {
    const cryptoAPI = getCrypto();
    if (!cryptoAPI) {
      // Fallback to Math.random (not cryptographically secure)
      return Math.random().toString(36).substring(2);
    }

    const bytes = cryptoAPI.getRandomValues(new Uint8Array(16));
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };

  return {
    async generate(
      capabilityId: string,
      expiresIn: number,
      secret: string
    ): Promise<Result<BearerToken, SecurityError>> {
      try {
        const id = generateId();
        const expiresAt = Date.now() + expiresIn;

        // Create token data
        const tokenData = `${id}:${capabilityId}:${expiresAt}`;

        // Sign the token
        const signatureResult = await sign(tokenData, secret);
        if (!isOk(signatureResult)) {
          return err({
            type: 'SIGNING_ERROR',
            message: 'Failed to sign token',
          });
        }

        return ok({
          id,
          capabilityId,
          expiresAt,
          signature: signatureResult.value,
        });
      } catch (error) {
        return err({
          type: 'SIGNING_ERROR',
          message: 'Failed to generate token',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },

    async validate(
      token: BearerToken,
      secret: string
    ): Promise<Result<{ valid: boolean; capabilityId: string }, SecurityError>> {
      try {
        // Check expiration
        if (Date.now() > token.expiresAt) {
          return ok({
            valid: false,
            capabilityId: token.capabilityId,
          });
        }

        // Re-compute signature
        const tokenData = `${token.id}:${token.capabilityId}:${token.expiresAt}`;
        const expectedSignatureResult = await sign(tokenData, secret);
        if (!isOk(expectedSignatureResult)) {
          return err({
            type: 'VERIFICATION_ERROR',
            message: 'Failed to compute signature for validation',
          });
        }

        // Compare signatures (timing-safe comparison)
        const expected = expectedSignatureResult.value;
        const actual = token.signature;

        if (expected.length !== actual.length) {
          return ok({
            valid: false,
            capabilityId: token.capabilityId,
          });
        }

        // Timing-safe comparison
        let diff = 0;
        for (let i = 0; i < expected.length; i++) {
          diff |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
        }

        return ok({
          valid: diff === 0,
          capabilityId: token.capabilityId,
        });
      } catch (error) {
        return err({
          type: 'VERIFICATION_ERROR',
          message: 'Failed to validate token',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },

    serialize(token: BearerToken): string {
      // Format: id.capabilityId.expiresAt.signature
      return `${token.id}.${token.capabilityId}.${token.expiresAt}.${token.signature}`;
    },

    deserialize(tokenString: string): Result<BearerToken, SecurityError> {
      try {
        const parts = tokenString.split('.');
        if (parts.length !== 4) {
          return err({
            type: 'INVALID_TOKEN',
            message: 'Invalid token format',
          });
        }

        const [id, capabilityId, expiresAtStr, signature] = parts;

        if (!id || !capabilityId || !expiresAtStr || !signature) {
          return err({
            type: 'INVALID_TOKEN',
            message: 'Missing token parts',
          });
        }

        const expiresAt = parseInt(expiresAtStr, 10);
        if (isNaN(expiresAt)) {
          return err({
            type: 'INVALID_TOKEN',
            message: 'Invalid expiration timestamp',
          });
        }

        return ok({
          id,
          capabilityId,
          expiresAt,
          signature,
        });
      } catch (error) {
        return err({
          type: 'INVALID_TOKEN',
          message: 'Failed to deserialize token',
        });
      }
    },
  };
};
