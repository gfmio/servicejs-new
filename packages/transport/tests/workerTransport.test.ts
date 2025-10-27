/**
 * Tests for worker transport
 */

import { describe, test, expect } from 'bun:test';
import { isOk, isErr } from '@servicejs/result';
import { createWorkerTransport, type MessageEnvelope, type WorkerLike } from '../src/index.js';

/**
 * Mock worker for testing
 */
class MockWorker implements WorkerLike {
  private messageListeners: ((event: MessageEvent) => void)[] = [];
  private errorListeners: ((event: ErrorEvent) => void)[] = [];

  postMessage(message: unknown): void {
    // Simulate async message delivery
    setTimeout(() => {
      this.messageListeners.forEach((listener) => {
        listener(new MessageEvent('message', { data: message }));
      });
    }, 0);
  }

  addEventListener(type: 'message' | 'error', listener: any): void {
    if (type === 'message') {
      this.messageListeners.push(listener);
    } else if (type === 'error') {
      this.errorListeners.push(listener);
    }
  }

  removeEventListener(type: 'message' | 'error', listener: any): void {
    if (type === 'message') {
      const index = this.messageListeners.indexOf(listener);
      if (index >= 0) {
        this.messageListeners.splice(index, 1);
      }
    } else if (type === 'error') {
      const index = this.errorListeners.indexOf(listener);
      if (index >= 0) {
        this.errorListeners.splice(index, 1);
      }
    }
  }

  // Test helpers
  simulateMessage(data: unknown): void {
    this.messageListeners.forEach((listener) => {
      listener(new MessageEvent('message', { data }));
    });
  }

  simulateError(error: Error): void {
    this.errorListeners.forEach((listener) => {
      listener(new ErrorEvent('error', { error, message: error.message }));
    });
  }
}

