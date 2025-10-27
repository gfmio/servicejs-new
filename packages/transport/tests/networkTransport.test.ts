/**
 * Tests for network transport
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { isOk, isErr } from '@servicejs/result';
import { createNetworkTransport, type MessageEnvelope } from '../src/index.js';

/**
 * Mock WebSocket for testing
 */
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState: number = MockWebSocket.CONNECTING;
  url: string;
  protocols?: string | string[];

  private messageListeners: ((event: MessageEvent) => void)[] = [];
  private openListeners: ((event: Event) => void)[] = [];
  private closeListeners: ((event: CloseEvent) => void)[] = [];
  private errorListeners: ((event: Event) => void)[] = [];

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;

    // Simulate async connection
    setTimeout(() => {
      if (this.readyState === MockWebSocket.CONNECTING) {
        this.readyState = MockWebSocket.OPEN;
        this.openListeners.forEach((listener) => {
          listener(new Event('open'));
        });
      }
    }, 10);
  }

  send(data: string): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    // Echo back for testing
    setTimeout(() => {
      this.messageListeners.forEach((listener) => {
        listener(new MessageEvent('message', { data }));
      });
    }, 0);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      this.closeListeners.forEach((listener) => {
        listener(new CloseEvent('close'));
      });
    }, 0);
  }

  addEventListener(type: string, listener: any): void {
    switch (type) {
      case 'message':
        this.messageListeners.push(listener);
        break;
      case 'open':
        this.openListeners.push(listener);
        break;
      case 'close':
        this.closeListeners.push(listener);
        break;
      case 'error':
        this.errorListeners.push(listener);
        break;
    }
  }

  removeEventListener(type: string, listener: any): void {
    switch (type) {
      case 'message': {
        const index = this.messageListeners.indexOf(listener);
        if (index >= 0) this.messageListeners.splice(index, 1);
        break;
      }
      case 'open': {
        const index = this.openListeners.indexOf(listener);
        if (index >= 0) this.openListeners.splice(index, 1);
        break;
      }
      case 'close': {
        const index = this.closeListeners.indexOf(listener);
        if (index >= 0) this.closeListeners.splice(index, 1);
        break;
      }
      case 'error': {
        const index = this.errorListeners.indexOf(listener);
        if (index >= 0) this.errorListeners.splice(index, 1);
        break;
      }
    }
  }

  // Test helpers
  simulateMessage(data: unknown): void {
    this.messageListeners.forEach((listener) => {
      listener(new MessageEvent('message', { data }));
    });
  }

  simulateError(error?: Error): void {
    const event = new Event('error') as any;
    if (error) {
      event.error = error;
      event.message = error.message;
    }
    this.errorListeners.forEach((listener) => {
      listener(event);
    });
  }

  simulateClose(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.closeListeners.forEach((listener) => {
      listener(new CloseEvent('close'));
    });
  }
}

