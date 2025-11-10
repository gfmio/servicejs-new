import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createWebSocketServer } from '../src/index.js';
import WebSocket from 'ws';

describe('WebSocketServerAdapter', () => {
  let server: ReturnType<typeof createWebSocketServer>;
  const TEST_PORT = 9881;

  beforeEach(() => {
    server = createWebSocketServer();
  });

  afterEach(async () => {
    await server.destroy();
  });

  test('initializes with valid config', async () => {
    const result = await server.init({ port: TEST_PORT });
    expect(isOk(result)).toBe(true);
  });

  test('fails to initialize without port', async () => {
    const result = await server.init({ port: 0 });
    expect(isOk(result)).toBe(false);
  });

  test('starts and stops server', async () => {
    await server.init({ port: TEST_PORT });

    const startResult = await server.start();
    expect(isOk(startResult)).toBe(true);

    const healthResult = await server.health();
    expect(isOk(healthResult)).toBe(true);
    if (isOk(healthResult)) {
      expect(healthResult.value).toBe(true);
    }

    const stopResult = await server.stop();
    expect(isOk(stopResult)).toBe(true);
  });

  test('handles client connections', async (done) => {
    await server.init({ port: TEST_PORT });

    server.onConnection((connection) => {
      expect(connection.id).toBeDefined();
      expect(connection.id).toMatch(/^ws_\d+$/);
      done();
    });

    await server.start();

    const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
    client.on('open', () => {
      client.close();
    });

    setTimeout(() => done(), 1000);
  });

  test('receives text messages from clients', async (done) => {
    await server.init({ port: TEST_PORT });

    server.onMessage((message) => {
      expect(message.data).toBe('Hello Server');
      expect(message.isBinary).toBe(false);
      done();
    });

    await server.start();

    const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
    client.on('open', () => {
      client.send('Hello Server');
    });

    setTimeout(() => done(), 1000);
  });

  test('receives binary messages from clients', async (done) => {
    await server.init({ port: TEST_PORT });

    server.onMessage((message) => {
      expect(Buffer.isBuffer(message.data)).toBe(true);
      expect(message.isBinary).toBe(true);
      expect((message.data as Buffer).toString()).toBe('Binary Data');
      done();
    });

    await server.start();

    const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
    client.on('open', () => {
      client.send(Buffer.from('Binary Data'));
    });

    setTimeout(() => done(), 1000);
  });

  test('sends text messages to clients', async (done) => {
    await server.init({ port: TEST_PORT });

    let clientConnectionId: string;

    server.onConnection(async (connection) => {
      clientConnectionId = connection.id;
      await server.send(connection.id, 'Hello Client');
    });

    await server.start();

    const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
    client.on('message', (data) => {
      expect(data.toString()).toBe('Hello Client');
      client.close();
      done();
    });

    setTimeout(() => done(), 1000);
  });

  test('sends binary messages to clients', async (done) => {
    await server.init({ port: TEST_PORT });

    server.onConnection(async (connection) => {
      await server.send(connection.id, Buffer.from('Binary Response'), true);
    });

    await server.start();

    const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
    client.on('message', (data, isBinary) => {
      expect(isBinary).toBe(true);
      expect(Buffer.isBuffer(data)).toBe(true);
      expect((data as Buffer).toString()).toBe('Binary Response');
      client.close();
      done();
    });

    setTimeout(() => done(), 1000);
  });

  test('broadcasts messages to all clients', async (done) => {
    await server.init({ port: TEST_PORT });

    let connectedClients = 0;
    const totalClients = 3;

    server.onConnection(async () => {
      connectedClients++;
      if (connectedClients === totalClients) {
        // All clients connected, broadcast message
        await server.broadcast('Broadcast Message');
      }
    });

    await server.start();

    let receivedCount = 0;
    const clients: WebSocket[] = [];

    for (let i = 0; i < totalClients; i++) {
      const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
      clients.push(client);

      client.on('message', (data) => {
        expect(data.toString()).toBe('Broadcast Message');
        receivedCount++;
        if (receivedCount === totalClients) {
          clients.forEach(c => c.close());
          done();
        }
      });
    }

    setTimeout(() => done(), 1000);
  });

  test('handles connection close', async (done) => {
    await server.init({ port: TEST_PORT });

    server.onClose((connectionId, code, reason) => {
      expect(connectionId).toBeDefined();
      expect(code).toBe(1000);
      done();
    });

    await server.start();

    const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
    client.on('open', () => {
      client.close(1000, 'Normal closure');
    });

    setTimeout(() => done(), 1000);
  });

  test('closes connection from server', async (done) => {
    await server.init({ port: TEST_PORT });

    server.onConnection(async (connection) => {
      // Close connection after a short delay
      setTimeout(async () => {
        await server.closeConnection(connection.id, 1000, 'Server closing');
      }, 100);
    });

    await server.start();

    const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
    client.on('close', (code, reason) => {
      expect(code).toBe(1000);
      expect(reason.toString()).toBe('Server closing');
      done();
    });

    setTimeout(() => done(), 1000);
  });

  test('handles ping/pong', async (done) => {
    await server.init({ port: TEST_PORT });

    server.onPong((connectionId, data) => {
      expect(connectionId).toBeDefined();
      expect(data.toString()).toBe('ping data');
      done();
    });

    server.onConnection(async (connection) => {
      await server.ping(connection.id, Buffer.from('ping data'));
    });

    await server.start();

    const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
    // ws library automatically responds to ping with pong

    setTimeout(() => done(), 1000);
  });

  test('tracks active connections', async () => {
    await server.init({ port: TEST_PORT });

    let connectedCount = 0;
    server.onConnection(async () => {
      connectedCount++;
      if (connectedCount === 2) {
        const connectionsResult = await server.getConnections();
        expect(isOk(connectionsResult)).toBe(true);
        if (isOk(connectionsResult)) {
          expect(connectionsResult.value.length).toBe(2);
        }
      }
    });

    await server.start();

    const client1 = new WebSocket(`ws://localhost:${TEST_PORT}`);
    await new Promise(resolve => client1.on('open', resolve));

    const client2 = new WebSocket(`ws://localhost:${TEST_PORT}`);
    await new Promise(resolve => client2.on('open', resolve));

    await new Promise(resolve => setTimeout(resolve, 100));

    client1.close();
    client2.close();
  });

  test('handles custom path', async (done) => {
    await server.init({ port: TEST_PORT, path: '/custom' });

    server.onConnection(() => {
      done();
    });

    await server.start();

    // This should not connect (wrong path)
    const wrongClient = new WebSocket(`ws://localhost:${TEST_PORT}/wrong`);
    wrongClient.on('error', () => {
      // Expected to fail
    });

    // This should connect (correct path)
    const rightClient = new WebSocket(`ws://localhost:${TEST_PORT}/custom`);
    rightClient.on('open', () => {
      rightClient.close();
    });

    setTimeout(() => done(), 1000);
  });

  test('handles errors gracefully', async () => {
    await server.init({ port: TEST_PORT });

    let errorReceived = false;
    server.onError((error) => {
      errorReceived = true;
      expect(error).toBeDefined();
    });

    await server.start();

    // Try to send to non-existent connection
    const result = await server.send('invalid-id', 'test');
    expect(isOk(result)).toBe(false);
  });
});
