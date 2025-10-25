# @servicejs/capability-crypto

Cryptographic operations capability interface for ServiceJS.

Provides platform-agnostic cryptographic operations without ambient authority.

## Installation

```bash
bun add @servicejs/capability-crypto
```

## Features

- **No Ambient Authority** - Crypto access is explicitly granted via capabilities
- **Platform Agnostic** - Same interface works across Node.js, browser, Deno, edge runtimes
- **Type Safe** - Full TypeScript support with Result types
- **Test Friendly** - Deterministic implementation for reproducible tests
- **Never Throws** - All operations return `Result<T, E>` instead of throwing exceptions
- **Secure** - Uses platform crypto APIs in production

## Usage

### In Tests

```typescript
import { createDeterministicCrypto } from '@servicejs/capability-crypto';
import { isOk } from '@servicejs/result';

// Create with seed for reproducible tests
const crypto = createDeterministicCrypto({ seed: 42 });

// Generate random bytes (deterministic!)
const bytes = crypto.randomBytes(32);
if (isOk(bytes)) {
  console.log('Random bytes:', bytes.value);
}

// Reset to get same sequence again
crypto.reset();
const sameBytes = crypto.randomBytes(32);
// bytes.value === sameBytes.value ✓

// Generate UUID
const uuid = crypto.randomUUID();
if (isOk(uuid)) {
  console.log('UUID:', uuid.value); // e.g., "550e8400-e29b-41d4-a716-446655440000"
}
```

### In Production

```typescript
import { bootstrap } from '@servicejs/runtime-node';
import { isOk } from '@servicejs/result';

const runtime = bootstrap();

// Generate secure random bytes
const token = runtime.crypto.randomBytes(32);
if (isOk(token)) {
  const tokenHex = Array.from(token.value)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  console.log('Token:', tokenHex);
}

// Hash password
const hash = await runtime.crypto.hash('sha256', 'my-password', 'hex');
if (isOk(hash)) {
  console.log('Hash:', hash.value);
}

// Generate HMAC for API signature
const signature = await runtime.crypto.hmac(
  'sha256',
  'api-secret-key',
  'request-data',
  'hex'
);
if (isOk(signature)) {
  console.log('Signature:', signature.value);
}
```

## API

### CryptoCapability

```typescript
interface CryptoCapability {
  randomBytes(length: number): Result<Uint8Array, CryptoError>;
  randomUUID(): Result<string, CryptoError>;
  randomInt(min: number, max: number): Result<number, CryptoError>;
  hash(algorithm: HashAlgorithm, data: string | Uint8Array, encoding?: HashEncoding): Promise<Result<string | Uint8Array, CryptoError>>;
  hmac(algorithm: HMACAlgorithm, key: string | Uint8Array, data: string | Uint8Array, encoding?: HashEncoding): Promise<Result<string | Uint8Array, CryptoError>>;
  timingSafeEqual(a: string | Uint8Array, b: string | Uint8Array): Result<boolean, CryptoError>;
}
```

### Types

```typescript
type HashAlgorithm = 'sha1' | 'sha256' | 'sha384' | 'sha512' | 'md5';
type HMACAlgorithm = 'sha1' | 'sha256' | 'sha384' | 'sha512';
type HashEncoding = 'hex' | 'base64' | 'buffer';
```

### CryptoError

```typescript
interface CryptoError {
  readonly code: CryptoErrorCode;
  readonly message: string;
}

type CryptoErrorCode =
  | 'INVALID_ALGORITHM'
  | 'INVALID_LENGTH'
  | 'INVALID_KEY'
  | 'INVALID_DATA'
  | 'OPERATION_FAILED'
  | 'NOT_SUPPORTED'
  | 'UNKNOWN';
```

## Deterministic Implementation

### createDeterministicCrypto

Create a deterministic crypto capability for testing.

**⚠️ NOT cryptographically secure - for testing only!**

```typescript
function createDeterministicCrypto(config?: {
  seed?: number;
}): DeterministicCryptoCapability;
```

