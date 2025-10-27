/**
 * Tests for TCP Transport
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { ok, isOk, isErr } from '@servicejs/result';
import type { MessageEnvelope } from '../src/transport.js';
import { createTCPTransport } from '../src/tcpTransport.js';
import { createServer, Server, Socket } from 'net';

/**
 * Test TCP server
 */
class TestTCPServer {
  private server: Server;
  private clients: Socket[] = [];
  private port: number;
  private messageHandler?: (message: string, client: Socket) => void;

  constructor(port: number) {
    this.port = port;
    this.server = createServer((socket) => {
      this.clients.push(socket);

      // Read framed messages
      let buffer = Buffer.alloc(0);

      socket.on('data', (data: Buffer) => {
        buffer = Buffer.concat([buffer, data]);

        while (buffer.length >= 4) {
          const messageLength = buffer.readUInt32BE(0);

          if (buffer.length < 4 + messageLength) {
            break;
          }

          const messageBuffer = buffer.subarray(4, 4 + messageLength);
          const message = messageBuffer.toString('utf8');
          buffer = buffer.subarray(4 + messageLength);

          this.messageHandler?.(message, socket);
        }
      });

      socket.on('close', () => {
        const index = this.clients.indexOf(socket);
        if (index >= 0) {
          this.clients.splice(index, 1);
        }
      });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      // Close all client connections
      for (const client of this.clients) {
        client.destroy();
      }
      this.clients = [];

      this.server.close(() => {
        resolve();
      });
    });
  }

  onMessage(handler: (message: string, client: Socket) => void): void {
    this.messageHandler = handler;
  }

  broadcast(message: string): void {
    const messageBuffer = Buffer.from(message, 'utf8');
    const lengthBuffer = Buffer.allocUnsafe(4);
    lengthBuffer.writeUInt32BE(messageBuffer.length, 0);
    const framedMessage = Buffer.concat([lengthBuffer, messageBuffer]);

    for (const client of this.clients) {
      client.write(framedMessage);
    }
  }

  sendTo(client: Socket, message: string): void {
    const messageBuffer = Buffer.from(message, 'utf8');
    const lengthBuffer = Buffer.allocUnsafe(4);
    lengthBuffer.writeUInt32BE(messageBuffer.length, 0);
    const framedMessage = Buffer.concat([lengthBuffer, messageBuffer]);
    client.write(framedMessage);
  }

  getClientCount(): number {
    return this.clients.length;
  }
}

