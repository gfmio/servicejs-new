/**
 * Node.js UDP Server Adapter for ServiceJS
 *
 * Provides UDP datagram server functionality with message handling
 */

import * as dgram from 'dgram';
import { Result, ok, err } from '@servicejs/result';

export interface UDPServerConfig {
  host?: string;
  port: number;
  type?: 'udp4' | 'udp6';
  reuseAddr?: boolean;
}

export interface UDPRemoteInfo {
  address: string;
  family: 'IPv4' | 'IPv6';
  port: number;
  size: number;
}

export interface UDPMessage {
  data: Buffer;
  remote: UDPRemoteInfo;
}

export type MessageHandler = (message: UDPMessage) => void | Promise<void>;
export type ErrorHandler = (error: Error) => void;
export type ListeningHandler = () => void;

export interface UDPServerAdapter {
  init(config: UDPServerConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<boolean, Error>>;

  onMessage(handler: MessageHandler): void;
  onError(handler: ErrorHandler): void;
  onListening(handler: ListeningHandler): void;

  send(data: Buffer | string, port: number, address: string): Promise<Result<void, Error>>;
  setBroadcast(enabled: boolean): Promise<Result<void, Error>>;
  setMulticastTTL(ttl: number): Promise<Result<void, Error>>;
  addMembership(multicastAddress: string, multicastInterface?: string): Promise<Result<void, Error>>;
  dropMembership(multicastAddress: string, multicastInterface?: string): Promise<Result<void, Error>>;
}

export function createUDPServer(): UDPServerAdapter {
  let config: UDPServerConfig | null = null;
  let socket: dgram.Socket | null = null;
  let isRunning = false;

  let messageHandler: MessageHandler | null = null;
  let errorHandler: ErrorHandler | null = null;
  let listeningHandler: ListeningHandler | null = null;

  return {
    async init(cfg: UDPServerConfig): Promise<Result<void, Error>> {
      if (!cfg.port) {
        return err(new Error('Port is required'));
      }
      config = cfg;
      return ok(undefined);
    },

    async start(): Promise<Result<void, Error>> {
      if (!config) {
        return err(new Error('Server not initialized'));
      }
      if (socket) {
        return err(new Error('Server already started'));
      }

      return new Promise((resolve) => {
        const type = config!.type || 'udp4';
        socket = dgram.createSocket({
          type,
          reuseAddr: config!.reuseAddr || false,
        });

        socket!.on('message', (msg, rinfo) => {
          if (messageHandler) {
            const udpMessage: UDPMessage = {
              data: msg,
              remote: {
                address: rinfo.address,
                family: rinfo.family as 'IPv4' | 'IPv6',
                port: rinfo.port,
                size: rinfo.size,
              },
            };

            Promise.resolve(messageHandler(udpMessage)).catch((error) => {
              if (errorHandler) errorHandler(error);
            });
          }
        });

        socket!.on('error', (error) => {
          if (errorHandler) errorHandler(error);
          if (!isRunning) {
            resolve(err(error));
          }
        });

        socket!.on('listening', () => {
          isRunning = true;
          if (listeningHandler) listeningHandler();
          resolve(ok(undefined));
        });

        socket!.bind({
          port: config!.port,
          address: config!.host || '0.0.0.0',
        });
      });
    },

    async stop(): Promise<Result<void, Error>> {
      if (!socket) {
        return ok(undefined);
      }

      return new Promise((resolve) => {
        socket!.close(() => {
          isRunning = false;
          socket = null;
          resolve(ok(undefined));
        });
      });
    },

    async destroy(): Promise<Result<void, Error>> {
      const result = await this.stop();
      config = null;
      messageHandler = null;
      errorHandler = null;
      listeningHandler = null;
      return result;
    },

    async health(): Promise<Result<boolean, Error>> {
      return ok(isRunning && socket !== null);
    },

    onMessage(handler: MessageHandler): void {
      messageHandler = handler;
    },

    onError(handler: ErrorHandler): void {
      errorHandler = handler;
    },

    onListening(handler: ListeningHandler): void {
      listeningHandler = handler;
    },

    async send(data: Buffer | string, port: number, address: string): Promise<Result<void, Error>> {
      if (!socket) {
        return err(new Error('Server not started'));
      }

      return new Promise((resolve) => {
        const buffer = typeof data === 'string' ? Buffer.from(data) : data;

        socket!.send(buffer, port, address, (error) => {
          if (error) {
            resolve(err(error));
          } else {
            resolve(ok(undefined));
          }
        });
      });
    },

    async setBroadcast(enabled: boolean): Promise<Result<void, Error>> {
      if (!socket) {
        return err(new Error('Server not started'));
      }

      try {
        socket.setBroadcast(enabled);
        return ok(undefined);
      } catch (error) {
        return err(error as Error);
      }
    },

    async setMulticastTTL(ttl: number): Promise<Result<void, Error>> {
      if (!socket) {
        return err(new Error('Server not started'));
      }

      try {
        socket.setMulticastTTL(ttl);
        return ok(undefined);
      } catch (error) {
        return err(error as Error);
      }
    },

    async addMembership(multicastAddress: string, multicastInterface?: string): Promise<Result<void, Error>> {
      if (!socket) {
        return err(new Error('Server not started'));
      }

      try {
        socket.addMembership(multicastAddress, multicastInterface);
        return ok(undefined);
      } catch (error) {
        return err(error as Error);
      }
    },

    async dropMembership(multicastAddress: string, multicastInterface?: string): Promise<Result<void, Error>> {
      if (!socket) {
        return err(new Error('Server not started'));
      }

      try {
        socket.dropMembership(multicastAddress, multicastInterface);
        return ok(undefined);
      } catch (error) {
        return err(error as Error);
      }
    },
  };
}