**Features:**
- Seeded PRNG for reproducible "random" values
- Deterministic hashing for consistent test results
- Reset capability to replay sequences
- Perfect for testing without real crypto

**Example:**

```typescript
const crypto = createDeterministicCrypto({ seed: 42 });

// Generate deterministic random data
const bytes1 = crypto.randomBytes(16);

// Reset and generate again - same result!
crypto.reset();
const bytes2 = crypto.randomBytes(16);

expect(bytes1.value).toEqual(bytes2.value); // ✓
```

## Examples

### Random Bytes

```typescript
const crypto = runtime.crypto;

// Generate 32 random bytes
const result = crypto.randomBytes(32);

if (isOk(result)) {
  const bytes = result.value;
  console.log('Length:', bytes.length); // 32

  // Convert to hex
  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  console.log('Hex:', hex);
}
```

### UUID Generation

```typescript
const crypto = runtime.crypto;

// Generate UUIDv4
const uuid = crypto.randomUUID();

if (isOk(uuid)) {
  console.log('UUID:', uuid.value);
  // e.g., "550e8400-e29b-41d4-a716-446655440000"
}
```

### Random Integers

```typescript
const crypto = runtime.crypto;

// Generate random integer between 0 and 100
const randomNum = crypto.randomInt(0, 100);

if (isOk(randomNum)) {
  console.log('Random number:', randomNum.value);
  // 0 <= value < 100
}

// Generate dice roll (1-6)
const diceRoll = crypto.randomInt(1, 7);
if (isOk(diceRoll)) {
  console.log('Dice:', diceRoll.value); // 1-6
}
```

### Hashing

```typescript
const crypto = runtime.crypto;

// Hash with hex encoding
const hexHash = await crypto.hash('sha256', 'Hello, world!', 'hex');
if (isOk(hexHash)) {
  console.log('SHA-256 (hex):', hexHash.value);
}

// Hash with base64 encoding
const base64Hash = await crypto.hash('sha256', 'Hello, world!', 'base64');
if (isOk(base64Hash)) {
  console.log('SHA-256 (base64):', base64Hash.value);
}

// Hash binary data
const data = new Uint8Array([1, 2, 3, 4, 5]);
const binaryHash = await crypto.hash('sha256', data, 'buffer');
if (isOk(binaryHash)) {
  console.log('Hash bytes:', binaryHash.value);
}
```

### HMAC for API Signatures

```typescript
const crypto = runtime.crypto;

// Generate API request signature
const method = 'POST';
const path = '/api/users';
const timestamp = Date.now().toString();
const payload = JSON.stringify({ name: 'Alice' });

const message = `${method}${path}${timestamp}${payload}`;
const apiSecret = 'your-api-secret';

const signature = await crypto.hmac('sha256', apiSecret, message, 'hex');

if (isOk(signature)) {
  console.log('API Signature:', signature.value);

  // Include in request headers
  const headers = {
    'X-Timestamp': timestamp,
    'X-Signature': signature.value,
  };
}
```

### Timing-Safe Comparison

```typescript
const crypto = runtime.crypto;

// Compare secrets without timing attacks
const userProvidedToken = 'user-input-token';
const validToken = 'valid-secret-token';

const isValid = crypto.timingSafeEqual(userProvidedToken, validToken);

if (isOk(isValid)) {
  if (isValid.value) {
    console.log('Token is valid');
  } else {
    console.log('Token is invalid');
  }
}

// Works with binary data too
const hmac1 = new Uint8Array([1, 2, 3, 4]);
const hmac2 = new Uint8Array([1, 2, 3, 4]);

const equal = crypto.timingSafeEqual(hmac1, hmac2);
// equal.value === true
```

### Password Hashing (Simple Example)

