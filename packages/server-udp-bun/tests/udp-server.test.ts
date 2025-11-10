import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createUDPServer, type UDPServerAdapter } from '../src/index';
import dgram from 'dgram';

const TEST_PORT = 41234;

describe('UDP Server (Bun)', () => {
  let server: UDPServerAdapter;

  beforeEach(() => {
    server = createUDPServer();
  });

  afterEach(async () => {
    await server.destroy();
    await new Promise((resolve) => setTimeout(resolve, 200)); // Allow port to be released
  });

  test('initializes with configuration', async () => {
    const result = await server.init({ port: TEST_PORT });
    expect(isOk(result)).toBe(true);
  });

  test('starts and stops successfully', async () => {
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

  test('receives messages from clients', (done) => {
    server.init({ port: TEST_PORT }).then(() => {
      server.onMessage((message) => {
        expect(message.data.toString()).toBe('Hello, Server!');
        expect(message.remote.port).toBeGreaterThan(0);
        expect(message.remote.address).toBeDefined();
        done();
      });

      server.start().then(() => {
        const client = dgram.createSocket('udp4');
        client.send('Hello, Server!', TEST_PORT, 'localhost', (error) => {
          if (error) console.error('Send error:', error);
          client.close();
        });
      });
    });
  });

  test('sends messages to clients', (done) => {
    const CLIENT_PORT = 41235;

    server.init({ port: TEST_PORT }).then(() => {
      server.onMessage((message) => {
        server.send('Hello, Client!', message.remote.port, message.remote.address);
      });

      server.start().then(() => {
        const client = dgram.createSocket('udp4');

        client.on('message', (msg) => {
          expect(msg.toString()).toBe('Hello, Client!');
          client.close();
          done();
        });

        client.bind(CLIENT_PORT, () => {
          client.send('ping', TEST_PORT, 'localhost');
        });
      });
    });
  });

  test('echoes messages back to sender', (done) => {
    const CLIENT_PORT = 41236;

    server.init({ port: TEST_PORT }).then(() => {
      server.onMessage((message) => {
        server.send(message.data, message.remote.port, message.remote.address);
      });

      server.start().then(() => {
        const client = dgram.createSocket('udp4');

        client.on('message', (msg) => {
          expect(msg.toString()).toBe('Echo test');
          client.close();
          done();
        });

        client.bind(CLIENT_PORT, () => {
          client.send('Echo test', TEST_PORT, 'localhost');
        });
      });
    });
  });

  test('handles multiple clients', (done) => {
    const totalClients = 3;
    let receivedCount = 0;

    server.init({ port: TEST_PORT }).then(() => {
      server.onMessage((message) => {
        receivedCount++;
        if (receivedCount === totalClients) {
          done();
        }
      });

      server.start().then(() => {
        for (let i = 0; i < totalClients; i++) {
          const client = dgram.createSocket('udp4');
          client.send(`Message ${i}`, TEST_PORT, 'localhost', () => {
            client.close();
          });
        }
      });
    });
  });

  test('handles binary data', (done) => {
    server.init({ port: TEST_PORT }).then(() => {
      server.onMessage((message) => {
        expect(message.data).toBeInstanceOf(Buffer);
        expect(message.data.length).toBe(4);
        expect(message.data[0]).toBe(1);
        expect(message.data[1]).toBe(2);
        expect(message.data[2]).toBe(3);
        expect(message.data[3]).toBe(4);
        done();
      });

      server.start().then(() => {
        const client = dgram.createSocket('udp4');
        const buffer = Buffer.from([1, 2, 3, 4]);
        client.send(buffer, TEST_PORT, 'localhost', () => {
          client.close();
        });
      });
    });
  });

  test('gets server address', async () => {
    await server.init({ port: TEST_PORT, hostname: '127.0.0.1' });
    await server.start();

    const result = await server.getAddress();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.port).toBe(TEST_PORT);
      expect(result.value.address).toBe('127.0.0.1');
      expect(result.value.family).toBe('IPv4');
    }
  });

  test('handles errors gracefully', (done) => {
    server.init({ port: TEST_PORT }).then(() => {
      let errorCaught = false;

      server.onError((error) => {
        errorCaught = true;
      });

      server.onMessage(() => {
        throw new Error('Test error');
      });

      server.start().then(() => {
        const client = dgram.createSocket('udp4');
        client.send('trigger error', TEST_PORT, 'localhost', () => {
          client.close();

          setTimeout(() => {
            expect(errorCaught).toBe(true);
            done();
          }, 100);
        });
      });
    });
  });

  test('calls listening handler when started', (done) => {
    server.init({ port: TEST_PORT }).then(() => {
      server.onListening(() => {
        done();
      });

      server.start();
    });
  });

  test('sendMany batches multiple messages', (done) => {
    const CLIENT_PORT_1 = 41237;
    const CLIENT_PORT_2 = 41238;
    let receivedCount = 0;

    server.init({ port: TEST_PORT }).then(() => {
      server.start().then(() => {
        const client1 = dgram.createSocket('udp4');
        const client2 = dgram.createSocket('udp4');

        const checkDone = () => {
          receivedCount++;
          if (receivedCount === 2) {
            client1.close();
            client2.close();
            done();
          }
        };

        client1.on('message', (msg) => {
          expect(msg.toString()).toBe('Message 1');
          checkDone();
        });

        client2.on('message', (msg) => {
          expect(msg.toString()).toBe('Message 2');
          checkDone();
        });

        client1.bind(CLIENT_PORT_1, () => {
          client2.bind(CLIENT_PORT_2, () => {
            server.sendMany([
              { data: 'Message 1', port: CLIENT_PORT_1, address: '127.0.0.1' },
              { data: 'Message 2', port: CLIENT_PORT_2, address: '127.0.0.1' },
            ]);
          });
        });
      });
    });
  });

  test('handles IPv6 configuration', async () => {
    await server.init({ port: TEST_PORT, type: 'udp6' });
    const startResult = await server.start();

    // IPv6 might not be available on all systems, so we just check it doesn't error
    expect(isOk(startResult)).toBe(true);

    const addressResult = await server.getAddress();
    expect(isOk(addressResult)).toBe(true);
    if (isOk(addressResult)) {
      // IPv6 may not be supported on all systems - Bun may fall back to IPv4
      expect(['IPv6', 'IPv4']).toContain(addressResult.value.family);
    }
  });
});