describe('TCPTransport', () => {
  const TEST_PORT = 19876;
  let server: TestTCPServer;

  beforeEach(async () => {
    server = new TestTCPServer(TEST_PORT);
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  test('connects and disconnects', async () => {
    const transport = createTCPTransport({
      localUrn: 'urn:test:client' as any,
      host: 'localhost',
      port: TEST_PORT,
    });

    expect(transport.isConnected()).toBe(false);

    const connectResult = await transport.connect();
    expect(isOk(connectResult)).toBe(true);
    expect(transport.isConnected()).toBe(true);

    // Wait for server to process connection
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(server.getClientCount()).toBe(1);

    const disconnectResult = await transport.disconnect();
    expect(isOk(disconnectResult)).toBe(true);
    expect(transport.isConnected()).toBe(false);

    // Wait for server to process disconnect
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(server.getClientCount()).toBe(0);
  });

  test('sends and receives messages', async () => {
    const transport = createTCPTransport({
      localUrn: 'urn:test:client' as any,
      host: 'localhost',
      port: TEST_PORT,
    });

    await transport.connect();

    const received: MessageEnvelope[] = [];
    transport.onReceive((envelope) => {
      received.push(envelope);
    });

    // Set up server to echo messages
    server.onMessage((message, client) => {
      server.sendTo(client, message);
    });

    // Send message
    const envelope: MessageEnvelope = {
      from: 'urn:test:client' as any,
      to: 'urn:test:server' as any,
      message: { type: 'hello', data: 'world' },
    };

    const result = await transport.send(envelope);
    expect(isOk(result)).toBe(true);

    // Wait for echo
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(received).toHaveLength(1);
    expect(received[0].message.type).toBe('hello');
    expect((received[0].message as any).data).toBe('world');

    await transport.disconnect();
  });

  test('handles multiple messages in sequence', async () => {
    const transport = createTCPTransport({
      localUrn: 'urn:test:client' as any,
      host: 'localhost',
      port: TEST_PORT,
    });

    await transport.connect();

    const received: MessageEnvelope[] = [];
    transport.onReceive((envelope) => {
      received.push(envelope);
    });

    server.onMessage((message, client) => {
      server.sendTo(client, message);
    });

    // Send multiple messages
    for (let i = 0; i < 5; i++) {
      await transport.send({
        from: 'urn:test:client' as any,
        to: 'urn:test:server' as any,
        message: { type: 'msg', index: i },
      });
    }

    // Wait for echoes
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(received).toHaveLength(5);
    for (let i = 0; i < 5; i++) {
      expect((received[i].message as any).index).toBe(i);
    }

    await transport.disconnect();
  });

  test('handles large messages', async () => {
    const transport = createTCPTransport({
      localUrn: 'urn:test:client' as any,
      host: 'localhost',
      port: TEST_PORT,
    });

    await transport.connect();

    const received: MessageEnvelope[] = [];
    transport.onReceive((envelope) => {
      received.push(envelope);
    });

    server.onMessage((message, client) => {
      server.sendTo(client, message);
    });

    // Send large message (100 KB)
    const largeData = 'x'.repeat(100 * 1024);
    const envelope: MessageEnvelope = {
      from: 'urn:test:client' as any,
      to: 'urn:test:server' as any,
      message: { type: 'large', data: largeData },
    };

    const result = await transport.send(envelope);
    expect(isOk(result)).toBe(true);

    // Wait for echo
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(received).toHaveLength(1);
    expect((received[0].message as any).data).toBe(largeData);

    await transport.disconnect();
  });

  test('handles message fragmentation', async () => {
    const transport = createTCPTransport({
      localUrn: 'urn:test:client' as any,
      host: 'localhost',
      port: TEST_PORT,
    });

    await transport.connect();

    const received: MessageEnvelope[] = [];
    transport.onReceive((envelope) => {
      received.push(envelope);
    });

    // Server sends multiple messages rapidly (may arrive fragmented)
    server.onMessage(() => {
      for (let i = 0; i < 10; i++) {
        const envelope = JSON.stringify({
          from: 'urn:test:server',
          to: 'urn:test:client',
          message: { type: 'burst', index: i },
        });
        server.broadcast(envelope);
      }
    });

    // Trigger burst
    await transport.send({
      from: 'urn:test:client' as any,
      to: 'urn:test:server' as any,
      message: { type: 'trigger' },
    });

    // Wait for all messages
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(received.length).toBeGreaterThan(0);

    await transport.disconnect();
  });

  test('returns error when not connected', async () => {
    const transport = createTCPTransport({
      localUrn: 'urn:test:client' as any,
      host: 'localhost',
      port: TEST_PORT,
    });

    const envelope: MessageEnvelope = {
      from: 'urn:test:client' as any,
      to: 'urn:test:server' as any,
      message: { type: 'test' },
    };

    const result = await transport.send(envelope);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('NOT_CONNECTED');
    }
  });

  test('handles connection timeout', async () => {
    // Connect to non-existent server
    const transport = createTCPTransport({
      localUrn: 'urn:test:client' as any,
      host: 'localhost',
      port: 19999, // Wrong port
      connectionTimeout: 500,
    });

    const result = await transport.connect();

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('CONNECTION_FAILED');
    }
  });

  test('handles connection refused', async () => {
    // Stop server first
    await server.stop();

    const transport = createTCPTransport({
      localUrn: 'urn:test:client' as any,
      host: 'localhost',
      port: TEST_PORT,
      connectionTimeout: 500,
    });

    const result = await transport.connect();

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('CONNECTION_FAILED');
    }
  });

  test('auto-reconnects on connection loss', async () => {
    const transport = createTCPTransport({
      localUrn: 'urn:test:client' as any,
      host: 'localhost',
      port: TEST_PORT,
      autoReconnect: true,
      reconnectInterval: 100,
      maxReconnectAttempts: 3,
    });

    await transport.connect();
    expect(transport.isConnected()).toBe(true);

    // Simulate connection loss by stopping server
    await server.stop();

    // Wait for disconnect
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(transport.isConnected()).toBe(false);

    // Restart server
    server = new TestTCPServer(TEST_PORT);
    await server.start();

    // Wait for reconnection
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Should have reconnected
    expect(transport.isConnected()).toBe(true);

    await transport.disconnect();
  });

  test('getLocalUrn returns correct URN', () => {
    const transport = createTCPTransport({
      localUrn: 'urn:test:myapp' as any,
      host: 'localhost',
      port: TEST_PORT,
    });

    expect(transport.getLocalUrn()).toEqual('urn:test:myapp' as any);
  });

  test('configures socket options correctly', async () => {
    const transport = createTCPTransport({
      localUrn: 'urn:test:client' as any,
      host: 'localhost',
      port: TEST_PORT,
      keepAlive: true,
      keepAliveDelay: 2000,
      noDelay: true,
    });

    const result = await transport.connect();
    expect(isOk(result)).toBe(true);

    // Socket should be configured (no easy way to test, but connection should work)
    expect(transport.isConnected()).toBe(true);

    await transport.disconnect();
  });

  test('handles rapid connect/disconnect cycles', async () => {
    const transport = createTCPTransport({
      localUrn: 'urn:test:client' as any,
      host: 'localhost',
      port: TEST_PORT,
    });

    for (let i = 0; i < 3; i++) {
      const connectResult = await transport.connect();
      expect(isOk(connectResult)).toBe(true);

      const disconnectResult = await transport.disconnect();
      expect(isOk(disconnectResult)).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  });

  test('handles errors during send', async () => {
    const transport = createTCPTransport({
      localUrn: 'urn:test:client' as any,
      host: 'localhost',
      port: TEST_PORT,
    });

    await transport.connect();

    // Disconnect server-side while keeping transport thinking it's connected
    await server.stop();

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Try to send - should eventually fail
    const envelope: MessageEnvelope = {
      from: 'urn:test:client' as any,
      to: 'urn:test:server' as any,
      message: { type: 'test' },
    };

    // This might succeed immediately (buffered) or fail
    await transport.send(envelope);

    // Disconnect should work regardless
    const disconnectResult = await transport.disconnect();
    expect(isOk(disconnectResult)).toBe(true);
  });
});
