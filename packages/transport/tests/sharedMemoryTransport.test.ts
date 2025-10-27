/**
 * Tests for Shared Memory Transport
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { ok, isOk, isErr } from '@servicejs/result';
import type { MessageEnvelope } from '../src/transport.js';
import {
  RingBuffer,
  createSharedBuffer,
  createSharedMemoryTransport,
} from '../src/sharedMemoryTransport.js';

describe('RingBuffer', () => {
  test('initializes correctly', () => {
    const sharedBuffer = createSharedBuffer({
      capacity: 4,
      maxMessageSize: 128,
    });

    const ringBuffer = new RingBuffer(sharedBuffer, {
      capacity: 4,
      maxMessageSize: 128,
    });

    ringBuffer.initialize();

    expect(ringBuffer.getCount()).toBe(0);
    expect(ringBuffer.getCapacity()).toBe(4);
    expect(ringBuffer.isEmpty()).toBe(true);
    expect(ringBuffer.isFull()).toBe(false);
    expect(ringBuffer.getAvailable()).toBe(4);
  });

  test('writes and reads single message', () => {
    const sharedBuffer = createSharedBuffer({
      capacity: 4,
      maxMessageSize: 128,
    });

    const ringBuffer = new RingBuffer(sharedBuffer, {
      capacity: 4,
      maxMessageSize: 128,
    });

    ringBuffer.initialize();

    // Write message
    const message = new TextEncoder().encode('Hello, World!');
    const written = ringBuffer.write(message);

    expect(written).toBe(true);
    expect(ringBuffer.getCount()).toBe(1);
    expect(ringBuffer.isEmpty()).toBe(false);

    // Read message
    const read = ringBuffer.read();

    expect(read).toBeDefined();
    expect(new TextDecoder().decode(read)).toBe('Hello, World!');
    expect(ringBuffer.getCount()).toBe(0);
    expect(ringBuffer.isEmpty()).toBe(true);
  });

  test('writes and reads multiple messages', () => {
    const sharedBuffer = createSharedBuffer({
      capacity: 4,
      maxMessageSize: 128,
    });

    const ringBuffer = new RingBuffer(sharedBuffer, {
      capacity: 4,
      maxMessageSize: 128,
    });

    ringBuffer.initialize();

    // Write messages
    const messages = ['Message 1', 'Message 2', 'Message 3'];

    for (const msg of messages) {
      const data = new TextEncoder().encode(msg);
      const written = ringBuffer.write(data);
      expect(written).toBe(true);
    }

    expect(ringBuffer.getCount()).toBe(3);

    // Read messages
    for (const expectedMsg of messages) {
      const read = ringBuffer.read();
      expect(read).toBeDefined();
      expect(new TextDecoder().decode(read)).toBe(expectedMsg);
    }

    expect(ringBuffer.getCount()).toBe(0);
  });

  test('handles buffer full condition', () => {
    const sharedBuffer = createSharedBuffer({
      capacity: 2,
      maxMessageSize: 128,
    });

    const ringBuffer = new RingBuffer(sharedBuffer, {
      capacity: 2,
      maxMessageSize: 128,
    });

    ringBuffer.initialize();

    // Fill buffer
    const msg1 = new TextEncoder().encode('Message 1');
    const msg2 = new TextEncoder().encode('Message 2');

    expect(ringBuffer.write(msg1)).toBe(true);
    expect(ringBuffer.write(msg2)).toBe(true);
    expect(ringBuffer.isFull()).toBe(true);

    // Try to write when full
    const msg3 = new TextEncoder().encode('Message 3');
    expect(ringBuffer.write(msg3)).toBe(false);

    // Read one message
    ringBuffer.read();

    // Now we can write again
    expect(ringBuffer.write(msg3)).toBe(true);
  });

  test('returns undefined when reading from empty buffer', () => {
    const sharedBuffer = createSharedBuffer({
      capacity: 4,
      maxMessageSize: 128,
    });

    const ringBuffer = new RingBuffer(sharedBuffer, {
      capacity: 4,
      maxMessageSize: 128,
    });

    ringBuffer.initialize();

    const read = ringBuffer.read();
    expect(read).toBeUndefined();
  });

  test('handles wraparound correctly', () => {
    const sharedBuffer = createSharedBuffer({
      capacity: 3,
      maxMessageSize: 128,
    });

    const ringBuffer = new RingBuffer(sharedBuffer, {
      capacity: 3,
      maxMessageSize: 128,
    });

    ringBuffer.initialize();

    // Fill buffer
    ringBuffer.write(new TextEncoder().encode('Message 1'));
    ringBuffer.write(new TextEncoder().encode('Message 2'));
    ringBuffer.write(new TextEncoder().encode('Message 3'));

    // Read two messages
    expect(new TextDecoder().decode(ringBuffer.read()!)).toBe('Message 1');
    expect(new TextDecoder().decode(ringBuffer.read()!)).toBe('Message 2');

    // Write two more (wraparound)
    ringBuffer.write(new TextEncoder().encode('Message 4'));
    ringBuffer.write(new TextEncoder().encode('Message 5'));

    // Read remaining
    expect(new TextDecoder().decode(ringBuffer.read()!)).toBe('Message 3');
    expect(new TextDecoder().decode(ringBuffer.read()!)).toBe('Message 4');
    expect(new TextDecoder().decode(ringBuffer.read()!)).toBe('Message 5');
    expect(ringBuffer.isEmpty()).toBe(true);
  });

  test('throws error for message too large', () => {
    const sharedBuffer = createSharedBuffer({
      capacity: 4,
      maxMessageSize: 10,
    });

    const ringBuffer = new RingBuffer(sharedBuffer, {
      capacity: 4,
      maxMessageSize: 10,
    });

    ringBuffer.initialize();

    const largeMessage = new Uint8Array(20); // Exceeds maxMessageSize
    expect(() => ringBuffer.write(largeMessage)).toThrow('Message too large');
  });

  test('tracks available space correctly', () => {
    const sharedBuffer = createSharedBuffer({
      capacity: 4,
      maxMessageSize: 128,
    });

    const ringBuffer = new RingBuffer(sharedBuffer, {
      capacity: 4,
      maxMessageSize: 128,
    });

    ringBuffer.initialize();

    expect(ringBuffer.getAvailable()).toBe(4);

    ringBuffer.write(new TextEncoder().encode('Message 1'));
    expect(ringBuffer.getAvailable()).toBe(3);

    ringBuffer.write(new TextEncoder().encode('Message 2'));
    expect(ringBuffer.getAvailable()).toBe(2);

    ringBuffer.read();
    expect(ringBuffer.getAvailable()).toBe(3);
  });
});

describe('createSharedBuffer', () => {
  test('creates buffer with correct size', () => {
    const buffer = createSharedBuffer({
      capacity: 10,
      maxMessageSize: 256,
    });

    expect(buffer).toBeInstanceOf(SharedArrayBuffer);

    // Header (16) + 10 slots * (4 + 256) = 16 + 2600 = 2616
    expect(buffer.byteLength).toBe(2616);
  });
});

describe('SharedMemoryTransport', () => {
  test('connects and disconnects', async () => {
    const bufferConfig = { capacity: 4, maxMessageSize: 1024 };
    const sendBuffer = createSharedBuffer(bufferConfig);
    const receiveBuffer = createSharedBuffer(bufferConfig);

    const transport = createSharedMemoryTransport({
      localUrn: 'urn:test:transport' as any,
      sendBuffer,
      receiveBuffer,
      bufferConfig,
    });

    expect(transport.isConnected()).toBe(false);

    const connectResult = await transport.connect();
    expect(isOk(connectResult)).toBe(true);
    expect(transport.isConnected()).toBe(true);

    const disconnectResult = await transport.disconnect();
    expect(isOk(disconnectResult)).toBe(true);
    expect(transport.isConnected()).toBe(false);
  });

  test('sends and receives messages', async () => {
    const bufferConfig = { capacity: 4, maxMessageSize: 1024 };

    // Create two buffers for bi-directional communication
    const aToB = createSharedBuffer(bufferConfig);
    const bToA = createSharedBuffer(bufferConfig);

    // Create two transports with reversed buffers
    const transportA = createSharedMemoryTransport({
      localUrn: 'urn:test:a' as any,
      sendBuffer: aToB,
      receiveBuffer: bToA,
      bufferConfig,
      pollInterval: 10,
    });

    const transportB = createSharedMemoryTransport({
      localUrn: 'urn:test:b' as any,
      sendBuffer: bToA,
      receiveBuffer: aToB,
      bufferConfig,
      pollInterval: 10,
    });

    // Set up receiver BEFORE connecting
    const received: MessageEnvelope[] = [];
    transportB.onReceive((envelope) => {
      received.push(envelope);
    });

    await transportA.connect();
    await transportB.connect();

    // Send message from A to B
    const envelope: MessageEnvelope = {
      from: 'urn:test:a' as any,
      to: 'urn:test:b' as any,
      message: { type: 'hello', data: 'world' },
    };

    const result = await transportA.send(envelope);
    expect(isOk(result)).toBe(true);

    // Wait for message to be received
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(received).toHaveLength(1);
    expect(received[0].message.type).toBe('hello');
    expect((received[0].message as any).data).toBe('world');

    await transportA.disconnect();
    await transportB.disconnect();
  });

  test('handles buffer full error', async () => {
    const bufferConfig = { capacity: 2, maxMessageSize: 1024 };
    const sendBuffer = createSharedBuffer(bufferConfig);
    const receiveBuffer = createSharedBuffer(bufferConfig);

    const transport = createSharedMemoryTransport({
      localUrn: 'urn:test:transport' as any,
      sendBuffer,
      receiveBuffer,
      bufferConfig,
    });

    const ringBuffer = new RingBuffer(sendBuffer, bufferConfig);
    ringBuffer.initialize();

    await transport.connect();

    const envelope: MessageEnvelope = {
      from: 'urn:test:sender' as any,
      to: 'urn:test:receiver' as any,
      message: { type: 'test' },
    };

    // Fill buffer
    await transport.send(envelope);
    await transport.send(envelope);

    // Try to send when full
    const result = await transport.send(envelope);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('SEND_FAILED');
    }

    await transport.disconnect();
  });

  test('returns error when not connected', async () => {
    const bufferConfig = { capacity: 4, maxMessageSize: 1024 };
    const sendBuffer = createSharedBuffer(bufferConfig);
    const receiveBuffer = createSharedBuffer(bufferConfig);
    const config_OLD = createSharedBuffer({
      capacity: 4,
      maxMessageSize: 1024,
    });

    const transport = createSharedMemoryTransport({
      localUrn: 'urn:test:transport' as any,
      sendBuffer,
      receiveBuffer,
      bufferConfig,
    });

    const envelope: MessageEnvelope = {
      from: 'urn:test:sender' as any,
      to: 'urn:test:receiver' as any,
      message: { type: 'test' },
    };

    const result = await transport.send(envelope);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('NOT_CONNECTED');
    }
  });

  test('handles message too large error', async () => {
    const bufferConfig = { capacity: 4, maxMessageSize: 50 };
    const sendBuffer = createSharedBuffer(bufferConfig);
    const receiveBuffer = createSharedBuffer(bufferConfig);

    const transport = createSharedMemoryTransport({
      localUrn: 'urn:test:transport' as any,
      sendBuffer,
      receiveBuffer,
      bufferConfig,
    });

    const ringBuffer = new RingBuffer(sendBuffer, bufferConfig);
    ringBuffer.initialize();

    await transport.connect();

    const envelope: MessageEnvelope = {
      from: 'urn:test:sender' as any,
      to: 'urn:test:receiver' as any,
      message: {
        type: 'test',
        data: 'a'.repeat(100), // Very large message
      },
    };

    const result = await transport.send(envelope);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      // Message is either too large for serialization or buffer
      expect(result.error.type === 'SERIALIZATION_FAILED' || result.error.type === 'SEND_FAILED').toBe(true);
    }

    await transport.disconnect();
  });

  test('multiple messages in sequence', async () => {
    const bufferConfig = { capacity: 8, maxMessageSize: 1024 };
    const aToB = createSharedBuffer(bufferConfig);
    const bToA = createSharedBuffer(bufferConfig);

    const transportA = createSharedMemoryTransport({
      localUrn: 'urn:test:a' as any,
      sendBuffer: aToB,
      receiveBuffer: bToA,
      bufferConfig,
      pollInterval: 5,
    });

    const transportB = createSharedMemoryTransport({
      localUrn: 'urn:test:b' as any,
      sendBuffer: bToA,
      receiveBuffer: aToB,
      bufferConfig,
      pollInterval: 5,
    });

    // Set up receiver BEFORE connecting
    const received: MessageEnvelope[] = [];
    transportB.onReceive((envelope) => {
      received.push(envelope);
    });

    await transportA.connect();
    await transportB.connect();

    // Send multiple messages
    for (let i = 0; i < 5; i++) {
      await transportA.send({
        from: 'urn:test:a' as any,
        to: 'urn:test:b' as any,
        message: { type: 'msg', index: i },
      });
    }

    // Wait for messages to be received
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(received).toHaveLength(5);
    for (let i = 0; i < 5; i++) {
      expect((received[i].message as any).index).toBe(i);
    }

    await transportA.disconnect();
    await transportB.disconnect();
  });

  test('bi-directional communication', async () => {
    const bufferConfig = { capacity: 8, maxMessageSize: 1024 };
    const aToB = createSharedBuffer(bufferConfig);
    const bToA = createSharedBuffer(bufferConfig);

    const transportA = createSharedMemoryTransport({
      localUrn: 'urn:test:a' as any,
      sendBuffer: aToB,
      receiveBuffer: bToA,
      bufferConfig,
      pollInterval: 10,
    });

    const transportB = createSharedMemoryTransport({
      localUrn: 'urn:test:b' as any,
      sendBuffer: bToA,
      receiveBuffer: aToB,
      bufferConfig,
      pollInterval: 10,
    });

    // Set up receivers BEFORE connecting
    const receivedA: MessageEnvelope[] = [];
    const receivedB: MessageEnvelope[] = [];

    transportA.onReceive((envelope) => {
      receivedA.push(envelope);
    });

    transportB.onReceive((envelope) => {
      receivedB.push(envelope);
    });

    await transportA.connect();
    await transportB.connect();

    // A -> B
    await transportA.send({
      from: 'urn:test:a' as any,
      to: 'urn:test:b' as any,
      message: { type: 'ping' },
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    // B -> A
    await transportB.send({
      from: 'urn:test:b' as any,
      to: 'urn:test:a' as any,
      message: { type: 'pong' },
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(receivedB).toHaveLength(1);
    expect(receivedB[0].message.type).toBe('ping');

    expect(receivedA).toHaveLength(1);
    expect(receivedA[0].message.type).toBe('pong');

    await transportA.disconnect();
    await transportB.disconnect();
  });

  test('getLocalUrn returns correct URN', () => {
    const bufferConfig = { capacity: 4, maxMessageSize: 1024 };
    const sendBuffer = createSharedBuffer(bufferConfig);
    const receiveBuffer = createSharedBuffer(bufferConfig);

    const transport = createSharedMemoryTransport({
      localUrn: 'urn:test:myapp' as any,
      sendBuffer,
      receiveBuffer,
      bufferConfig,
    });

    expect(transport.getLocalUrn()).toEqual('urn:test:myapp' as any);
  });
});
