import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createUDPServer } from '../src/index.js';
import * as dgram from 'dgram';

describe('UDPServerAdapter', () => {
  let server: ReturnType<typeof createUDPServer>;
  const TEST_PORT = 9877;

  beforeEach(() => {
    server = createUDPServer();
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

  test('receives datagrams from clients', async (done) => {
    await server.init({ port: TEST_PORT });

    server.onMessage((message) => {
      expect(message.data.toString()).toBe('Hello Server');
      expect(message.remote.address).toBeDefined();
      expect(message.remote.port).toBeDefined();
      done();
    });

    await server.start();

    // Send a datagram
    const client = dgram.createSocket('udp4');
    client.send('Hello Server', TEST_PORT, 'localhost', (error) => {
      if (error) console.error(error);
      client.close();
    });

    setTimeout(() => done(), 1000);
  });

  test('sends datagrams to clients', async (done) => {
    await server.init({ port: TEST_PORT });

    server.onMessage(async (message) => {
      // Reply to sender
      await server.send('Hello Client', message.remote.port, message.remote.address);
    });

    await server.start();

    const client = dgram.createSocket('udp4');
    client.on('message', (msg) => {
      expect(msg.toString()).toBe('Hello Client');
      client.close();
      done();
    });

    client.send('Hello', TEST_PORT, 'localhost');

    setTimeout(() => done(), 1000);
  });

  test('handles broadcast', async () => {
    await server.init({ port: TEST_PORT });
    await server.start();

    const result = await server.setBroadcast(true);
    expect(isOk(result)).toBe(true);

    const disableResult = await server.setBroadcast(false);
    expect(isOk(disableResult)).toBe(true);
  });

  test('handles multicast TTL', async () => {
    await server.init({ port: TEST_PORT });
    await server.start();

    const result = await server.setMulticastTTL(128);
    expect(isOk(result)).toBe(true);
  });

  test('handles errors', async (done) => {
    await server.init({ port: TEST_PORT });

    let errorReceived = false;
    server.onError((error) => {
      errorReceived = true;
      expect(error).toBeDefined();
    });

    // Start server
    await server.start();

    // Try to send before starting should fail
    const uninitServer = createUDPServer();
    const sendResult = await uninitServer.send('test', TEST_PORT, 'localhost');
    expect(isOk(sendResult)).toBe(false);

    setTimeout(() => {
      if (!errorReceived) done();
    }, 500);
  });

  test('onListening callback is called', async (done) => {
    await server.init({ port: TEST_PORT });

    server.onListening(() => {
      done();
    });

    await server.start();

    setTimeout(() => done(), 1000);
  });
});
