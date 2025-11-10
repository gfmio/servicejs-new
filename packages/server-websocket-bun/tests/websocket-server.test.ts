import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createWebSocketServer, type WebSocketServerAdapter } from '../src/index';

const TEST_PORT = 9003;

describe('WebSocket Server (Bun)', () => {
  let server: WebSocketServerAdapter;

  beforeEach(() => {
    server = createWebSocketServer();
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

  test('handles WebSocket connections', (done) => {
    let ws: WebSocket;

    server.init({ port: TEST_PORT }).then(() => {
      server.onConnection((connection) => {
        expect(connection.id).toContain('conn-');
        expect(connection.remoteAddress).toBeDefined();
        ws.close();
        done();
      });

      server.start().then(() => {
        ws = new WebSocket(`ws://localhost:${TEST_PORT}/`);
      });
    });
  });

  test('receives text messages', (done) => {
    let ws: WebSocket;

    server.init({ port: TEST_PORT }).then(() => {
      server.onMessage((connectionId, data, isBinary) => {
        expect(connectionId).toContain('conn-');
        expect(data.toString()).toBe('Hello, Server!');
        expect(isBinary).toBe(false);
        ws.close();
        done();
      });

      server.start().then(() => {
        ws = new WebSocket(`ws://localhost:${TEST_PORT}/`);
        ws.onopen = () => {
          ws.send('Hello, Server!');
        };
      });
    });
  });

  test('sends text messages to clients', (done) => {
    let connectionId: string;

    server.init({ port: TEST_PORT }).then(() => {
      server.onConnection((connection) => {
        connectionId = connection.id;
        server.send(connectionId, 'Hello, Client!');
      });

      server.start().then(() => {
        const ws = new WebSocket(`ws://localhost:${TEST_PORT}/`);
        ws.onmessage = (event) => {
          expect(event.data).toBe('Hello, Client!');
          ws.close();
          done();
        };
      });
    });
  });

  test('broadcasts messages to multiple clients', (done) => {
    const totalClients = 3;
    let connectedClients = 0;
    let receivedCount = 0;
    const clients: WebSocket[] = [];

    server.init({ port: TEST_PORT }).then(() => {
      server.onConnection(() => {
        connectedClients++;
        if (connectedClients === totalClients) {
          server.broadcast('Broadcast Message');
        }
      });

      server.start().then(() => {
        for (let i = 0; i < totalClients; i++) {
          const ws = new WebSocket(`ws://localhost:${TEST_PORT}/`);
          clients.push(ws);

          ws.onmessage = (event) => {
            expect(event.data).toBe('Broadcast Message');
            receivedCount++;

            if (receivedCount === totalClients) {
              clients.forEach((c) => c.close());
              done();
            }
          };
        }
      });
    });
  });

  test('handles binary messages', (done) => {
    let ws: WebSocket;

    server.init({ port: TEST_PORT }).then(() => {
      server.onMessage((connectionId, data, isBinary) => {
        expect(isBinary).toBe(true);
        expect(data).toBeInstanceOf(Buffer);
        expect((data as Buffer).length).toBe(4);
        ws.close();
        done();
      });

      server.start().then(() => {
        ws = new WebSocket(`ws://localhost:${TEST_PORT}/`);
        ws.onopen = () => {
          const buffer = new Uint8Array([1, 2, 3, 4]);
          ws.send(buffer);
        };
      });
    });
  });

  test('handles connection close', (done) => {
    server.init({ port: TEST_PORT }).then(() => {
      server.onClose((connectionId, code, reason) => {
        expect(connectionId).toContain('conn-');
        expect(code).toBeDefined();
        done();
      });

      server.start().then(() => {
        const ws = new WebSocket(`ws://localhost:${TEST_PORT}/`);
        ws.onopen = () => {
          ws.close();
        };
      });
    });
  });

  test('closes specific connection', (done) => {
    let connectionId: string;

    server.init({ port: TEST_PORT }).then(() => {
      server.onConnection((connection) => {
        connectionId = connection.id;
        server.closeConnection(connectionId, 1000, 'Test close');
      });

      server.start().then(() => {
        const ws = new WebSocket(`ws://localhost:${TEST_PORT}/`);
        ws.onclose = (event) => {
          expect(event.code).toBe(1000);
          done();
        };
      });
    });
  });

  test('handles custom path', (done) => {
    let ws: WebSocket;

    server.init({ port: TEST_PORT, path: '/ws' }).then(() => {
      server.onConnection(() => {
        ws.close();
        done();
      });

      server.start().then(() => {
        ws = new WebSocket(`ws://localhost:${TEST_PORT}/ws`);
      });
    });
  });

  test('lists active connections', async () => {
    await server.init({ port: TEST_PORT });
    await server.start();

    const ws1 = new WebSocket(`ws://localhost:${TEST_PORT}/`);
    const ws2 = new WebSocket(`ws://localhost:${TEST_PORT}/`);

    // Wait for connections
    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = await server.getConnections();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.length).toBeGreaterThanOrEqual(2);
    }

    ws1.close();
    ws2.close();
  });

  test('handles ping/pong', (done) => {
    let connectionId: string;
    let ws: WebSocket;

    server.init({ port: TEST_PORT }).then(() => {
      server.onConnection((connection) => {
        connectionId = connection.id;
        server.ping(connectionId);
      });

      server.onPong((id) => {
        expect(id).toBe(connectionId);
        ws.close();
        done();
      });

      server.start().then(() => {
        ws = new WebSocket(`ws://localhost:${TEST_PORT}/`);
      });
    });
  });
});
