/**
 * Secret and PII Protection Example for @servicejs/config
 *
 * This example demonstrates:
 * - Protecting API keys, passwords, and tokens with Secret
 * - Protecting personally identifiable information with PII
 * - Different redaction strategies (full, partial, hash)
 * - Self-destructing secrets for one-time use
 * - Preventing accidental exposure in logs and JSON
 */

import { PII, Secret } from '@servicejs/config';

console.log('=== Secret Type Examples ===\n');

// Example 1: Basic Secret usage
console.log('1. Basic Secret Protection:');
const apiKey = Secret.create('sk-1234567890abcdef');

console.log('   API Key object:', apiKey);
// Output: Secret { [REDACTED] }

console.log('   API Key toString():', apiKey.toString());
// Output: Secret { [REDACTED] }

console.log('   API Key in JSON:', JSON.stringify({ apiKey }));
// Output: {"apiKey":"[REDACTED]"}

console.log('   Accessing the value:', apiKey.expose());
// Output: sk-1234567890abcdef

// Example 2: Self-destructing secrets
console.log('\n2. Self-Destructing Secrets:');
const oneTimeToken = Secret.create('temp-token-xyz789');

console.log('   Token before use:', oneTimeToken.expose());
// Use the token for some operation
console.log('   Using token for authentication...');

// Destroy after use
oneTimeToken.destroy();
console.log('   Token after destroy:', oneTimeToken.expose());
// Output: undefined

console.log('   Is destroyed?', oneTimeToken.isDestroyed());
// Output: true

// Example 3: Mapping secrets
console.log('\n3. Transforming Secrets:');
const passwordHash = Secret.create('password123');
const uppercased = passwordHash.map((pwd) => pwd.toUpperCase());

console.log('   Original:', passwordHash); // Secret { [REDACTED] }
console.log('   Uppercased:', uppercased); // Secret { [REDACTED] }
console.log('   Uppercased value:', uppercased.expose()); // PASSWORD123

// Example 4: Secrets in configuration
console.log('\n4. Secrets in Application Config:');
interface AppConfig {
  database: {
    password: Secret<string>;
  };
  api: {
    key: Secret<string>;
    secret: Secret<string>;
  };
}

const config: AppConfig = {
  database: {
    password: Secret.create('db-super-secret-password'),
  },
  api: {
    key: Secret.create('api-key-abc123'),
    secret: Secret.create('api-secret-xyz789'),
  },
};

console.log('   Config object:', config);
// All secrets are redacted

console.log('   Config as JSON:', JSON.stringify(config, null, 2));
// All secrets show as "[REDACTED]"

// Safe access when needed
console.log('   Accessing DB password:', config.database.password.expose());

console.log('\n' + '='.repeat(60) + '\n');
console.log('=== PII Type Examples ===\n');

// Example 5: Full redaction (default)
console.log('5. Full Redaction (Default):');
const ssn = PII.create('123-45-6789');
const creditCard = PII.create('4532-1234-5678-9010');

console.log('   SSN:', ssn);
// Output: PII { [REDACTED] }

console.log('   Credit Card:', creditCard);
// Output: PII { [REDACTED] }

console.log('   SSN in JSON:', JSON.stringify({ ssn }));
// Output: {"ssn":"[REDACTED]"}

// Example 6: Partial redaction
console.log('\n6. Partial Redaction:');
const email = PII.create('john.doe@example.com', 'partial');
const phone = PII.create('+1-555-123-4567', 'partial');
const name = PII.create('Jane Smith', 'partial');

console.log('   Email:', email);
// Output: PII { *********.com }

console.log('   Phone:', phone);
// Output: PII { ********-4567 }

console.log('   Name:', name);
// Output: PII { J********h }

console.log('   Email in JSON:', email.toJSON());
// Shows partial redaction

