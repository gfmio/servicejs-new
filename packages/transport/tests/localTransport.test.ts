/**
 * Tests for local transport
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { isOk, isErr } from '@servicejs/result';
import {
  createLocalTransport,
  getLocalTransportRegistry,
  type MessageEnvelope,
} from '../src/index.js';

describe('createLocalTransport', () => {
  beforeEach(() => {
    // Clear registry before each test
    getLocalTransportRegistry().clear();
  });

  test('creates disconnected transport', () => {
    const transport = createLocalTransport({
      localUrn: 'urn:test:transport',
    });

    expect(transport.isConnected()).toBe(false);
    expect(transport.getLocalUrn()).toBe('urn:test:transport');
  });

  test('connects transport', async () => {
    const transport = createLocalTransport({
      localUrn: 'urn:test:transport',
    });

    const result = await transport.connect();

    expect(isOk(result)).toBe(true);
    expect(transport.isConnected()).toBe(true);
    expect(getLocalTransportRegistry().size()).toBe(1);
  });

  test('disconnects transport', async () => {
    const transport = createLocalTransport({
      localUrn: 'urn:test:transport',
    });

    await transport.connect();
    const result = await transport.disconnect();

    expect(isOk(result)).toBe(true);
    expect(transport.isConnected()).toBe(false);
    expect(getLocalTransportRegistry().size()).toBe(0);
  });

  test('sends message to another local transport', async () => {
    const transport1 = createLocalTransport({
      localUrn: 'urn:test:sender',
    });

    const transport2 = createLocalTransport({
      localUrn: 'urn:test:receiver',
    });

    await transport1.connect();
    await transport2.connect();

    let received: MessageEnvelope | undefined;
    transport2.onReceive((envelope) => {
      received = envelope;
    });

    const envelope: MessageEnvelope = {
      from: 'urn:test:sender',
      to: 'urn:test:receiver',
      message: { type: 'hello', data: 'world' },
    };

    const result = await transport1.send(envelope);

    expect(isOk(result)).toBe(true);
    expect(received).toBeDefined();
    expect(received?.from).toBe('urn:test:sender');
    expect(received?.to).toBe('urn:test:receiver');
    expect(received?.message.type).toBe('hello');
  });

  test('fails to send when not connected', async () => {
    const transport = createLocalTransport({
      localUrn: 'urn:test:sender',
    });

    const envelope: MessageEnvelope = {
      from: 'urn:test:sender',
      to: 'urn:test:receiver',
      message: { type: 'hello' },
    };

    const result = await transport.send(envelope);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('NOT_CONNECTED');
    }
  });

  test('fails to send to unknown destination', async () => {
    const transport = createLocalTransport({
      localUrn: 'urn:test:sender',
    });

    await transport.connect();

    const envelope: MessageEnvelope = {
      from: 'urn:test:sender',
      to: 'urn:test:unknown',
      message: { type: 'hello' },
    };

    const result = await transport.send(envelope);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('SEND_FAILED');
    }
  });

  test('handles multiple transports', async () => {
    const transports = Array.from({ length: 5 }, (_, i) =>
      createLocalTransport({
        localUrn: `urn:test:transport-${i}`,
      })
    );

    for (const transport of transports) {
      await transport.connect();
    }

    expect(getLocalTransportRegistry().size()).toBe(5);

    const received: MessageEnvelope[] = [];
    transports[4]!.onReceive((envelope) => {
      received.push(envelope);
    });

    // Send from each transport to transport 4
    for (let i = 0; i < 4; i++) {
      const envelope: MessageEnvelope = {
        from: `urn:test:transport-${i}`,
        to: 'urn:test:transport-4',
        message: { type: 'hello', from: i },
      };

      await transports[i]!.send(envelope);
    }

    expect(received).toHaveLength(4);
  });

  test('handles error in receive handler', async () => {
    const transport1 = createLocalTransport({
      localUrn: 'urn:test:sender',
    });

    const transport2 = createLocalTransport({
      localUrn: 'urn:test:receiver',
    });

    await transport1.connect();
    await transport2.connect();

    let errorReceived: unknown;
    transport2.onError((error) => {
      errorReceived = error;
    });

    transport2.onReceive(() => {
      throw new Error('Handler error');
    });

    const envelope: MessageEnvelope = {
      from: 'urn:test:sender',
      to: 'urn:test:receiver',
      message: { type: 'hello' },
    };

    await transport1.send(envelope);

    expect(errorReceived).toBeDefined();
  });

  test('preserves message references (no serialization)', async () => {
    const transport1 = createLocalTransport({
      localUrn: 'urn:test:sender',
    });

    const transport2 = createLocalTransport({
      localUrn: 'urn:test:receiver',
    });

    await transport1.connect();
    await transport2.connect();

    const sharedObject = { value: 42 };

    let received: MessageEnvelope | undefined;
    transport2.onReceive((envelope) => {
      received = envelope;
    });

    const envelope: MessageEnvelope = {
      from: 'urn:test:sender',
      to: 'urn:test:receiver',
      message: { type: 'test', data: sharedObject },
    };

    await transport1.send(envelope);

    expect(received).toBeDefined();
    expect((received?.message as { type: string; data: typeof sharedObject }).data).toBe(
      sharedObject
    ); // Same reference
  });

  test('can reconnect after disconnect', async () => {
    const transport = createLocalTransport({
      localUrn: 'urn:test:transport',
    });

    await transport.connect();
    expect(transport.isConnected()).toBe(true);

    await transport.disconnect();
    expect(transport.isConnected()).toBe(false);

    await transport.connect();
    expect(transport.isConnected()).toBe(true);
  });

  test('handles correlation ID and timestamp', async () => {
    const transport1 = createLocalTransport({
      localUrn: 'urn:test:sender',
    });

    const transport2 = createLocalTransport({
      localUrn: 'urn:test:receiver',
    });

    await transport1.connect();
    await transport2.connect();

    let received: MessageEnvelope | undefined;
    transport2.onReceive((envelope) => {
      received = envelope;
    });

    const envelope: MessageEnvelope = {
      from: 'urn:test:sender',
      to: 'urn:test:receiver',
      message: { type: 'hello' },
      correlationId: 'request-123',
      timestamp: Date.now(),
    };

    await transport1.send(envelope);

    expect(received?.correlationId).toBe('request-123');
    expect(received?.timestamp).toBeDefined();
  });
});
