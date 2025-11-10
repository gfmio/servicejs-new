import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createTCPServer, type TCPServerAdapter } from '../src/index';
import { connect, Socket } from 'net';

const TEST_PORT = 9001;

describe('TCP Server (Bun)', () => {
  let server: TCPServerAdapter;

  beforeEach(() => {
    server = createTCPServer();
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

  test('handles incoming connections', (done) => {
    let client: Socket;

    server.init({ port: TEST_PORT }).then(() => {
      server.onConnection((connection) => {
        expect(connection.id).toContain('conn-');
        expect(connection.remoteAddress).toBeDefined();
        client.end();
        done();
      });

      server.start().then(() => {
        client = connect(TEST_PORT, 'localhost');
      });
    });
  });

  test('receives data from clients', (done) => {
    let client: Socket;

    server.init({ port: TEST_PORT }).then(() => {
      server.onData((connectionId, data) => {
        expect(connectionId).toContain('conn-');
        expect(data.toString()).toBe('Hello, Server!');
        client.end();
        done();
      });

      server.start().then(() => {
        client = connect(TEST_PORT, 'localhost', () => {
          client.write('Hello, Server!');
        });
      });
    });
  });

  test('sends data to clients', (done) => {
    let connectionId: string;

    server.init({ port: TEST_PORT}).then(() => {
      server.onConnection((connection) => {
        connectionId = connection.id;
        server.send(connectionId, 'Hello, Client!');
      });

      server.start().then(() => {
        const client = connect(TEST_PORT, 'localhost');

        client.on('data', (data) => {
          expect(data.toString()).toBe('Hello, Client!');
          client.end();
          done();
        });
      });
    });
  });

  test('broadcasts to multiple clients', (done) => {
    const totalClients = 3;
    let connectedClients = 0;
    let receivedCount = 0;
    const clients: Socket[] = [];

    server.init({ port: TEST_PORT }).then(() => {
      server.onConnection(() => {
        connectedClients++;
        if (connectedClients === totalClients) {
          server.broadcast('Broadcast Message');
        }
      });

      server.start().then(() => {
        for (let i = 0; i < totalClients; i++) {
          const client = connect(TEST_PORT, 'localhost');
          clients.push(client);

          client.on('data', (data) => {
            expect(data.toString()).toBe('Broadcast Message');
            receivedCount++;

            if (receivedCount === totalClients) {
              clients.forEach((c) => c.end());
              done();
            }
          });
        }
      });
    });
  });

  test('handles connection close', (done) => {
    server.init({ port: TEST_PORT }).then(() => {
      server.onClose((connectionId) => {
        expect(connectionId).toContain('conn-');
        done();
      });

      server.start().then(() => {
        const client = connect(TEST_PORT, 'localhost', () => {
          client.end();
        });
      });
    });
  });

  test('lists active connections', async () => {
    await server.init({ port: TEST_PORT });
    await server.start();

    const client1 = connect(TEST_PORT, 'localhost');
    const client2 = connect(TEST_PORT, 'localhost');

    // Wait for connections to be established
    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = await server.getConnections();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.length).toBeGreaterThanOrEqual(2);
    }

    client1.end();
    client2.end();
  });

  test('closes specific connection', (done) => {
    let connectionId: string;

    server.init({ port: TEST_PORT }).then(() => {
      server.onConnection((connection) => {
        connectionId = connection.id;
        server.closeConnection(connectionId);
      });

      server.onClose((id) => {
        expect(id).toBe(connectionId);
        done();
      });

      server.start().then(() => {
        const client = connect(TEST_PORT, 'localhost');
      });
    });
  });
});
