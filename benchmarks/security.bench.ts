/**
 * Security Performance Benchmarks
 *
 * Measures performance of signing, encryption, and token operations.
 */

import { bench, run, group } from 'mitata';
import {
  createMessageSigner,
  createMessageEncryptor,
  createTokenAuthenticator,
} from '@servicejs/security';
import { isOk } from '@servicejs/result';
import type { KeyPair } from '@servicejs/security';

console.log('=== Security Benchmarks ===\n');

type SmallMessage = { type: 'test'; value: number };
type MediumMessage = { type: 'data'; items: string[]; metadata: Record<string, unknown> };

// Message Signing Benchmarks
group('Message Signing (ECDSA P-256)', () => {
  let signingKeys: KeyPair;

  // Pre-generate keys once
  const signer = createMessageSigner();
  const keysPromise = signer.generateKeyPair().then((result) => {
    if (isOk(result)) {
      signingKeys = result.value;
    }
  });

  bench('generate key pair', async () => {
    await signer.generateKeyPair();
  });

  bench('sign small message', async () => {
    await keysPromise;
    const message: SmallMessage = { type: 'test', value: 42 };
    await signer.sign(message, signingKeys);
  });

  bench('sign medium message', async () => {
    await keysPromise;
    const message: MediumMessage = {
      type: 'data',
      items: ['a', 'b', 'c', 'd', 'e'],
      metadata: { timestamp: Date.now(), author: 'user' },
    };
    await signer.sign(message, signingKeys);
  });

  bench('sign + verify (small)', async () => {
    await keysPromise;
    const message: SmallMessage = { type: 'test', value: 42 };
    const signed = await signer.sign(message, signingKeys);
    if (isOk(signed)) {
      await signer.verify(signed.value);
    }
  });

  bench('verify signature', async () => {
    await keysPromise;
    const message: SmallMessage = { type: 'test', value: 42 };
    const signed = await signer.sign(message, signingKeys);
    if (isOk(signed)) {
      await signer.verify(signed.value);
    }
  });
});

// Message Encryption Benchmarks
group('Message Encryption (RSA-OAEP)', () => {
  let senderKeys: KeyPair;
  let recipientKeys: KeyPair;

  // Pre-generate keys once
  const encryptor = createMessageEncryptor();
  const keysPromise = Promise.all([
    encryptor.generateKeyPair(),
    encryptor.generateKeyPair(),
  ]).then(([sender, recipient]) => {
    if (isOk(sender) && isOk(recipient)) {
      senderKeys = sender.value;
      recipientKeys = recipient.value;
    }
  });

  bench('generate key pair', async () => {
    await encryptor.generateKeyPair();
  });

  bench('encrypt small message', async () => {
    await keysPromise;
    const message: SmallMessage = { type: 'test', value: 42 };
    await encryptor.encrypt(message, recipientKeys.publicKey, senderKeys.privateKey);
  });

  bench('encrypt medium message', async () => {
    await keysPromise;
    const message: MediumMessage = {
      type: 'data',
      items: ['a', 'b', 'c', 'd', 'e'],
      metadata: { timestamp: Date.now(), author: 'user' },
    };
    await encryptor.encrypt(message, recipientKeys.publicKey, senderKeys.privateKey);
  });

  bench('encrypt + decrypt (small)', async () => {
    await keysPromise;
    const message: SmallMessage = { type: 'test', value: 42 };
    const encrypted = await encryptor.encrypt(
      message,
      recipientKeys.publicKey,
      senderKeys.privateKey
    );
    if (isOk(encrypted)) {
      await encryptor.decrypt(encrypted.value, recipientKeys.privateKey);
    }
  });

  bench('decrypt message', async () => {
    await keysPromise;
    const message: SmallMessage = { type: 'test', value: 42 };
    const encrypted = await encryptor.encrypt(
      message,
      recipientKeys.publicKey,
      senderKeys.privateKey
    );
    if (isOk(encrypted)) {
      await encryptor.decrypt(encrypted.value, recipientKeys.privateKey);
    }
  });
});

// Token Authentication Benchmarks
group('Token Authentication (HMAC-SHA256)', () => {
  const authenticator = createTokenAuthenticator();
  const secret = 'benchmark-secret-key';

  bench('generate token', async () => {
    await authenticator.generate('capability-123', 3600000, secret);
  });

  bench('validate token', async () => {
    const token = await authenticator.generate('capability-123', 3600000, secret);
    if (isOk(token)) {
      await authenticator.validate(token.value, secret);
    }
  });

  bench('serialize token', async () => {
    const token = await authenticator.generate('capability-123', 3600000, secret);
    if (isOk(token)) {
      authenticator.serialize(token.value);
    }
  });

  bench('deserialize token', () => {
    const tokenString = 'id.cap.1234567890.sig';
    authenticator.deserialize(tokenString);
  });

  bench('generate + serialize + deserialize + validate', async () => {
    const token = await authenticator.generate('capability-123', 3600000, secret);
    if (isOk(token)) {
      const serialized = authenticator.serialize(token.value);
      const deserialized = authenticator.deserialize(serialized);
      if (isOk(deserialized)) {
        await authenticator.validate(deserialized.value, secret);
      }
    }
  });
});

// Throughput Tests
group('Throughput', () => {
  const authenticator = createTokenAuthenticator();
  const secret = 'benchmark-secret-key';

  bench('generate 100 tokens', async () => {
    for (let i = 0; i < 100; i++) {
      await authenticator.generate(`cap-${i}`, 3600000, secret);
    }
  });

  bench('generate + validate 100 tokens', async () => {
    for (let i = 0; i < 100; i++) {
      const token = await authenticator.generate(`cap-${i}`, 3600000, secret);
      if (isOk(token)) {
        await authenticator.validate(token.value, secret);
      }
    }
  });
});

// Comparison: Token vs Signing
group('Token vs Signing (comparison)', () => {
  const authenticator = createTokenAuthenticator();
  const signer = createMessageSigner();
  const secret = 'benchmark-secret-key';

  let signingKeys: KeyPair;
  const keysPromise = signer.generateKeyPair().then((result) => {
    if (isOk(result)) {
      signingKeys = result.value;
    }
  });

  bench('token auth (generate + validate)', async () => {
    const token = await authenticator.generate('cap-123', 3600000, secret);
    if (isOk(token)) {
      await authenticator.validate(token.value, secret);
    }
  });

  bench('message signing (sign + verify)', async () => {
    await keysPromise;
    const message = { type: 'auth', capability: 'cap-123' };
    const signed = await signer.sign(message, signingKeys);
    if (isOk(signed)) {
      await signer.verify(signed.value);
    }
  });
});

await run();
