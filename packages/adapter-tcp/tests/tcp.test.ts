import { describe, test, expect } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createTCPAdapter } from '../src/index.js';

describe('TCPAdapter', () => {
  test('initializes with config', async () => {
    const adapter = createTCPAdapter();
    const result = await adapter.init({
      host: 'localhost',
      port: 8080,
      timeout: 5000,
    });

    expect(isOk(result)).toBe(true);
  });

  test('connects and disconnects', async () => {
    const adapter = createTCPAdapter();
    await adapter.init({ host: 'localhost', port: 8080 });

    const connectResult = await adapter.connect();
    expect(isOk(connectResult)).toBe(true);
    expect(adapter.isConnected()).toBe(true);

    if (isOk(connectResult)) {
      expect(connectResult.value.host).toBe('localhost');
      expect(connectResult.value.port).toBe(8080);
    }

    const disconnectResult = await adapter.disconnect();
    expect(isOk(disconnectResult)).toBe(true);
    expect(adapter.isConnected()).toBe(false);
  });

  test('sends and receives data', async () => {
    const adapter = createTCPAdapter();
    await adapter.init({ host: 'localhost', port: 8080 });
    await adapter.connect();

    const sendResult = await adapter.send('Hello, TCP!');
    expect(isOk(sendResult)).toBe(true);
    if (isOk(sendResult)) {
      expect(sendResult.value).toBeGreaterThan(0);
    }

    const receiveResult = await adapter.receive(1024);
    expect(isOk(receiveResult)).toBe(true);
    if (isOk(receiveResult)) {
      expect(receiveResult.value).toBeInstanceOf(Buffer);
    }
  });

  test('sends Buffer data', async () => {
    const adapter = createTCPAdapter();
    await adapter.init({ host: 'localhost', port: 8080 });
    await adapter.connect();

    const buffer = Buffer.from('Binary data');
    const sendResult = await adapter.send(buffer);
    expect(isOk(sendResult)).toBe(true);
    if (isOk(sendResult)) {
      expect(sendResult.value).toBe(buffer.byteLength);
    }
  });
});