describe('createNetworkTransport', () => {
  let originalWebSocket: typeof WebSocket;

  beforeEach(() => {
    // Save and replace global WebSocket
    originalWebSocket = globalThis.WebSocket;
    (globalThis as any).WebSocket = MockWebSocket;
  });

  test('creates disconnected transport', () => {
    const transport = createNetworkTransport({
      localUrn: 'urn:test:client',
      url: 'ws://localhost:8080',
    });

    expect(transport.isConnected()).toBe(false);
    expect(transport.getLocalUrn()).toBe('urn:test:client');
  });

  test('connects transport', async () => {
    const transport = createNetworkTransport({
      localUrn: 'urn:test:client',
      url: 'ws://localhost:8080',
    });

    const result = await transport.connect();

    expect(isOk(result)).toBe(true);
    expect(transport.isConnected()).toBe(true);
  });

  test('disconnects transport', async () => {
    const transport = createNetworkTransport({
      localUrn: 'urn:test:client',
      url: 'ws://localhost:8080',
    });

    await transport.connect();
    const result = await transport.disconnect();

    expect(isOk(result)).toBe(true);

    // Wait for async close
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(transport.isConnected()).toBe(false);
  });

  test('sends message through websocket', async () => {
    const transport = createNetworkTransport({
      localUrn: 'urn:test:client',
      url: 'ws://localhost:8080',
    });

    await transport.connect();

    const envelope: MessageEnvelope = {
      from: 'urn:test:client',
      to: 'urn:test:server',
      message: { type: 'hello', data: 'world' },
    };

    const result = await transport.send(envelope);

    expect(isOk(result)).toBe(true);
  });

  test('receives message from websocket', async () => {
    const transport = createNetworkTransport({
      localUrn: 'urn:test:client',
      url: 'ws://localhost:8080',
    });

    await transport.connect();

    let received: MessageEnvelope | undefined;
    transport.onReceive((envelope) => {
      received = envelope;
    });

    const envelope: MessageEnvelope = {
      from: 'urn:test:server',
      to: 'urn:test:client',
      message: { type: 'response', data: 'hello' },
    };

    // Simulate server sending message
    await transport.send(envelope);

    // Wait for echo
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(received).toBeDefined();
    expect(received?.from).toBe('urn:test:server');
    expect(received?.message.type).toBe('response');
  });

  test('fails to send when not connected', async () => {
    const transport = createNetworkTransport({
      localUrn: 'urn:test:client',
      url: 'ws://localhost:8080',
    });

    const envelope: MessageEnvelope = {
      from: 'urn:test:client',
      to: 'urn:test:server',
      message: { type: 'hello' },
    };

    const result = await transport.send(envelope);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('NOT_CONNECTED');
    }
  });

  test('handles connection timeout', async () => {
    // Create a WebSocket that never opens
    class NeverOpenWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;

      readyState: number = NeverOpenWebSocket.CONNECTING;
      url: string;
      protocols?: string | string[];

      private errorListeners: ((event: Event) => void)[] = [];

      constructor(url: string, protocols?: string | string[]) {
        this.url = url;
        this.protocols = protocols;
        // Don't auto-open - just stay in CONNECTING state
      }

      send(data: string): void {
        throw new Error('WebSocket is not open');
      }

      close(): void {
        this.readyState = NeverOpenWebSocket.CLOSED;
      }

      addEventListener(type: string, listener: any): void {
        if (type === 'error') {
          this.errorListeners.push(listener);
        }
      }

      removeEventListener(type: string, listener: any): void {
        if (type === 'error') {
          const index = this.errorListeners.indexOf(listener);
          if (index >= 0) this.errorListeners.splice(index, 1);
        }
      }
    }

    (globalThis as any).WebSocket = NeverOpenWebSocket;

    const transport = createNetworkTransport({
      localUrn: 'urn:test:client',
      url: 'ws://localhost:8080',
      connectionTimeout: 100,
    });

    const result = await transport.connect();

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('CONNECTION_FAILED');
    }

    // Restore WebSocket
    (globalThis as any).WebSocket = MockWebSocket;
  });

  test('handles websocket errors', async () => {
    // Track WebSocket instance
    let wsInstance: MockWebSocket | undefined;
    class TrackingWebSocket extends MockWebSocket {
      constructor(url: string, protocols?: string | string[]) {
        super(url, protocols);
        wsInstance = this;
      }
    }

    (globalThis as any).WebSocket = TrackingWebSocket;

    const transport = createNetworkTransport({
      localUrn: 'urn:test:client',
      url: 'ws://localhost:8080',
    });

    await transport.connect();

    let errorReceived: unknown;
    transport.onError((error) => {
      errorReceived = error;
    });

    // Trigger error via WebSocket
    if (wsInstance) {
      wsInstance.simulateError(new Error('Connection error'));
    }

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(errorReceived).toBeDefined();

    // Restore WebSocket
    (globalThis as any).WebSocket = MockWebSocket;
  });

  test('handles connection close', async () => {
    const transport = createNetworkTransport({
      localUrn: 'urn:test:client',
      url: 'ws://localhost:8080',
    });

    await transport.connect();

    let errorReceived: unknown;
    transport.onError((error) => {
      errorReceived = error;
    });

    // Close connection
    await transport.disconnect();

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(errorReceived).toBeDefined();
  });

  test('ignores non-string messages', async () => {
    // Track WebSocket instance
    let wsInstance: MockWebSocket | undefined;
    class TrackingWebSocket extends MockWebSocket {
      constructor(url: string, protocols?: string | string[]) {
        super(url, protocols);
        wsInstance = this;
      }
    }

    (globalThis as any).WebSocket = TrackingWebSocket;

    const transport = createNetworkTransport({
      localUrn: 'urn:test:client',
      url: 'ws://localhost:8080',
    });

    await transport.connect();

    let received: MessageEnvelope | undefined;
    transport.onReceive((envelope) => {
      received = envelope;
    });

    // Simulate server sending non-string message
    if (wsInstance) {
      wsInstance.simulateMessage({ not: 'a string' });
    }

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(received).toBeUndefined();

    // Restore WebSocket
    (globalThis as any).WebSocket = MockWebSocket;
  });

  test('handles correlation ID and timestamp', async () => {
    const transport = createNetworkTransport({
      localUrn: 'urn:test:client',
      url: 'ws://localhost:8080',
    });

    await transport.connect();

    let received: MessageEnvelope | undefined;
    transport.onReceive((envelope) => {
      received = envelope;
    });

    const envelope: MessageEnvelope = {
      from: 'urn:test:client',
      to: 'urn:test:server',
      message: { type: 'hello' },
      correlationId: 'request-123',
      timestamp: Date.now(),
    };

    await transport.send(envelope);

    // Wait for echo
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(received?.correlationId).toBe('request-123');
    expect(received?.timestamp).toBeDefined();
  });

  test('can specify protocols', async () => {
    let capturedProtocols: string | string[] | undefined;

    class ProtocolCapturingWebSocket extends MockWebSocket {
      constructor(url: string, protocols?: string | string[]) {
        super(url, protocols);
        capturedProtocols = protocols;
      }
    }

    (globalThis as any).WebSocket = ProtocolCapturingWebSocket;

    const transport = createNetworkTransport({
      localUrn: 'urn:test:client',
      url: 'ws://localhost:8080',
      protocols: ['servicejs', 'v1'],
    });

    await transport.connect();

    expect(capturedProtocols).toEqual(['servicejs', 'v1']);
  });
});
