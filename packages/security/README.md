# @servicejs/security

Message security, signing, encryption, and authentication for ServiceJS.

## Features

- **Message Signing** - ECDSA P-256 digital signatures for message authentication
- **Message Encryption** - RSA-OAEP public key encryption for confidentiality
- **Token Authentication** - HMAC-SHA256 bearer tokens for capability access control
- **Type-Safe** - Full TypeScript support with Result types
- **Never Throws** - All operations return `Result<T, E>` instead of throwing exceptions
- **Cross-Platform** - Uses Web Crypto API (browsers, Node.js 16+, Deno, Cloudflare Workers)

## Installation

```bash
bun add @servicejs/security
```

## Quick Start

### Message Signing

```typescript
import { createMessageSigner, isOk } from '@servicejs/security';

const signer = createMessageSigner();

// Generate key pair
const keyPair = await signer.generateKeyPair();
if (!isOk(keyPair)) return;

// Sign a message
const message = { type: 'hello', data: 'world' };
const signed = await signer.sign(message, keyPair.value);
if (!isOk(signed)) return;

// Verify signature
const verification = await signer.verify(signed.value);
if (isOk(verification) && verification.value.valid) {
  console.log('Signature is valid!', verification.value.message);
}
```

### Message Encryption

```typescript
import { createMessageEncryptor, isOk } from '@servicejs/security';

const encryptor = createMessageEncryptor();

// Generate key pairs for sender and recipient
const senderKeys = await encryptor.generateKeyPair();
const recipientKeys = await encryptor.generateKeyPair();
if (!isOk(senderKeys) || !isOk(recipientKeys)) return;

// Encrypt a message
const message = { type: 'secret', data: 'confidential information' };
const encrypted = await encryptor.encrypt(
  message,
  recipientKeys.value.publicKey,
  senderKeys.value.privateKey
);
if (!isOk(encrypted)) return;

// Decrypt the message
const decrypted = await encryptor.decrypt(
  encrypted.value,
  recipientKeys.value.privateKey
);
if (isOk(decrypted)) {
  console.log('Decrypted:', decrypted.value);
}
```

### Bearer Tokens

```typescript
import { createTokenAuthenticator, isOk } from '@servicejs/security';

const authenticator = createTokenAuthenticator();
const secret = 'my-secret-key';

// Generate a token
const token = await authenticator.generate(
  'capability-123',
  60 * 60 * 1000, // 1 hour expiration
  secret
);
if (!isOk(token)) return;

// Serialize for transmission
const tokenString = authenticator.serialize(token.value);
console.log('Token:', tokenString);

// Deserialize received token
const received = authenticator.deserialize(tokenString);
if (!isOk(received)) return;

// Validate token
const validation = await authenticator.validate(received.value, secret);
if (isOk(validation) && validation.value.valid) {
  console.log('Access granted to:', validation.value.capabilityId);
}
```

## API Reference

### Message Signing

#### `createMessageSigner()`

Creates a message signer using ECDSA P-256.

**Methods:**

- `generateKeyPair()` - Generate a new signing key pair
- `sign<T>(message: T, keyPair: KeyPair)` - Sign a message
- `verify<T>(signedMessage: SignedMessage<T>)` - Verify a signed message

**Example:**

```typescript
const signer = createMessageSigner();

const keys = await signer.generateKeyPair();
const signed = await signer.sign({ type: 'test' }, keys.value);
const verified = await signer.verify(signed.value);
```

### Message Encryption

#### `createMessageEncryptor()`

Creates a message encryptor using RSA-OAEP.

**Methods:**

- `generateKeyPair()` - Generate a new encryption key pair
- `encrypt<T>(message: T, recipientPublicKey, senderPrivateKey)` - Encrypt a message
- `decrypt<T>(encrypted: EncryptedMessage, recipientPrivateKey)` - Decrypt a message

**Note:** For large messages, consider storing the message in CAS and encrypting just the content address.

**Example:**

```typescript
const encryptor = createMessageEncryptor();

const alice = await encryptor.generateKeyPair();
const bob = await encryptor.generateKeyPair();

// Alice encrypts message for Bob
const encrypted = await encryptor.encrypt(
  { secret: 'data' },
  bob.value.publicKey,
  alice.value.privateKey
);

// Bob decrypts
const decrypted = await encryptor.decrypt(encrypted.value, bob.value.privateKey);
```

### Token Authentication

#### `createTokenAuthenticator()`

Creates a token authenticator using HMAC-SHA256.

**Methods:**

- `generate(capabilityId, expiresIn, secret)` - Generate a new bearer token
- `validate(token, secret)` - Validate a bearer token
- `serialize(token)` - Convert token to string for transmission
- `deserialize(tokenString)` - Parse token from string

**Example:**

```typescript
const auth = createTokenAuthenticator();
const secret = 'my-secret-key';

// Generate token that expires in 1 hour
const token = await auth.generate('cap-123', 3600000, secret);

// Serialize for HTTP header
const headerValue = `Bearer ${auth.serialize(token.value)}`;

// Parse and validate
const received = auth.deserialize(tokenString);
const validation = await auth.validate(received.value, secret);
```

## Types

### KeyPair

```typescript
interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}
```

### SignedMessage

```typescript
interface SignedMessage<T = unknown> {
  message: T;
  signature: Uint8Array;
  publicKey: Uint8Array;
}
```