describe('createWorkerTransport', () => {
  test('creates disconnected transport', () => {
    const worker = new MockWorker();
    const transport = createWorkerTransport({
      localUrn: 'urn:test:transport',
      worker,
    });

    expect(transport.isConnected()).toBe(false);
    expect(transport.getLocalUrn()).toBe('urn:test:transport');
  });

  test('connects transport', async () => {
    const worker = new MockWorker();
    const transport = createWorkerTransport({
      localUrn: 'urn:test:transport',
      worker,
    });

    const result = await transport.connect();

    expect(isOk(result)).toBe(true);
    expect(transport.isConnected()).toBe(true);
  });

  test('disconnects transport', async () => {
    const worker = new MockWorker();
    const transport = createWorkerTransport({
      localUrn: 'urn:test:transport',
      worker,
    });

    await transport.connect();
    const result = await transport.disconnect();

    expect(isOk(result)).toBe(true);
    expect(transport.isConnected()).toBe(false);
  });

  test('sends message through worker', async () => {
    const worker = new MockWorker();
    const transport = createWorkerTransport({
      localUrn: 'urn:test:main',
      worker,
    });

    await transport.connect();

    let posted: unknown;
    const originalPostMessage = worker.postMessage.bind(worker);
    worker.postMessage = (message: unknown) => {
      posted = message;
      originalPostMessage(message);
    };

    const envelope: MessageEnvelope = {
      from: 'urn:test:main',
      to: 'urn:test:worker',
      message: { type: 'hello', data: 'world' },
    };

    const result = await transport.send(envelope);

    expect(isOk(result)).toBe(true);
    expect(posted).toBeDefined();
    expect(typeof posted).toBe('string'); // Serialized
  });

  test('receives message from worker', async () => {
    const worker = new MockWorker();
    const transport = createWorkerTransport({
      localUrn: 'urn:test:main',
      worker,
    });

    await transport.connect();

    let received: MessageEnvelope | undefined;
    transport.onReceive((envelope) => {
      received = envelope;
    });

    const envelope: MessageEnvelope = {
      from: 'urn:test:worker',
      to: 'urn:test:main',
      message: { type: 'response', data: 'hello' },
    };

    // Simulate worker sending message
    worker.simulateMessage(JSON.stringify(envelope));

    // Wait for async delivery
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(received).toBeDefined();
    expect(received?.from).toBe('urn:test:worker');
    expect(received?.to).toBe('urn:test:main');
    expect(received?.message.type).toBe('response');
  });

  test('fails to send when not connected', async () => {
    const worker = new MockWorker();
    const transport = createWorkerTransport({
      localUrn: 'urn:test:main',
      worker,
    });

    const envelope: MessageEnvelope = {
      from: 'urn:test:main',
      to: 'urn:test:worker',
      message: { type: 'hello' },
    };

    const result = await transport.send(envelope);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('NOT_CONNECTED');
    }
  });

  test('handles worker errors', async () => {
    const worker = new MockWorker();
    const transport = createWorkerTransport({
      localUrn: 'urn:test:main',
      worker,
    });

    await transport.connect();

    let errorReceived: unknown;
    transport.onError((error) => {
      errorReceived = error;
    });

    worker.simulateError(new Error('Worker error'));

    // Wait for async delivery
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(errorReceived).toBeDefined();
  });

  test('ignores non-string messages', async () => {
    const worker = new MockWorker();
    const transport = createWorkerTransport({
      localUrn: 'urn:test:main',
      worker,
    });

    await transport.connect();

    let received: MessageEnvelope | undefined;
    transport.onReceive((envelope) => {
      received = envelope;
    });

    // Simulate worker sending non-string message
    worker.simulateMessage({ not: 'a string' });

    // Wait for async delivery
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(received).toBeUndefined();
  });

  test('handles invalid JSON', async () => {
    const worker = new MockWorker();
    const transport = createWorkerTransport({
      localUrn: 'urn:test:main',
      worker,
    });

    await transport.connect();

    let errorReceived: unknown;
    transport.onError((error) => {
      errorReceived = error;
    });

    // Simulate worker sending invalid JSON
    worker.simulateMessage('invalid json{');

    // Wait for async delivery
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(errorReceived).toBeDefined();
  });

  test('handles correlation ID and timestamp', async () => {
    const worker = new MockWorker();
    const transport = createWorkerTransport({
      localUrn: 'urn:test:main',
      worker,
    });

    await transport.connect();

    let received: MessageEnvelope | undefined;
    transport.onReceive((envelope) => {
      received = envelope;
    });

    const envelope: MessageEnvelope = {
      from: 'urn:test:worker',
      to: 'urn:test:main',
      message: { type: 'response' },
      correlationId: 'request-123',
      timestamp: Date.now(),
    };

    worker.simulateMessage(JSON.stringify(envelope));

    // Wait for async delivery
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(received?.correlationId).toBe('request-123');
    expect(received?.timestamp).toBeDefined();
  });

  test('handles receive handler errors', async () => {
    const worker = new MockWorker();
    const transport = createWorkerTransport({
      localUrn: 'urn:test:main',
      worker,
    });

    await transport.connect();

    let errorReceived: unknown;
    transport.onError((error) => {
      errorReceived = error;
    });

    transport.onReceive(() => {
      throw new Error('Handler error');
    });

    const envelope: MessageEnvelope = {
      from: 'urn:test:worker',
      to: 'urn:test:main',
      message: { type: 'test' },
    };

    worker.simulateMessage(JSON.stringify(envelope));

    // Wait for async delivery
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(errorReceived).toBeDefined();
  });

  test('can reconnect after disconnect', async () => {
    const worker = new MockWorker();
    const transport = createWorkerTransport({
      localUrn: 'urn:test:main',
      worker,
    });

    await transport.connect();
    expect(transport.isConnected()).toBe(true);

    await transport.disconnect();
    expect(transport.isConnected()).toBe(false);

    await transport.connect();
    expect(transport.isConnected()).toBe(true);
  });
});
