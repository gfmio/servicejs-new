/**
 * @servicejs/security - Message Security and Authentication
 *
 * Provides message signing, encryption, and token authentication.
 */

// Types
export type {
  SecurityError,
  KeyPair,
  SignedMessage,
  EncryptedMessage,
  BearerToken,
  MessageSigner,
  MessageEncryptor,
  TokenAuthenticator,
} from './types.js';

// Implementations
export { createMessageSigner } from './signing.js';
export { createMessageEncryptor } from './encryption.js';
export { createTokenAuthenticator } from './tokens.js';
