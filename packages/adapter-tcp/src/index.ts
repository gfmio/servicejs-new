/**
 * TCP Client Adapter for ServiceJS
 * Low-level TCP connections with binary protocol support
 */

import { ok, err, type Result } from '@servicejs/result';

export interface TCPConfig {
  host: string;
  port: number;
  timeout?: number;
  keepAlive?: boolean;
  noDelay?: boolean;
}

export interface TCPConnection {
  host: string;
  port: number;
  connected: boolean;
  bytesRead: number;
  bytesWritten: number;
}

export interface TCPAdapter {
  init(config: TCPConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>;

  connect(): Promise<Result<TCPConnection, Error>>;
  disconnect(): Promise<Result<void, Error>>;
  send(data: Buffer | string): Promise<Result<number, Error>>;
  receive(size?: number): Promise<Result<Buffer, Error>>;
  isConnected(): boolean;
}

export const createTCPAdapter = (): TCPAdapter => {
  let config: TCPConfig | null = null;
  let connection: TCPConnection | null = null;

  // Mock TCP connection for demo
  // In production, use Node.js net module or Bun.connect()
  const mockSocket = {
    connected: false,
    bytesRead: 0,
    bytesWritten: 0,
    buffer: Buffer.alloc(0),
  };

  return {
    init: async (cfg) => {
      if (!cfg.host || !cfg.port) {
        return err(new Error('Host and port required'));
      }
      config = {
        timeout: 30000,
        keepAlive: true,
        noDelay: true,
        ...cfg,
      };
      return ok(undefined);
    },

    start: async () => ok(undefined),
    stop: async () => ok(undefined),
    destroy: async () => {
      if (mockSocket.connected) {
        mockSocket.connected = false;
        connection = null;
      }
      config = null;
      return ok(undefined);
    },

    health: async () => ok({ status: config ? 'healthy' as const : 'unhealthy' as const }),

    connect: async () => {
      if (!config) return err(new Error('TCP adapter not initialized'));

      try {
        // In production, use:
        // const socket = await Bun.connect({
        //   hostname: config.host,
        //   port: config.port,
        //   socket: {
        //     data(socket, data) { ... },
        //     open(socket) { ... },
        //     close(socket) { ... },
        //     error(socket, error) { ... },
        //   },
        // });

        mockSocket.connected = true;
        mockSocket.bytesRead = 0;
        mockSocket.bytesWritten = 0;

        connection = {
          host: config.host,
          port: config.port,
          connected: true,
          bytesRead: 0,
          bytesWritten: 0,
        };

        return ok(connection);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    disconnect: async () => {
      if (!mockSocket.connected) {
        return err(new Error('Not connected'));
      }

      mockSocket.connected = false;
      connection = null;

      return ok(undefined);
    },

    send: async (data) => {
      if (!mockSocket.connected) {
        return err(new Error('Not connected'));
      }

      try {
        const buffer = typeof data === 'string' ? Buffer.from(data) : data;
        const bytesWritten = buffer.byteLength;

        // In production, write to actual socket
        mockSocket.bytesWritten += bytesWritten;
        if (connection) {
          connection.bytesWritten += bytesWritten;
        }

        return ok(bytesWritten);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    receive: async (size) => {
      if (!mockSocket.connected) {
        return err(new Error('Not connected'));
      }

      try {
        // In production, read from actual socket
        const bufferSize = size || 1024;
        const buffer = Buffer.alloc(bufferSize);

        mockSocket.bytesRead += buffer.byteLength;
        if (connection) {
          connection.bytesRead += buffer.byteLength;
        }

        return ok(buffer);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    isConnected: () => {
      return mockSocket.connected;
    },
  };
};