```typescript
// ⚠️ For production, use bcrypt, scrypt, or Argon2
// This is just a demonstration

async function hashPassword(crypto: CryptoCapability, password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  if (!isOk(salt)) {
    throw new Error('Failed to generate salt');
  }

  const saltHex = Array.from(salt.value)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const combined = saltHex + password;
  const hash = await crypto.hash('sha256', combined, 'hex');

  if (!isOk(hash)) {
    throw new Error('Failed to hash password');
  }

  return `${saltHex}:${hash.value}`;
}

async function verifyPassword(
  crypto: CryptoCapability,
  password: string,
  stored: string
): Promise<boolean> {
  const [saltHex, storedHash] = stored.split(':');

  const combined = saltHex + password;
  const hash = await crypto.hash('sha256', combined, 'hex');

  if (!isOk(hash)) {
    return false;
  }

  const equal = crypto.timingSafeEqual(hash.value, storedHash);
  return isOk(equal) && equal.value;
}
```

### Testing

```typescript
import { test, expect } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createDeterministicCrypto } from '@servicejs/capability-crypto';

test('generates consistent UUIDs', () => {
  const crypto1 = createDeterministicCrypto({ seed: 12345 });
  const crypto2 = createDeterministicCrypto({ seed: 12345 });

  const uuid1 = crypto1.randomUUID();
  const uuid2 = crypto2.randomUUID();

  expect(isOk(uuid1)).toBe(true);
  expect(isOk(uuid2)).toBe(true);

  if (isOk(uuid1) && isOk(uuid2)) {
    expect(uuid1.value).toBe(uuid2.value);
  }
});

test('hash produces consistent output', async () => {
  const crypto = createDeterministicCrypto({ seed: 42 });

  const hash1 = await crypto.hash('sha256', 'test data', 'hex');

  crypto.reset();

  const hash2 = await crypto.hash('sha256', 'test data', 'hex');

  expect(isOk(hash1)).toBe(true);
  expect(isOk(hash2)).toBe(true);

  if (isOk(hash1) && isOk(hash2)) {
    expect(hash1.value).toBe(hash2.value);
  }
});
```

## createNoOpCrypto

Create a no-op crypto capability where all operations fail.

```typescript
function createNoOpCrypto(): CryptoCapability;
```

**Use cases:**
- Testing error handling
- Disabling crypto operations
- Security sandboxing

**Example:**

```typescript
const crypto = createNoOpCrypto();

const result = crypto.randomBytes(16);
expect(isErr(result)).toBe(true);
expect(result.error.code).toBe('NOT_SUPPORTED');
```

## Error Handling

All operations return `Result<T, CryptoError>` and never throw exceptions.

```typescript
import { isOk, isErr } from '@servicejs/result';

const bytes = crypto.randomBytes(16);

if (isOk(bytes)) {
  // Success
  console.log('Generated bytes:', bytes.value);
} else {
  // Error
  console.error(`Failed: ${bytes.error.code} - ${bytes.error.message}`);
}
```

## Platform Implementations

This package provides the interface and deterministic implementation. Platform-specific implementations are provided by runtime packages:

- **@servicejs/runtime-node** - Node.js (crypto module)
- **@servicejs/runtime-browser** - Browser (Web Crypto API)
- **@servicejs/runtime-deno** - Deno (crypto module)
- **@servicejs/runtime-cloudflare** - Cloudflare Workers (Web Crypto API)

## Security Considerations

1. **Production Crypto**: Always use platform crypto implementations in production
2. **Deterministic Crypto**: Only for testing - NOT cryptographically secure
3. **Password Hashing**: Use proper password hashing (bcrypt, scrypt, Argon2)
4. **Timing Attacks**: Use `timingSafeEqual()` for comparing secrets
5. **Key Management**: Store keys securely, never in code

## Design Philosophy

This package follows ServiceJS's capability-based security model:

1. **No Ambient Authority** - Applications don't access crypto directly; they receive a capability
2. **Explicit Grants** - Crypto access must be explicitly granted by the runtime
3. **Testable** - Easy to substitute with deterministic implementation
4. **Type Safe** - Full TypeScript support with Result types for error handling
5. **Platform Agnostic** - Same interface across all JavaScript runtimes

## License

MIT