### EncryptedMessage

```typescript
interface EncryptedMessage {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  senderPublicKey: Uint8Array;
}
```

### BearerToken

```typescript
interface BearerToken {
  id: string;
  capabilityId: string;
  expiresAt: number;
  signature: string;
}
```

### SecurityError

```typescript
type SecurityError =
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
```

## Use Cases

### 1. Secure Message Passing

```typescript
// Sender signs message
const signer = createMessageSigner();
const keys = await signer.generateKeyPair();
const signed = await signer.sign({ type: 'transfer', amount: 100 }, keys.value);

// Receiver verifies authenticity
const verification = await signer.verify(signed.value);
if (verification.value.valid) {
  // Process message knowing it's authentic
}
```

### 2. Encrypted Communication

```typescript
// Alice and Bob exchange public keys
const alice = await encryptor.generateKeyPair();
const bob = await encryptor.generateKeyPair();

// Alice sends encrypted message to Bob
const encrypted = await encryptor.encrypt(
  { secret: 'meeting at 3pm' },
  bob.value.publicKey,
  alice.value.privateKey
);

// Only Bob can decrypt
const decrypted = await encryptor.decrypt(encrypted.value, bob.value.privateKey);
```

### 3. Capability-Based Authentication

```typescript
// Service generates token granting access to capability
const token = await auth.generate('file-read-123', 3600000, secret);
const tokenString = auth.serialize(token.value);

// Client sends token with request
const headers = { 'Authorization': `Bearer ${tokenString}` };

// Service validates token
const parsed = auth.deserialize(tokenString);
const validation = await auth.validate(parsed.value, secret);

if (validation.value.valid) {
  // Grant access to capability-id
  grantAccess(validation.value.capabilityId);
}
```

### 4. Message Integrity and Non-Repudiation

```typescript
// Sign important messages to prevent tampering
const signer = createMessageSigner();
const keys = await signer.generateKeyPair();

const order = {
  type: 'purchase',
  item: 'laptop',
  price: 1200,
  timestamp: Date.now()
};

const signed = await signer.sign(order, keys.value);

// Store signed message
database.save(signed.value);

// Later, verify it hasn't been tampered with
const verification = await signer.verify(storedMessage);
if (!verification.value.valid) {
  throw new Error('Message has been tampered with!');
}
```

### 5. Token Expiration and Revocation

```typescript
const auth = createTokenAuthenticator();

// Generate short-lived tokens
const shortLived = await auth.generate('temp-access', 300000, secret); // 5 min

// Validate and check expiration
const validation = await auth.validate(shortLived.value, secret);

if (!validation.value.valid) {
  // Token expired or invalid
  throw new Error('Access denied: token expired');
}
```

## Error Handling

All security operations return `Result<T, SecurityError>` and never throw:

```typescript
import { isOk, isErr } from '@servicejs/result';

const result = await signer.generateKeyPair();

if (isOk(result)) {
  console.log('Generated keys:', result.value);
} else {
  console.error('Error:', result.error.type, result.error.message);

  // Handle specific error types
  switch (result.error.type) {
    case 'NOT_SUPPORTED':
      console.error('Web Crypto API not available');
      break;
    case 'KEY_GENERATION_ERROR':
      console.error('Failed to generate keys');
      break;
  }
}
```

## Security Considerations

1. **Key Storage** - Store private keys securely, never in code or version control
2. **Secret Management** - Use environment variables or key management services for secrets
3. **Token Expiration** - Use short-lived tokens (minutes to hours, not days)
4. **HTTPS Only** - Always transmit encrypted messages and tokens over HTTPS
5. **Key Rotation** - Regularly rotate keys and secrets
6. **Crypto Random** - Web Crypto API uses cryptographically secure random number generation
7. **Timing Attacks** - Token validation uses timing-safe comparison
8. **Algorithm Choice** - ECDSA P-256 and RSA-OAEP are industry-standard algorithms

## Platform Support

Uses Web Crypto API, available in:

- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Node.js 16+
- ✅ Deno
- ✅ Cloudflare Workers
- ✅ Bun

## Performance Notes

- **Signing**: Fast (~1-2ms per operation)
- **Encryption**: Slower (~5-10ms per operation) due to RSA
- **Tokens**: Very fast (~0.1ms per operation) using HMAC
- **Key Generation**: Slow (~50-100ms) - generate keys once and reuse

**Tip**: For large messages, store content in CAS and encrypt just the content address instead.

## Testing

```typescript
import { test } from 'bun:test';
import { createMessageSigner } from '@servicejs/security';
import { isOk } from '@servicejs/result';

test('should sign and verify', async () => {
  const signer = createMessageSigner();

  const keys = await signer.generateKeyPair();
  expect(isOk(keys)).toBe(true);

  const signed = await signer.sign({ test: true }, keys.value);
  expect(isOk(signed)).toBe(true);

  const verified = await signer.verify(signed.value);
  expect(verified.value.valid).toBe(true);
});
```

## Resources

- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [ECDSA](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm)
- [RSA-OAEP](https://en.wikipedia.org/wiki/Optimal_asymmetric_encryption_padding)
- [HMAC](https://en.wikipedia.org/wiki/HMAC)
- [Bearer Tokens](https://oauth.net/2/bearer-tokens/)

## License

MIT
