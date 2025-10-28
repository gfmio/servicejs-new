/**
 * Security Types for ServiceJS
 *
 * Defines types for message signing, encryption, and authentication.
 */

import type { Result } from '@servicejs/result';

/**
 * Security error types
 */
export type SecurityError =
  | { type: 'INVALID_KEY'; message: string }
  | { type: 'INVALID_SIGNATURE'; message: string }
  | { type: 'INVALID_TOKEN'; message: string }
  | { type: 'EXPIRED_TOKEN'; message: string; expiredAt: number }
  | { type: 'ENCRYPTION_ERROR'; message: string; error?: Error }
  | { type: 'DECRYPTION_ERROR'; message: string; error?: Error }
  | { type: 'SIGNING_ERROR'; message: string; error?: Error }
  | { type: 'VERIFICATION_ERROR'; message: string; error?: Error }
  | { type: 'KEY_GENERATION_ERROR'; message: string; error?: Error }
  | { type: 'NOT_SUPPORTED'; message: string };

/**
 * Key pair for asymmetric cryptography
 */
export interface KeyPair {
  /**
   * Public key (can be shared)
   */
  publicKey: Uint8Array;

  /**
   * Private key (must be kept secret)
   */
  privateKey: Uint8Array;
}

/**
 * Signed message with signature
 */
export interface SignedMessage<T = unknown> {
  /**
   * The message payload
   */
  message: T;

  /**
   * Digital signature
   */
  signature: Uint8Array;

  /**
   * Public key of signer (for verification)
   */
  publicKey: Uint8Array;
}

/**
 * Encrypted message
 */
export interface EncryptedMessage {
  /**
   * Encrypted ciphertext
   */
  ciphertext: Uint8Array;

  /**
   * Nonce/IV used for encryption
   */
  nonce: Uint8Array;

  /**
   * Public key of sender (for recipient to decrypt)
   */
  senderPublicKey: Uint8Array;
}

/**
 * Bearer token for capability authentication
 */
export interface BearerToken {
  /**
   * Unique token ID
   */
  id: string;

  /**
   * Capability identifier this token grants access to
   */
  capabilityId: string;

  /**
   * Token expiration timestamp (milliseconds since epoch)
   */
  expiresAt: number;

  /**
   * HMAC signature of the token
   */
  signature: string;
}

/**
 * Message signing interface
 */
export interface MessageSigner {
  /**
   * Generate a new key pair for signing
   */
  generateKeyPair(): Promise<Result<KeyPair, SecurityError>>;

  /**
   * Sign a message with a key pair
   */
  sign<T>(message: T, keyPair: KeyPair): Promise<Result<SignedMessage<T>, SecurityError>>;

  /**
   * Verify a signed message
   */
  verify<T>(
    signedMessage: SignedMessage<T>
  ): Promise<Result<{ valid: boolean; message: T }, SecurityError>>;
}

/**
 * Message encryption interface
 */
export interface MessageEncryptor {
  /**
   * Generate a new key pair for encryption
   */
  generateKeyPair(): Promise<Result<KeyPair, SecurityError>>;

  /**
   * Encrypt a message for a recipient
   *
   * @param message - Message to encrypt
   * @param recipientPublicKey - Recipient's public key
   * @param senderPrivateKey - Sender's private key
   */
  encrypt<T>(
    message: T,
    recipientPublicKey: Uint8Array,
    senderPrivateKey: Uint8Array
  ): Promise<Result<EncryptedMessage, SecurityError>>;

  /**
   * Decrypt a message
   *
   * @param encrypted - Encrypted message
   * @param recipientPrivateKey - Recipient's private key
   */
  decrypt<T>(
    encrypted: EncryptedMessage,
    recipientPrivateKey: Uint8Array
  ): Promise<Result<T, SecurityError>>;
}

/**
 * Token authentication interface
 */
export interface TokenAuthenticator {
  /**
   * Generate a new bearer token
   *
   * @param capabilityId - ID of the capability this token grants access to
   * @param expiresIn - Time in milliseconds until expiration
   * @param secret - Secret key for signing the token
   */
  generate(
    capabilityId: string,
    expiresIn: number,
    secret: string
  ): Promise<Result<BearerToken, SecurityError>>;

  /**
   * Validate a bearer token
   *
   * @param token - Token to validate
   * @param secret - Secret key for verification
   */
  validate(
    token: BearerToken,
    secret: string
  ): Promise<Result<{ valid: boolean; capabilityId: string }, SecurityError>>;

  /**
   * Serialize a token to a string for transmission
   */
  serialize(token: BearerToken): string;

  /**
   * Deserialize a token from a string
   */
  deserialize(tokenString: string): Result<BearerToken, SecurityError>;
}