// Example 7: Hash redaction
console.log('\n7. Hash Redaction (for consistent identification):');
const userId = PII.create('user-12345-abc', 'hash');
const sessionId = PII.create('session-xyz-789', 'hash');

console.log('   User ID:', userId);
// Output: PII { [HASH:a1b2c3d4] }

console.log('   Session ID:', sessionId);
// Output: PII { [HASH:e5f6g7h8] }

// Same value produces same hash
const userId2 = PII.create('user-12345-abc', 'hash');
console.log('   Same user ID:', userId2);
console.log('   Hashes match?', userId.toJSON() === userId2.toJSON());
// Output: true

// Example 8: PII in user data
console.log('\n8. PII in User Data:');
interface User {
  id: string;
  email: PII<string>;
  phone: PII<string>;
  ssn: PII<string>;
  address: {
    street: string;
    city: string;
    zipCode: PII<string>;
  };
}

const user: User = {
  id: 'user-123',
  email: PII.create('alice@example.com', 'partial'),
  phone: PII.create('+1-555-987-6543', 'partial'),
  ssn: PII.create('987-65-4321', 'full'),
  address: {
    street: '123 Main St',
    city: 'Springfield',
    zipCode: PII.create('12345-6789', 'partial'),
  },
};

console.log('   User object:', user);
// PII fields are redacted based on strategy

console.log('\n   User as JSON:');
console.log(JSON.stringify(user, null, 2));
// PII is protected in JSON serialization

console.log('\n   Accessing real email:', user.email.expose());
// Output: alice@example.com

// Example 9: Transforming PII
console.log('\n9. Transforming PII:');
const emailPII = PII.create('user@EXAMPLE.COM', 'partial');
const normalized = emailPII.map((e) => e.toLowerCase());

console.log('   Original email PII:', emailPII);
console.log('   Normalized email PII:', normalized);
console.log('   Normalized value:', normalized.expose());
// Output: user@example.com

// Example 10: Combining Secret and PII
console.log('\n10. Secret and PII Together:');
interface SecureUserData {
  username: string;
  email: PII<string>;
  passwordHash: Secret<string>;
  apiToken: Secret<string>;
  phoneNumber: PII<string>;
}

const secureData: SecureUserData = {
  username: 'johndoe',
  email: PII.create('john.doe@example.com', 'partial'),
  passwordHash: Secret.create('$2b$10$N9qo8uLOickgx2ZMRZoMye...'),
  apiToken: Secret.create('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
  phoneNumber: PII.create('+1-555-123-4567', 'hash'),
};

console.log('   Secure data object:');
console.log('   ', secureData);

console.log('\n   Secure data as JSON (for logging):');
console.log(JSON.stringify(secureData, null, 2));
// Both secrets and PII are protected

console.log('\n   Safe access:');
console.log('   - Email:', secureData.email.expose());
console.log('   - Password hash:', secureData.passwordHash.expose());

console.log('\n' + '='.repeat(60) + '\n');
console.log('=== Best Practices ===\n');

console.log('✓ Always use Secret for:');
console.log('  - API keys and tokens');
console.log('  - Passwords and password hashes');
console.log('  - JWT secrets');
console.log('  - Database credentials');
console.log('  - Encryption keys');
console.log('');
console.log('✓ Always use PII for:');
console.log('  - Email addresses');
console.log('  - Phone numbers');
console.log('  - Social security numbers');
console.log('  - Credit card numbers');
console.log('  - Names and addresses');
console.log('  - Any personally identifiable information');
console.log('');
console.log('✓ Choose redaction strategy based on use case:');
console.log('  - full: Complete privacy (SSN, credit cards)');
console.log('  - partial: Debugging aid (emails, phone numbers)');
console.log('  - hash: Consistent identification in logs (user IDs, sessions)');
console.log('');
console.log('✓ Destroy secrets after one-time use');
console.log('✓ Never log exposed secret/PII values');
console.log('✓ Use .expose() only when absolutely necessary');
