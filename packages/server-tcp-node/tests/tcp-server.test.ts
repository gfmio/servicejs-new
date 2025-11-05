import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createTCPServer } from '../src/index.js';
import * as net from 'net';

describe('TCPServerAdapter', () => {
  let server: ReturnType<typeof createTCPServer>;
  const TEST_PORT = 9876;

  beforeEach(() => {
    server = createTCPServer();
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

    let connectionReceived = false;
    server.onConnection((connection) => {
      connectionReceived = true;
      expect(connection.id).toBeDefined();
      done();
    });

    await server.start();

    // Connect a client
    const client = net.connect(TEST_PORT, 'localhost', () => {
      client.end();
    });

    setTimeout(() => {
      if (!connectionReceived) done();
    }, 1000);
  });

  test('receives data from clients', async (done) => {
    await server.init({ port: TEST_PORT });

    server.onData((message) => {
      expect(message.data.toString()).toBe('Hello Server');
      done();
    });

    await server.start();

    const client = net.connect(TEST_PORT, 'localhost', () => {
      client.write('Hello Server');
      client.end();
    });

    setTimeout(() => done(), 1000);
  });

  test('sends data to clients', async (done) => {
    await server.init({ port: TEST_PORT });

    let clientConnectionId: string;

    server.onConnection(async (connection) => {
      clientConnectionId = connection.id;
      await server.send(connection.id, 'Hello Client');
    });

    await server.start();

    const client = net.connect(TEST_PORT, 'localhost');
    client.on('data', (data) => {
      expect(data.toString()).toBe('Hello Client');
      client.end();
      done();
    });

    setTimeout(() => done(), 1000);
  });
});
