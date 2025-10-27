/**
 * Tests for Transport Utilities
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { ok, err, isOk, isErr } from '@servicejs/result';
import type { Transport, MessageEnvelope, TransportError } from '../src/transport.js';
import {
  createTransportRouter,
  withRetry,
  withTimeout,
  withRetryAndTimeout,
  createPrefixRouter,
  defaultRetryPolicy,
} from '../src/utilities.js';

// Mock transport for testing
const createMockTransport = (
  urn: string = 'urn:test:transport',
  shouldFail: boolean = false
): Transport => {
  const sentMessages: MessageEnvelope[] = [];
  let receiveHandler: ((envelope: MessageEnvelope) => void) | undefined;
  let errorHandler: ((error: TransportError) => void) | undefined;
  let connected = false;

  return {
    async connect() {
      connected = true;
      return ok(undefined);
    },

    async disconnect() {
      connected = false;
      return ok(undefined);
    },

    async send(envelope) {
      if (!connected) {
        return err({ type: 'NOT_CONNECTED' as const });
      }

      if (shouldFail) {
        return err({
          type: 'SEND_FAILED' as const,
          urn: envelope.to,
          error: new Error('Mock send failure'),
        });
      }

      sentMessages.push(envelope);
      return ok(undefined);
    },

    onReceive(handler) {
      receiveHandler = handler;
    },

    onError(handler) {
      errorHandler = handler;
    },

    isConnected() {
      return connected;
    },

    getLocalUrn() {
      return urn as any;
    },

    // Test helpers
    getSentMessages: () => sentMessages,
    triggerReceive: (envelope: MessageEnvelope) => receiveHandler?.(envelope),
    triggerError: (error: TransportError) => errorHandler?.(error),
  } as any;
};

describe('TransportRouter', () => {
  test('routes to default transport when no routes match', async () => {
    const defaultTransport = createMockTransport('urn:test:default');
    const router = createTransportRouter({ defaultTransport });

    await defaultTransport.connect();

    const envelope: MessageEnvelope = {
      from: 'urn:test:sender' as any,
      to: 'urn:test:receiver' as any,
      message: { type: 'test' },
    };

    const result = await router.send(envelope);

    expect(isOk(result)).toBe(true);
    expect(defaultTransport.getSentMessages()).toHaveLength(1);
    expect(defaultTransport.getSentMessages()[0]).toEqual(envelope);
  });

  test('routes based on predicate', async () => {
    const localTransport = createMockTransport('urn:test:local');
    const remoteTransport = createMockTransport('urn:test:remote');
    const router = createTransportRouter();

    await localTransport.connect();
    await remoteTransport.connect();

    router.addRoute((envelope) => envelope.to.toString().startsWith('urn:local:'), localTransport);
    router.addRoute((envelope) => envelope.to.toString().startsWith('urn:remote:'), remoteTransport);

    // Send to local
    const localEnvelope: MessageEnvelope = {
      from: 'urn:test:sender' as any,
      to: 'urn:local:service' as any,
      message: { type: 'test' },
    };

    await router.send(localEnvelope);
    expect(localTransport.getSentMessages()).toHaveLength(1);
    expect(remoteTransport.getSentMessages()).toHaveLength(0);

    // Send to remote
    const remoteEnvelope: MessageEnvelope = {
      from: 'urn:test:sender' as any,
      to: 'urn:remote:service' as any,
      message: { type: 'test' },
    };

    await router.send(remoteEnvelope);
    expect(localTransport.getSentMessages()).toHaveLength(1);
    expect(remoteTransport.getSentMessages()).toHaveLength(1);
  });

  test('returns error when no route matches and no default', async () => {
    const router = createTransportRouter();

    const envelope: MessageEnvelope = {
      from: 'urn:test:sender' as any,
      to: 'urn:test:receiver' as any,
      message: { type: 'test' },
    };

    const result = await router.send(envelope);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('SEND_FAILED');
    }
  });

  test('calls onUnroutable when no route matches', async () => {
    let unroutableCalled = false;
    let unroutableEnvelope: MessageEnvelope | undefined;

    const router = createTransportRouter({
      onUnroutable: (envelope) => {
        unroutableCalled = true;
        unroutableEnvelope = envelope;
      },
    });

    const envelope: MessageEnvelope = {
      from: 'urn:test:sender' as any,
      to: 'urn:test:receiver' as any,
      message: { type: 'test' },
    };

    await router.send(envelope);

    expect(unroutableCalled).toBe(true);
    expect(unroutableEnvelope).toEqual(envelope);
  });

  test('removes routes', async () => {
    const transport = createMockTransport('urn:test:transport');
    const router = createTransportRouter();

    await transport.connect();

    const predicate = (envelope: MessageEnvelope) => envelope.to.toString().startsWith('urn:test:');
    router.addRoute(predicate, transport);

    const envelope: MessageEnvelope = {
      from: 'urn:test:sender' as any,
      to: 'urn:test:receiver' as any,
      message: { type: 'test' },
    };

    // Should route
    let result = await router.send(envelope);
    expect(isOk(result)).toBe(true);

    // Remove route
    router.removeRoute(predicate);

    // Should fail
    result = await router.send(envelope);
    expect(isErr(result)).toBe(true);
  });

  test('getTransport returns correct transport', () => {
    const localTransport = createMockTransport('urn:test:local');
    const remoteTransport = createMockTransport('urn:test:remote');
    const router = createTransportRouter({ defaultTransport: localTransport });

    router.addRoute((envelope) => envelope.to.toString().startsWith('urn:remote:'), remoteTransport);

    const localEnvelope: MessageEnvelope = {
      from: 'urn:test:sender' as any,
      to: 'urn:local:service' as any,
      message: { type: 'test' },
    };

    const remoteEnvelope: MessageEnvelope = {
      from: 'urn:test:sender' as any,
      to: 'urn:remote:service' as any,
      message: { type: 'test' },
    };

    expect(router.getTransport(localEnvelope)).toBe(localTransport);
    expect(router.getTransport(remoteEnvelope)).toBe(remoteTransport);
  });
});

describe('withRetry', () => {
  test('succeeds on first attempt when transport succeeds', async () => {
    const transport = createMockTransport('urn:test:transport');
    const retryTransport = withRetry(transport, {
      maxAttempts: 3,
      initialDelay: 10,
      maxDelay: 100,
      backoffMultiplier: 2,
    });

    await transport.connect();

    const envelope: MessageEnvelope = {
      from: 'urn:test:sender' as any,
      to: 'urn:test:receiver' as any,
      message: { type: 'test' },
    };

    const result = await retryTransport.send(envelope);

    expect(isOk(result)).toBe(true);
    expect(transport.getSentMessages()).toHaveLength(1);
  });

  test('retries on failure', async () => {
    let attempts = 0;
    const transport = createMockTransport('urn:test:transport');
    const originalSend = transport.send.bind(transport);

    // Fail first 2 attempts, succeed on 3rd
    transport.send = async (envelope) => {
      attempts++;
      if (attempts < 3) {
        return err({
          type: 'CONNECTION_FAILED',
          urn: envelope.to,
          error: new Error('Connection failed'),
        });
      }
      return originalSend(envelope);
    };

    await transport.connect();

    const retryTransport = withRetry(transport, {
      maxAttempts: 3,
      initialDelay: 10,
      maxDelay: 100,
      backoffMultiplier: 2,
    });

    const envelope: MessageEnvelope = {
      from: 'urn:test:sender' as any,
      to: 'urn:test:receiver' as any,
      message: { type: 'test' },
    };

    const result = await retryTransport.send(envelope);

    expect(isOk(result)).toBe(true);
    expect(attempts).toBe(3);
  });

  test('exhausts retries and returns error', async () => {
    const transport = createMockTransport('urn:test:transport', true); // Always fails
    await transport.connect();

    const retryTransport = withRetry(transport, {
      maxAttempts: 3,
      initialDelay: 10,
      maxDelay: 100,
      backoffMultiplier: 2,
    });

    const envelope: MessageEnvelope = {
      from: 'urn:test:sender' as any,
      to: 'urn:test:receiver' as any,
      message: { type: 'test' },
    };

    const result = await retryTransport.send(envelope);

    expect(isErr(result)).toBe(true);
  });

  test('does not retry non-retryable errors', async () => {
    let attempts = 0;
    const transport = createMockTransport('urn:test:transport');

    transport.send = async (envelope) => {
      attempts++;
      return err({
        type: 'SERIALIZATION_FAILED',
        message: envelope.message,
        error: new Error('Serialization failed'),
      });
    };

    const retryTransport = withRetry(transport, {
      maxAttempts: 3,
      initialDelay: 10,
      maxDelay: 100,
      backoffMultiplier: 2,
    });

    const envelope: MessageEnvelope = {
      from: 'urn:test:sender' as any,
      to: 'urn:test:receiver' as any,
      message: { type: 'test' },
    };

    const result = await retryTransport.send(envelope);

    expect(isErr(result)).toBe(true);
    expect(attempts).toBe(1); // Should not retry
  });

  test('calls onRetry callback', async () => {
    const retryCalls: Array<{ attempt: number; delay: number }> = [];
    let attempts = 0;

    const transport = createMockTransport('urn:test:transport');
    transport.send = async (envelope) => {
      attempts++;
      if (attempts < 3) {
        return err({
          type: 'SEND_FAILED',
          urn: envelope.to,
          error: new Error('Send failed'),
        });
      }
      return ok(undefined);
    };

    await transport.connect();

    const retryTransport = withRetry(transport, {
      maxAttempts: 3,
      initialDelay: 10,
      maxDelay: 100,
      backoffMultiplier: 2,
      onRetry: (attempt, error, delay) => {
        retryCalls.push({ attempt, delay });
      },
    });

    const envelope: MessageEnvelope = {
      from: 'urn:test:sender' as any,
      to: 'urn:test:receiver' as any,
      message: { type: 'test' },
    };

    await retryTransport.send(envelope);

    expect(retryCalls).toHaveLength(2); // 2 retries
    expect(retryCalls[0].attempt).toBe(1);
    expect(retryCalls[1].attempt).toBe(2);
  });

  test('uses exponential backoff', async () => {
    const delays: number[] = [];
    let attempts = 0;

    const transport = createMockTransport('urn:test:transport');
    transport.send = async (envelope) => {
      attempts++;
      if (attempts < 4) {
        return err({
          type: 'SEND_FAILED',
          urn: envelope.to,
          error: new Error('Send failed'),
        });
      }
      return ok(undefined);
    };

    await transport.connect();

    const retryTransport = withRetry(transport, {
      maxAttempts: 4,
      initialDelay: 100,
      maxDelay: 5000,
      backoffMultiplier: 2,
      jitter: 0, // No jitter for predictable testing
      onRetry: (attempt, error, delay) => {
        delays.push(delay);
      },
    });

    const envelope: MessageEnvelope = {
      from: 'urn:test:sender' as any,
      to: 'urn:test:receiver' as any,
      message: { type: 'test' },
    };

    await retryTransport.send(envelope);

    expect(delays).toEqual([100, 200, 400]); // Exponential backoff: 100, 100*2, 100*4
  });
});

describe('withTimeout', () => {
  test('succeeds when send completes before timeout', async () => {
    const transport = createMockTransport('urn:test:transport');
    await transport.connect();

    const timeoutTransport = withTimeout(transport, { timeout: 1000 });

    const envelope: MessageEnvelope = {
      from: 'urn:test:sender' as any,
      to: 'urn:test:receiver' as any,
      message: { type: 'test' },
    };

    const result = await timeoutTransport.send(envelope);

    expect(isOk(result)).toBe(true);
  });

  test('times out when send takes too long', async () => {
    const transport = createMockTransport('urn:test:transport');
    await transport.connect();

    // Override send to delay
    transport.send = async (envelope) => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return ok(undefined);
    };

    const timeoutTransport = withTimeout(transport, { timeout: 50 });

    const envelope: MessageEnvelope = {
      from: 'urn:test:sender' as any,
      to: 'urn:test:receiver' as any,
      message: { type: 'test' },
    };

    const result = await timeoutTransport.send(envelope);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('SEND_FAILED');
    }
  });

  test('calls onTimeout callback', async () => {
    let timeoutCalled = false;
    let timeoutEnvelope: MessageEnvelope | undefined;

    const transport = createMockTransport('urn:test:transport');
    await transport.connect();

    transport.send = async (envelope) => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return ok(undefined);
    };

    const timeoutTransport = withTimeout(transport, {
      timeout: 50,
      onTimeout: (envelope) => {
        timeoutCalled = true;
        timeoutEnvelope = envelope;
      },
    });

    const envelope: MessageEnvelope = {
      from: 'urn:test:sender' as any,
      to: 'urn:test:receiver' as any,
      message: { type: 'test' },
    };

    await timeoutTransport.send(envelope);

    expect(timeoutCalled).toBe(true);
    expect(timeoutEnvelope).toEqual(envelope);
  });
});

describe('withRetryAndTimeout', () => {
  test('combines retry and timeout', async () => {
    let attempts = 0;
    const transport = createMockTransport('urn:test:transport');
    await transport.connect();

    transport.send = async (envelope) => {
      attempts++;
      if (attempts < 2) {
        // Simulate slow send that times out
        await new Promise((resolve) => setTimeout(resolve, 200));
        return ok(undefined);
      }
      // Second attempt succeeds quickly
      return ok(undefined);
    };

    const reliableTransport = withRetryAndTimeout(
      transport,
      {
        maxAttempts: 3,
        initialDelay: 10,
        maxDelay: 100,
        backoffMultiplier: 2,
      },
      {
        timeout: 50,
      }
    );

    const envelope: MessageEnvelope = {
      from: 'urn:test:sender' as any,
      to: 'urn:test:receiver' as any,
      message: { type: 'test' },
    };

    const result = await reliableTransport.send(envelope);

    expect(isOk(result)).toBe(true);
    expect(attempts).toBe(2); // First attempt timed out, second succeeded
  });
});

describe('createPrefixRouter', () => {
  test('routes by URN prefix', async () => {
    const localTransport = createMockTransport('urn:test:local');
    const remoteTransport = createMockTransport('urn:test:remote');

    await localTransport.connect();
    await remoteTransport.connect();

    const router = createPrefixRouter({
      'urn:local:': localTransport,
      'urn:remote:': remoteTransport,
    });

    // Send to local
    const localEnvelope: MessageEnvelope = {
      from: 'urn:test:sender' as any,
      to: 'urn:local:service' as any,
      message: { type: 'test' },
    };

    await router.send(localEnvelope);
    expect(localTransport.getSentMessages()).toHaveLength(1);
    expect(remoteTransport.getSentMessages()).toHaveLength(0);

    // Send to remote
    const remoteEnvelope: MessageEnvelope = {
      from: 'urn:test:sender' as any,
      to: 'urn:remote:service' as any,
      message: { type: 'test' },
    };

    await router.send(remoteEnvelope);
    expect(localTransport.getSentMessages()).toHaveLength(1);
    expect(remoteTransport.getSentMessages()).toHaveLength(1);
  });

  test('uses default transport for unmatched prefixes', async () => {
    const localTransport = createMockTransport('urn:test:local');
    const defaultTransport = createMockTransport('urn:test:default');

    await localTransport.connect();
    await defaultTransport.connect();

    const router = createPrefixRouter(
      {
        'urn:local:': localTransport,
      },
      defaultTransport
    );

    // Send to unmatched prefix
    const envelope: MessageEnvelope = {
      from: 'urn:test:sender' as any,
      to: 'urn:other:service' as any,
      message: { type: 'test' },
    };

    await router.send(envelope);
    expect(localTransport.getSentMessages()).toHaveLength(0);
    expect(defaultTransport.getSentMessages()).toHaveLength(1);
  });
});
